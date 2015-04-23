// TODO: Make mummies mute by default (audio off).

// TODO: Add second list of 'active mummies'.?


// OT.setLogLevel(OT.DEBUG);

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );
console.log("Role: " + role );

// Initialize a Publisher, and place it into the element with id="publisher"
var publisherOptions = {
							name: username,
							width: '100%',
							height: '100%',
							resolution: '1280x720', //max resolution -default 640x480
							frameRate: 30, //max frame rate
							style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/}
						};

var publisher = OT.initPublisher('publisher', publisherOptions );

// mummyData[username] = {stream:{}/null, subscriber:{}/null, status: 'active'/'inactive' ?'no-stream'?}

var mummyData = {};
var selectedMummy;

///////////////////////
//  HELPER FUNCTIONS //
///////////////////////



function usernameFreeCheck(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var username = connectionData.username;
	if (mummyData.hasOwnProperty(username) ) {
		return false;
	}
	return true;
}

// mummies-list helpers
//////////////////////////

function hyphenate(string) {
	return string.replace(/\s+/g,'-');
}

function sortByName(a,b) {
	var aName = $(a).text();
	var bName = $(b).text();
	if 		( aId < bId ) 	{ return -1;}
	else if ( aId > bId ) 	{ return 1; }
	else					{ return 0; }
}

function sortMummies() {
	var mummiesList = $('#mummies-list');
	var mummies = mummiesList.children('li');
	mummies.detach().sort(sortByName);
	mummiesList.append(mummies);
}

function setMummyActive(username) {
	var usernameId = hyphenate(username);
	$('#'+usernameId).addClass('active');
}

function setMummyInactive(username) {
	var usernameId = hyphenate(username);
	$('#'+usernameId).removeClass('active');
}

function removeMummy(username) {
	var usernameId = hyphenate(connectionData.username);
	$('#'+usernameId).remove();
}

// subscription/DOM helpers
///////////////////////////

function activateStream(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var username = connectionData.username;
	var usernameId = hyphenate(username);
	mummyData[username].status = 'active';
	var subContainerId = usernameId + '-subscriber';
	$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty')[0]);
	var subscriberOptions = {
								width: '100%',
								height: '100%',
								subscribeToAudio: false,
								style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/} //buttonDisplay on auto as causes central overlay on small screens
							};
	mummyData[username].subscriber = session.subscribe(stream, subContainerId, subscriberOptions);
	// set mummies-list entry class to active
	setMummyActive(username);
	sortMummies();
}

function addSubscriber(stream) {
	if ($('.subscriber:empty').length > 0) {
		activateStream(stream);
	}
}

function unsubscribe(stream){
	var connectionData = JSON.parse(stream.connection.data);
	var username = connectionData.username;
	var usernameId = hyphenate(username);
	session.unsubscribe(mummyData[username].subscriber);
	$('#' + usernameId + '-subscriber').remove();
	mummyData[username].subscriber = null;
	mummyData[username].status = 'inactive';
	setMummyInactive(username);
	sortMummies();
}

function fillInFive() {
	var usernamesWithStreams = [];
	var usernamesToSubscribeTo;
	// find all available streams
	for (var username in mummyData) {
		if (mummyData[username].stream) {
			usernamesWithStreams.push(username);
		}
	}
	usernamesWithStreams.sort();
	// find all currently subscribed to streams
	var activeUsernames = [];
		for (var username2 in mummyData) {
			if (mummyData[username2].subscriber) {
				activeUsernames.push(username2);
			}
		}
	activeUsernames.sort();
	//  if <= 5 streams available, use them
	if (usernamesWithStreams.length <= 5) {
		usernamesToSubscribeTo = usernamesWithStreams;
	}
	//  if > 5 streams available, find lowest active username, go up 5 from there
	else {
		var lowestActiveUsername = activeUsernames[0];
		var lowestActiveUsernameIndex = usernamesWithStreams.indexOf(lowestActiveUsername);
		// Check if 5 more after lowest active - if not, use last 5 available
		if (usernamesWithStreams.slice(lowestActiveUsernameIndex, lowestActiveUsernameIndex + 5).length > 5) {
			usernamesToSubscribeTo = usernamesWithStreams.slice(lowestActiveUsernameIndex, lowestActiveUsernameIndex + 5);
		}
		else {
			usernamesToSubscribeTo = usernamesWithStreams.slice(usernamesWithStreams.length - 5);
		}
	}
	// unsub all active
	activeUsernames.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// sub to new streams
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
}

//////////////////////
//  Event Listeners //
//////////////////////


session.on({

	sessionConnected: function(event) {
		console.log(event);
		console.log('Session Connection data:');
		console.log(session.connection);
		console.log('Publisher properties:');
		console.log(publisher);
		session.publish(publisher);
	},


	streamCreated: function(event) {
		console.log(event);
		var newStream = event.stream;
		var newStreamId = newStream.streamId;
		var newStreamConnectionData = JSON.parse(newStream.connection.data);
		var username = newStreamConnectionData.username;
		var usernameId = hyphenate(username);
		var role = newStreamConnectionData.role;

		// If mummyRef found, update entry
		if (mummyData.hasOwnProperty(username) ) {
			mummyData[username].stream = newStream;
			mummyData[username].status = 'inactive';
		}
		else { // add new mummyRef
			mummyData[username] = 	{
										stream: newStream,
										subscriber: null,
										status: 'inactive'
									};
			var newMummy = $('<li/>').attr({id: usernameId, 'class': 'mummy'}).text(username);
			if (role === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies(); //also called in activateStream, but not invoked if 5+ active streams
		}
		// Call addSubscriber to subscribe if < 5 streams currently displayed
		addSubscriber(newStream);
	},

	streamDestroyed: function(event) {
		event.preventDefault();
		var destroyedStream = event.stream;
		var destroyedStreamId = event.stream.streamId;
		var newStreamConnectionData = JSON.parse(newStream.connection.data);
		var username = newStreamConnectionData.username;
		var usernameId = hyphenate(username);
		// If stream subscribed, unsub (remove dom)
		if (mummyData.hasOwnProperty(username) ) {
			if (mummyData[username].subscriber) {
				unsubscribe(destroyedStream);
				// try and keep 5 streams on screen
				fillInFive();
			}
			// update mummyRef
			mummyData[username].subscriber = null;
			mummyData[username].stream = null;
			mummyData[username].status = 'no-stream';
		}
	},

	connectionDestroyed: function(event) {
		var newStreamConnectionData = JSON.parse(newStream.connection.data);
		var username = newStreamConnectionData.username;
		// remove mummyRef
		if (mummyData.hasOwnProperty(username) ) {
			delete mummyData[username];
		}
		// remove mummies-list entry
		removeMummy(username);
		sortMummies();
	},
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

session.connect(token);

// Instructor video toggles -currently removed
// $('#stopStream').click(function(){
// 	session.unpublish(publisher);
// 	// publisher.publishVideo(false);
// 	// publisher.publishAudio(false);
// });

// $('#startStream').click(function(){
// 	session.publish(publisher);
// 	// publisher.publishVideo(true);
// 	// publisher.publishAudio(true);
// });

///////////////
//  Buttons  //
///////////////

// Next five for alphabetical mummies....
// New: mummyData[username] = {stream:{}, subscriber:{}, status: ''}
// - new streamRefs may or may not contain a stream, so can be preserved on stream disconnect
//  - have separate list for active/inactive? maintains onscreen/list grouping symmetry
$('#nextFive').click(function(){
	usernamesOfAllStreamers = [];
	usernamesOfActiveStreamers = [];
	for (var username in mummyData) {
		if (mummyData[username].stream) {
			usernamesOfAllStreamers.push(username);
			if (mummyData[username].status === 'active') {
				usernamesOfActiveStreamers.push(username);
			}
		}
	}
	usernamesOfAllStreamers.sort();
	usernamesOfActiveStreamers.sort();
	// find highest username currently displayed
	var lastActiveUsername = usernamesOfActiveStreamers[usernamesOfActiveStreamers.length - 1];
	// find lastActiveUsername and get 5 usernames after it in userNamesOfAllStreamers
	var usernamesToSubscribeTo;
	var lastActiveUsernameIndex = userNamesOfAllStreamers.indexOf(lastActiveUsername);
	// check if there are 5 more names to get, if so, fetch
	if ( lastActiveUsernameIndex < userNamesOfAllStreamers.length - 6 ) {
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(lastActiveUsernameIndex + 1, lastActiveUsernameIndex + 6);
	}
	else { //fetch last 5 names
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(usernamesOfAllStreamers.length - 5);
	}
	// unsubscribe active streams
	usernamesOfActiveStreamers.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// subscribe to new streams
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
});


$('#prevFive').click(function(){
	usernamesOfAllStreamers = [];
	usernamesOfActiveStreamers = [];
	for (var username in mummyData) {
		if (mummyData[username].stream) {
			usernamesOfAllStreamers.push(username);
			if (mummyData[username].status === 'active') {
				usernamesOfActiveStreamers.push(username);
			}
		}
	}
	usernamesOfAllStreamers.sort();
	usernamesOfActiveStreamers.sort();
	// find lowest username currently displayed
	var firstActiveUsername = usernamesOfActiveStreamers[0];
	// find firstActiveUsername and get 5 usernames before it in userNamesOfAllStreamers
	var usernamesToSubscribeTo;
	var firstActiveUsernameIndex = userNamesOfAllStreamers.indexOf(firstActiveUsername);
	// check if there are > 5 lower names to get, if so, fetch
	if ( firstActiveUsernameIndex >= 5 ) {
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(firstActiveUsernameIndex - 5, firstActiveUsernameIndex);
	}
	else { //else fetch first 5 names
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(0,5);
	}
	// unsubscribe active streams
	usernamesOfActiveStreamers.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// subscribe to new streams
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
});

$('#kill').click(function(){
	var mummyUsernameToKill = $('.selected').text();
	var connectionIdToKill;
	// confirmation dialogue
	var kill = confirm('Are you sure you want to kick this client?\nThey will be disconnected from the class');

	if (kill) {
		if (mummyData.hasOwnProperty(mummyUsernameToKill) ) {
			if (mummyData[mummyUsernameToKill].stream) {
					connectionIdToKill = mummyData[mummyUsernameToKill].stream.connection.connectionId;
			}
		}
		session.forceDisconnect(connectionIdToKill, function(err){
			if (err) {
				console.log('Failed to kill connection');
			}
			else {
				console.log('Killed '+ connectionIdToKill);
			}
		});
	}
});

$('#endClass').click(function(){
	// confirmation dialogue
	var end = confirm('Are you sure you want to end the class?\nEverybody will be disconnected, including you.');

	if (end) {
		// kick off all mummies
		var usernamesToKill = [];
		for (var username in mummyData) {
			if (mummyData[username].stream) {
				 usernamesToKill.push = username;
			}
		}
		usernamesToKill.forEach(function(username){
			var connectionIdToKill = mummyData[username].stream.connection.connectionId;
			session.forceDisconnect(connectionIdToKill, function(err){
				if (err) {
					console.log('Failed to kill connection');
				}
				else {
					console.log('Killed '+ connectionIdToKill);
				}
			});
		});
		// disconnect self
		session.disconnect();
		// clear mummies-list
		$('#mummies-list').empty();
	}
});

$('#help').click(function(){
	$('.help').toggleClass('hidden');
});

// TODO: connect mummy-list /OT_subscriber clicks so one click selects both if poss
$(document).on('click', '.mummy', function(){
	$('.mummy').removeClass('selected');
	$(this).addClass('selected');
});

$(document).on('click', '.OT_subscriber', function(){
	$('.OT_subscriber').removeClass('selected-subscriber');
	$(this).addClass('selected-subscriber');
	var selectedUsername = $(this).attr('id').replace(/-subscriber/,'');
	selectedUsername = selectedUsername.replace(/-/g, ' ');
	var subscriberToHear = mummyData[selectedUsername].subscriber;
	console.log(subscriberToHear);
	var subscribersToMute = [];
	for (var username in mummyData) {
		if (mummyData[username].subscriber && username !== selectedUsername) {
			subscribersToMute.push(mummyData[username].subscriber);
		}
	}
	subscriberToHear.subscribeToAudio(true);
	subscribersToMute.forEach(function(subscriberToMute){
		subscriberToMute.subscribeToAudio(false);
	});
});

///////////////
// DEV TOOLS //
///////////////
$('#getStreamData').click(function(){
	console.log(mummyData);
});

$('#getEmptySubscribers').click(function(){
	console.log($('.subscriber:empty'));
	console.log('Empty Subscriber Div length: ',$('.subscriber:empty').length);
});


