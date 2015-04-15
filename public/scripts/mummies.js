// NB - Currently (sometimes) getting a dev console error 'cannnot read property 'videoWidth of null' on unpublish
// This may be a bug, code seems okay as far as I can tell. See: http://webcache.googleusercontent.com/search?q=cache:EEXBFdO8mQsJ:https://forums.tokbox.com/bugs/cannot-read-property-videowidth-of-null-error-t45250+&cd=1&hl=en&ct=clnk&gl=uk

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );

var publisher;
var streamCount = 0;
var activeStreams = [];
var activeStreamIds = [];
var inactiveStreams = [];
var inactiveStreamIds = [];
var subscribers = {};

// Initialize a Publisher, and place it into the element with id="publisher"
publisher = OT.initPublisher( /*apiKey,*/ 'streamModerator', {insertMode: "append","name": username, width: 200, height: 150, style: {nameDisplayMode: "on"}});


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
		// if the event is from a moderator then subscribe, otherwise ignore
		console.log( "New Event: " );
		console.log( event );
		// var permission
		console.log( 'New Event data: ' );
		var streamData = JSON.parse( event.stream.connection.data );
		console.log( streamData );


		if( streamData.permissions === 'moderator' ){
			console.log( 'New stream is for a moderator');
			var streamId = event.stream.streamId;
			// $('<div/>').attr("id", "streamModerator").appendTo('#window');
			// $('#window').append('<div></div>').attr("id", "streamModerator");
			subscribers[streamId] = session.subscribe(event.stream, 'streamModerator', {width: 800, height: 700});

		}
		else {
			console.log( 'New stream is for a publisher so ignore');
		}
	},

	streamDestroyed: function(event) {

	}
});

// TODO set interval, if < 5 active streams, check for inactive streams and subscribe

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
session.connect( token);


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


