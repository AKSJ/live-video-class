
OT.setLogLevel(OT.DEBUG);

// Initialize an OpenTok Session object
var session = OT.initSession( apiKey,sessionId );
console.log('Token: ' + token );
console.log('SessionId: ' + sessionId );
console.log('Username: ' + username );
console.log('Permissions: ' + permissions );

var publisher;
var liveModeratorStream = "";
var moderators = [];
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
		console.log( "New Event data: " );
		var streamData = JSON.parse( event.stream.connection.data );
		console.log( streamData );


		if( streamData.permissions === "moderator" ){
			console.log( "New stream is for a moderator");
			var streamId = event.stream.streamId;
			// $('#publisher').wrap('<div id="streamModerator"></div>');
			//$('<div/>').attr("id", "moderator-div").appendTo('#moderator');
			// $('#window').append('<div></div>').attr("id", "streamModerator");
			if( !liveModeratorStream ) {
				subscribers[streamId] = session.subscribe( event.stream, "moderator-div", { width: '100%', height: '100%'}, function( error ){
					if( error ) {
						console.log( "Error subscribing to moderator stream");
					}
					else {
						liveModeratorStream = event.stream;
					}
				});
			}
			else {
				// Store any subsequent moderators in case the live moderator stream is destroyed.
				// These moderators would become the moderator when the current live moderator disconnects.
				moderators.push( event.stream );
			}
		}
		else {
			console.log( "New stream is for a publisher so ignore");
		}
	},

	streamDestroyed: function (event) {
		// TODO - clean up subscriber object on streamDestroyed

		console.log( "Stream Destroyed reason: " + event.reason );
		console.log( event );
		var connectionData = event.stream.connection.data;
		var stream = event.stream;
		if( connectionData.permissions === "moderator"  && liveModeratorStream === stream.streamId) {
			liveModeratorStream = "";
			if( moderators.length ) {
				var moderatorStream = moderators.shift();
				$('<div/>').attr("id", "moderator-div").appendTo('#moderator');
				subscribers[moderatorStream.streamId] = session.subscribe( moderatorStream, "moderator-div", { width: '100%', height: '100%'}, function( error ){
					if( error ) {
						console.log( "Error subscribing to moderator stream");
					}
					else {
						liveModeratorStream = moderatorStream;
					}
				});
			}
		}
	}
});

publisher.on({
	streamDestroyed: function(event) {
		// Check if stream is our own. We want to leave it in place if so.
		console.log('Publisher Event:');
		console.log(event);
		if ( event.reason != "forceDisconnected" ) {
			if( event.stream.connection.connectionId === session.connection.connectionId) {
				console.log('ConnectionId match');
				event.preventDefault();
			}
		}
		console.log( "Connection has been destroyed.  Allow it!");
	}
});

// Connect to the Session using the 'token' for permission
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


