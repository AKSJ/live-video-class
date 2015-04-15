// NB - Currently (sometimes) getting a dev console error 'cannnot read property 'videoWidth of null' on unpublish
// This may be a bug, code seems okay as far as I can tell. See: http://webcache.googleusercontent.com/search?q=cache:EEXBFdO8mQsJ:https://forums.tokbox.com/bugs/cannot-read-property-videowidth-of-null-error-t45250+&cd=1&hl=en&ct=clnk&gl=uk

// Initialize an OpenTok Session object
var session = TB.initSession(/*apiKey,*/sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );

// Initialize a Publisher, and place it into the element with id="publisher"
var publisher = TB.initPublisher( apiKey, 'publisher', {"name": username, width: 400, height: 300, style: {nameDisplayMode: "on"}});

var streamCount = 0;
var activeStreams = [];
var activeStreamIds = [];
var inactiveStreams = [];
var inactiveStreamIds = [];
var subscribers = {};

// Attach event handlers
session.on({

	// This function runs when session.connect() asynchronously completes
	sessionConnected: function(event) {
		// Publish the publisher (this will trigger 'streamCreated' on other
		// clients)
		console.log(event);
		console.log('Session Connection data:');
		console.log(session.connection);
		console.log('Publisher properties:');
		console.log(publisher);

		session.publish(publisher);
	},

	// This function runs when another client publishes a stream (eg. session.publish())
	streamCreated: function(event) {
		// Create a container for a new Subscriber, assign it an id using the streamId, put it inside the element with id="subscriber"+count.
		// If 5 streams active, put stream and streamIds in inactive arrays
		console.log(event);
		var stream = event.stream;
		var streamId = event.stream.streamId;
		// var subContainer = document.createElement('div');
		if (streamCount < 5) {
			streamCount++;
			activeStreams.push(stream);
			activeStreamIds.push(streamId);
			subContainerId = 'stream-' + streamId;
			$('<div/>').attr('id',subContainerId).appendTo('#subscriber' + streamCount);
			// Subscribe to the stream that caused this event, put it inside the container we just made
			subscribers[streamId] = session.subscribe(event.stream, subContainerId, {width: 400, height: 300});
		}
		else {
			inactiveStreams.push(stream);
			inactiveStreamIds.push(streamId);
		}
	},

	streamDestroyed: function(event) {
		// Check if stream registered as active/inactive, and remove from releveant indexes
		// Check for subscriber object and remove
		// Not currently unsubscribing, as default behaviour should handle that.
		var destroyedStreamId = event.stream.streamId;
		var activeStreamIndex = activeStreamIds.indexOf(destroyedStreamId);
		var inactiveStreamIndex = inactiveStreamIds.indexOf(destroyedStreamId);

		if (activeStreamIndex !== -1) {
			console.log('activeStreamIds:');
			console.log(activeStreamIds);
			console.log('destroyedStreamId: '+destroyedStreamId, 'activeStreamIndex: '+activeStreamIndex);
			$('#stream-'+destroyedStreamId).remove();
			streamCount--;
			activeStreamIds.splice(activeStreamIndex,1);
			activeStreams.forEach(function(stream, index){
				if (stream.streamId === destroyedStreamId) {
					activeStreams.splice(index,1);
				}
			});
			console.log('Stream count should === activeStreams.length ',streamCount, activeStreams.length);
		}
		if (inactiveStreamIndex !== -1) {
			inactiveStreamIds.splice(inactiveStreamIndex,1);
			inactiveStreams.forEach(function(stream, index){
				if (stream.streamId === destroyedStreamId) {
					activeStreams.splice(index,1);
				}
			});
		}
		if (subscribers[destroyedStreamId]) {
			delete subscribers[destroyedStreamId];
			console.log('subscribers (should same num props as stream count), streamCount: ', streamCount, 'Subecribers: ');
			console.log(subscribers);
		}
	}
});

// if < 5 active streams, check for inactive streams and subscribe
setInterval(function(){
	if (streamCount < 5 && inactiveStreams.length > 0) {
		var newStream = inactiveStreams.pop();
		var newStreamId = newStream.streamId;
		inactiveStreamIds.forEach(function(streamId, index){
			if (streamId === newStreamId) {
				inactiveStreamIds.splice(index,1);
			}
		});
		streamCount++;
		activeStreams.push(newStream);
		activeStreamIds.push(newStreamId);
		subContainerId = 'stream-' + newStreamId;
		$('<div/>').attr('id',subContainerId).appendTo('#subscriber' + streamCount);
		subscribers[newStreamId] = session.subscribe(newStream, subContainerId, {width: 400, height: 300});
	}
},500);

publisher.on({
	streamDestroyed: function(event) {
		// Check if stream is our own. We want to leave it in place if so.
		console.log('Publisher Event:');
		console.log(event);
		if (event.stream.connection.connectionId === session.connection.connectionId) {
			console.log('ConnectionId match');
			event.preventDefault();
		}
	}
});

// Connect to the Session using the 'apiKey' of the application and a 'token' for permission
session.connect(apiKey, token);


// NB - unpublish is currently working, you still see yourself locally, but other clients don't (tested over network)
// Thought that would be better than losing the local video/publisher object
// ??? - We could just switch off audio and video. Better or worse...?
$('#stopStream').click(function(){
	session.unpublish(publisher);
	// publisher.publishVideo(false);
	// publisher.publishAudio(false);
});

$('#startStream').click(function(){
	session.publish(publisher);
	// publisher.publishVideo(true);
	// publisher.publishAudio(true);
});

$('#getSubscribers').click(function(){
	if (activeStreams) {
		activeStreams.forEach(function(stream, index){
			console.log(session.getSubscribersForStream(stream));
		});
	}
	else {
		console.log('No active streams');
	}
});

$('#kill').click(function(){
	var connectionToKill = $('#connectionId').val();
	console.log(connectionToKill);
	session.forceDisconnect(connectionToKill, function(err){
		if (err) {
			console.log('Failed to kill conection');
		}
		else {
			console.log('Killed '+ connectionToKill);
		}
	});
});

