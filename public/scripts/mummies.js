
OT.setLogLevel(OT.DEBUG);

// Initialize an OpenTok Session object
var session = OT.initSession( apiKey,sessionId );
console.log('Token: ' + token );
console.log('SessionId: ' + sessionId );
console.log('Username: ' + username );
console.log('Permissions: ' + permissions );

var publisher;
var subscribers = {};

// Initialize a Publisher, and place it into the element with id='publisher'
publisher = OT.initPublisher( 'publisher-div', { name: username, width: '100%', height: '100%', /*publishAudio: false,*/ style: {nameDisplayMode: 'on'}});


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
		console.log( 'New Event: ' );
		console.log( event );
		// var permission
		console.log( 'New Event data: ' );
		var streamData = JSON.parse( event.stream.connection.data );
		console.log( streamData );


		if( streamData.permissions === 'moderator' ){
			console.log( 'New stream is for a moderator');
			var streamId = event.stream.streamId;
			// $('#publisher').wrap('<div id='streamModerator'></div>');
			//$('<div/>').attr('id', 'moderator-div').appendTo('#moderator');
			// $('#window').append('<div></div>').attr('id', 'streamModerator');
			subscribers[streamId] = session.subscribe(event.stream, 'moderator-div', { width: '100%', height: '100%'});

		}
		else {
			console.log( 'New stream is for a publisher so ignore');
		}
	},

	streamDestroyed: function(event) {
		// TODO - clean up subscriber object on streamDestroyed
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

// Connect to the Session using the 'apiKey' of the application and a 'token' for permission
session.connect( token);


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


