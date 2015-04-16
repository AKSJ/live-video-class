// NB - Currently (sometimes) getting a dev console error 'cannnot read property 'videoWidth of null' on unpublish
// This may be a bug, code seems okay as far as I can tell. See: http://webcache.googleusercontent.com/search?q=cache:EEXBFdO8mQsJ:https://forums.tokbox.com/bugs/cannot-read-property-videowidth-of-null-error-t45250+&cd=1&hl=en&ct=clnk&gl=uk

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );

// Initialize a Publisher, and place it into the element with id="publisher"
var publisher = OT.initPublisher( /*apiKey,*/ 'publisher', {"name": username, width: '33.33%', height: '50%', style: {nameDisplayMode: "on"}});

var activeStreams = [];
var inactiveStreams = [];
var subscribers = {};

// Attach event handlers
session.on({

	// This function runs when session.connect() asynchronously completes
	sessionConnected: function(event) {
		// Publish the publisher (this will trigger 'streamCreated' on other clients)
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
		// If 5 streams active, put stream in inactive array
		console.log(event);
		var stream = event.stream;
		var streamId = event.stream.streamId;
		var activeStreamCount = activeStreams.length;
		if (activeStreamCount < 5) {
			activeStreams.push(stream);
			var subContainerId = 'stream-' + streamId;
			$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty'));
			subscribers[streamId] = session.subscribe(event.stream, subContainerId, {width: 400, height: 300, style: {nameDisplayMode: 'on'}});
		}
		else {
			inactiveStreams.push(stream);
		}
	},

	streamDestroyed: function(event) {
		// Check if stream registered as active/inactive, and remove from releveant indexes
		// Check for subscriber object and remove
		// Not currently unsubscribing, as default behaviour should handle that.
		var destroyedStreamId = event.stream.streamId;
		var activeStreamIndex = null;
		var inactiveStreamIndex = null;
		activeStreams.forEach(function(activeStream, index){
			if (activeStream.streamId === destroyedStreamId) {
				activeStreamIndex = index;
			}
		});
		inactiveStreams.forEach(function(inactiveStream, index){
			if (inactiveStream.streamId === destroyedStreamId) {
				inactiveStreamIndex = index;
			}
		});

		if (activeStreamIndex !== null) {
			console.log('destroyedStreamId: '+destroyedStreamId, 'activeStreamIndex: '+activeStreamIndex);
			// $('#stream-'+destroyedStreamId).remove(); // default behaviour should remove the DOM element?
			activeStreams.splice(activeStreamIndex,1);
		}
		if (inactiveStreamIndex !== null) {
			inactiveStreams.splice(inactiveStreamIndex,1);
		}
		if (subscribers[destroyedStreamId]) {
			delete subscribers[destroyedStreamId];
			console.log('subscribers should have same num props as activeStream.length, activeStreams.length: ', activeStreams.length, 'Subscribers length: '+ Object.keys(subscribers).length);
		}
	}
});

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

session.connect(/*apiKey,*/ token);

// if < 5 active streams, check for inactive streams and subscribe
setInterval(function(){
	var activeStreamCount = activeStreams.length;
	var streamsToAddCount = 5 - activeStreamCount;
	if (activeStreamCount < 5 && inactiveStreams.length > 0) {
		for (var i=0; i<streamsToAddCount; i++) {
			var newStream = inactiveStreams.pop();
			var newStreamId = newStream.streamId;
			activeStreams.push(newStream);
			var subContainerId = 'stream-' + newStreamId;
			$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty'));
			subscribers[newStreamId] = session.subscribe(newStream, subContainerId, {width: 400, height: 300, style: {nameDisplayMode: 'on'}});
		}
	}
},500);

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

$('#nextFive').click(function(){
	var inactiveCount = inactiveStreams.length;
	var tempStreams = [];
	// 0. Check for inactive streams. If 0, end. If < 5, keep some active
	if (inactiveCount === 0) {
		console.log('No inactive streams found');
	}
	else {
		console.log(inactiveCount+ 'inactive streams found');
		// Temp array to be sure we don't recycle streams. Could just use push/pop vs shift/unshift
		if (inactiveCount > 5) inactiveCount = 5;
		for (var i=0; i<inactiveCount; i++) {
			var tempStream = inactiveStreams.pop();
			tempStreams.push(tempStream);
		}
		// 1. Clear deactivated subscribers, and unsubscribe
		tempStreams.forEach(function(tempStream, index){
			// unshft should remove subscriber1 in DOM first, gives impression of scrolling in <5 deactivated
			var streamToKill = activeStreams.unshift();
			var streamToKillId = streamToKill.streamId;
			if (subscribers[streamToKillId]) {
				session.unsubscribe(subscribers[streamToKillId]); // unsubscribe takes a subscriber object. Knew I kept them for a reason :D
				delete subscribers[streamToKillId];
			}
			$('#stream-'+ streamToKillId).remove();
		// 2. Get up to 5 inactive streams, make active, subscribe
		});
		tempStreams.forEach(function(tempStream, index){
			var streamToActivate = inactiveStreams.pop();
			activeStreams.push(streamToActivate);
			var subContainerId = 'stream-' + streamId;
			$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty'));
			subscribers[streamId] = session.subscribe(event.stream, subContainerId, {width: 400, height: 300,  style: {nameDisplayMode: 'on'}});
		});
		tempStreams.forEach(function(tempStream, index){
			inactiveStreams.push(tempStream);
		});
	}

});

$('#getSubscribers').click(function(){
	console.log(subscribers);
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

