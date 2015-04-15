// NB - Currently (sometimes) getting a dev console error 'cannnot read property 'videoWidth of null' on unpublish
// This may be a bug, code seems okay as far as I can tell. See: http://webcache.googleusercontent.com/search?q=cache:EEXBFdO8mQsJ:https://forums.tokbox.com/bugs/cannot-read-property-videowidth-of-null-error-t45250+&cd=1&hl=en&ct=clnk&gl=uk

// Initialize an OpenTok Session object
var session = TB.initSession(/*apiKey,*/sessionId);
// console.log("Token: " + token );
// console.log("SessionId: " + sessionId );
var session = TB.initSession(sessionId);

// Initialize a Publisher, and place it into the element with id="publisher"
var publisher = TB.initPublisher( apiKey, 'publisher');//, {"name": token.});


var streamCount = 0;
var activeStreams = [];
var activeStreamIds = [];
var inactiveStreams = [];
var inactiveStreamIds = [];

console.log( "Member permissions: " + permissions);

// Attach event handlers
session.on({

	// This function runs when session.connect() asynchronously completes
	sessionConnected: function(event) {
		// Publish the publisher (this will trigger 'streamCreated' on other
		// clients)
		console.log(event);
		console.log( 'Session Connection data: ' + session.connection);
		session.publish(publisher);
	},

	// This function runs when another client publishes a stream (eg. session.publish())
	streamCreated: function(event) {
		// Create a container for a new Subscriber, assign it an id using the streamId, put it inside
		// the element with id="subscriber"+count.
		// If 5 streams active, put streamId in inactiveStreams array
		// TODO: refactor to jquery for consistency
		console.log(event);
		var stream = event.stream;
		var streamId = event.stream.streamId;
		var subContainer = document.createElement('div');
		if (streamCount < 5) {
			streamCount++;
			activeStreams.push(stream);
			activeStreamIds.push(streamId);
			subContainer.id = 'stream-' + streamId;
			document.getElementById('subscriber' + streamCount).appendChild(subContainer);
			// Subscribe to the stream that caused this event, put it inside the container we just made
			session.subscribe(event.stream, subContainer);
		}
		else {
			inactiveStreams.push(stream);
			inactiveStreamIds.push(streamId);
		}
	},

	streamDestroyed: function(event) {
		//Check if stream is currently displayed, if so remove from DOM and adjust count/activeStreams
		// Not currently unsubscribing, as default behaviour should handle that.
		var subscribers = session.getSubscribersForStream(event.stream);
		console.log(subscribers);
		var streamId = event.stream.streamId;
		var streamIndex = activeStreams.indexOf(streamId);
		console.log('streamId: '+streamId, 'streamIndex: '+streamIndex);
		if (streamIndex !== -1) {
			$('#stream-'+streamId).remove();
			streamCount--;
			activeStreams.splice(streamIndex,1);
			console.log(streamCount, activeStreams);
		}
	}
});

// TODO set interval, if < 5 active streams, check for inactive streams and subscribe

publisher.on({
	streamDestroyed: function(event) {
		// Check if stream is our own. We want to leave it in place if so.
		console.log('Publisher Event:');
		console.log(event);
		var subscribers = session.getSubscribersForStream(event.stream);
		console.log(subscribers);
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

