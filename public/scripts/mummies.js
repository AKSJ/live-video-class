
// OT.setLogLevel(OT.DEBUG); // <- VERY verbose logging

// Initialize an OpenTok Session object
var session = OT.initSession( apiKey,sessionId );

console.log('Token: ' + token);
console.log('SessionId: ' + sessionId);
console.log('Email: ' + email);
console.log('Username: ' + username);
console.log('DisplayName: ' + displayName);
console.log('MembershipLevel: ' + membershipLevel);
console.log('Role: ' + role);

var publisher;
var liveModeratorStream;
var moderators = [];
var subscribers = {};

// Initialize a Publisher, and place it into the element with id='publisher'
// insertMode: experimeting with not having to preventDefault on unpubish, would be nice to turn off user webcam light... See streamtoggle below
publisher = OT.initPublisher( 'publisher-div', { /*insertMode: 'after',*/ name: displayName, width: '100%', height: '100%', style: {nameDisplayMode: 'off'} });

/////////////
// Helpers //
/////////////

function unsubscribe(stream){
	var streamId = stream.streamId;
	console.log( 'Unsubscribe this Subscriber: ');
	console.dir( subscribers[streamId] );
	if( subscribers[streamId] ) {
		session.unsubscribe(subscribers[streamId]);
		$('#moderator-div').remove();
		subscribers[streamId] = null;
	}
}

function addModerator( stream ){
	$('<div/>').attr('id', 'moderator-div').appendTo('#moderator');
	subscribers[stream.streamId] = session.subscribe( stream, 'moderator-div', { width: '100%', height: '100%'}, function( error ){
		if( error ) {
			console.log( 'Error subscribing to moderator stream');
		}
		else {
			console.log( 'Subscribing to a moderator');
			liveModeratorStream = stream;
			console.dir( liveModeratorStream );
		}
	});
}

// Attach event handlers
session.on({

	sessionConnected: function(event) {
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
		console.log( 'New Event data: ' );
		var streamData = JSON.parse( event.stream.connection.data );
		console.log( streamData );

		if( streamData.role === 'moderator' ){
			console.log( 'New stream is for a moderator');
			var streamId = event.stream.streamId;
			if( !liveModeratorStream ) {
				console.log( 'No live moderator so subscribe to this new stream.');
				addModerator( event.stream );
			}
			else {
				// Store any subsequent moderators in case the live moderator stream is destroyed.
				// These moderators would become the moderator when the current live moderator disconnects.
				console.log( 'Stream created event for another moderator');
				moderators.push( event.stream );
			}
		}
		else {
			console.log( 'New stream is for a publisher so ignore');
		}
	},

	//TODO stop unsubscribing from eveyone when we're not subscribed in the first place!
	// Why is default prevented here?
	streamDestroyed: function (event) {
		event.preventDefault();
		var destroyedStream = event.stream;
		var connectionData = JSON.parse(event.stream.connection.data);
		console.log( 'Destroyed Stream: ');
		console.dir( destroyedStream );

		unsubscribe(destroyedStream);

		console.log( 'Live Moderator Stream: ');
		console.dir( liveModeratorStream );
		if( connectionData.role === 'moderator'  && liveModeratorStream.streamId === destroyedStream.streamId) {
			console.log( 'Lead moderator has disconnected, connect to any other moderators available' );
			liveModeratorStream = null;
			console.dir( moderators );
			if( moderators.length ) {
				var moderatorStream = moderators.shift();
				addModerator( moderatorStream );
			}
			else{
				console.log( 'No other moderators to connect to.');
				console.dir( liveModeratorStream );
			}
		}
		// NB This could be in the if statement above, but put it out here so clean up happens even if something else goes wrong
		if (subscribers.hasOwnProperty(destroyedStream.streamId) ) {
			delete subscribers[destroyedStream.streamId];
		}
	}
});

publisher.on({
	streamDestroyed: function(event) {
		// Check if stream is our own. We want to leave it in place if so.
		console.log('Publisher Event:');
		console.log(event);
		if ( event.reason !== 'forceDisconnected' ) {
			if( event.stream.connection.connectionId === session.connection.connectionId) {
				console.log('ConnectionId match');
				event.preventDefault();
			}
		}
		console.log( 'Connection has been destroyed.  Allow it!');
	}
});

// Attempt to remove the irritating 'trouble connecting to stream' black boxes
// Not entirely successful, seem to appear at times other than 1013 errors
OT.on('exception', function(event){
	if (event.code === 1013) {
		console.log('Connection Failed event:');
		console.log(event);
		$('.OT_subscriber_error').remove();
	}
});

// Connect to the Session using the 'token' for permission
session.connect(token);


// trying to turn off users webcam light when unpublish.
// - setting publishVideo to false doesn't seem to do it
// - allowing default on unpublish and then re-initing publisher works, but asks for user permission again. not ideal.
$('#streamtoggle').click(function(){
	if( $('#streamtoggle').hasClass( 'btn-danger') ) {
		$('#streamtoggle').removeClass( 'btn-danger');
		$('#streamtoggle').addClass( 'btn-success');
		session.unpublish(publisher);
		$('#blackout-div').removeClass('hidden');
	}
	else if( $('#streamtoggle').hasClass( 'btn-success') ) {
		$('#streamtoggle').removeClass( 'btn-success');
		$('#streamtoggle').addClass( 'btn-danger');
		session.publish(publisher);
		$('#blackout-div').addClass('hidden');
	}
});

$('#logOut').click(function(){
	var exit = confirm('\nAre you sure you want to exit the class?' +
						'\n\n\'Cancel\' to remain in the class.\n\'OK\' to exit.');
	if(exit){
		// using location.replace as it effectively disables the back button, forcing clients to rejoin the class via MW.com
		// NB - auth cookies cleared by server
		window.location.replace('/logout');
	}
});
