// TODO Explicitly place subscribers in subscriber-n, rather than reply on subscriber:empty
// TODO Refactor to avoid variable name reuse - username, role, displayName (+more?)
// are global vars fromscript tag, but are also used in event listeners

// OT.setLogLevel(OT.DEBUG); // <- VERY verbose logging

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);

console.log('Token: ' + token);
console.log('SessionId: ' + sessionId);
console.log('Username: ' + username);
console.log('Display Name: ' + displayName);
console.log('MembershipLevel: ' + membershipLevel);
console.log('Role: ' + role);

// Initialize a Publisher, and place it into the element with id='publisher'
var publisherOptions = {
							name: displayName,
							width: '100%',
							height: '100%',
							resolution: '1280x720', // '1280x720' is max possible resolution -default 640x480
							frameRate: 30, //30 is max possible frame rate
							style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/}
						};

var publisher = OT.initPublisher('publisher', publisherOptions );

//////////////////
// Data Object //
/////////////////

// mummyData[username] = {stream:{}/null, subscriber:{}/null, status: 'active'/'inactive'/'no-stream'}
var mummyData = {};

///////////////////////
//  HELPER FUNCTIONS //
///////////////////////

// not currently used - relying on unique usernames from MM, and checking mummyData manually
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

function makeUsernameId(string) {
	// spaces to hyphens
	var usernameId = string.replace(/\s+/g, '-');
	// strip all characters not valid for css selectors
	usernameId = usernameId.replace(/[^a-z0-9_-]/gi, '');
	// check if first character is a number (css first char must match /-_a-z/i )
	if (/[0-9]/.test(usernameId.charAt(0) ) ) {
		usernameId = 'id-' + usernameId;
	}
	return usernameId;
}

function sortByName(a,b) {
	var aName = $(a).text();
	var bName = $(b).text();
	if 		( aName < bName ) 	{ return -1;}
	else if ( aName > bName ) 	{ return 1; }
	else						{ return 0; }
}

function sortMummies() {
	var mummiesList = $('#mummies-list');
	var activeMummies = mummiesList.children('li.active');
	var inactiveMummies = mummiesList.children('li.inactive');
	var noStreamMummies = mummiesList.children('li.no-stream');
	activeMummies.detach().sort(sortByName);
	inactiveMummies.detach().sort(sortByName);
	noStreamMummies.detach().sort(sortByName);
	mummiesList.append(activeMummies);
	mummiesList.append(inactiveMummies);
	mummiesList.append(noStreamMummies);
}

function setMummyNoStream(username) {
	var usernameId = makeUsernameId(username);
	$('#'+usernameId).removeClass('inactive');
	$('#'+usernameId).removeClass('active');
	$('#'+usernameId).addClass('no-stream');
	sortMummies();
}

function setMummyActive(username) {
	var usernameId = makeUsernameId(username);
	$('#'+usernameId).removeClass('no-stream');
	$('#'+usernameId).removeClass('inactive');
	$('#'+usernameId).addClass('active');
	sortMummies();
}

function setMummyInactive(username) {
	var usernameId = makeUsernameId(username);
	$('#'+usernameId).removeClass('no-stream');
	$('#'+usernameId).removeClass('active');
	$('#'+usernameId).addClass('inactive');
	sortMummies();
}

function removeMummy(username) {
	var usernameId = makeUsernameId(username);
	$('#'+usernameId).remove();
	sortMummies();
}

// subscription/DOM helpers
///////////////////////////

function activateStream(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var username = connectionData.username;
	var usernameId = makeUsernameId(username);
	mummyData[username].status = 'active';
	var subContainerId = usernameId + '-subscriber';
	$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty')[0]);
	var subscriberOptions = {
								width: '100%',
								height: '100%',
								subscribeToAudio: false,
								style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/} //buttonDisplay on auto (i.e. mouseover), as 'on' causes central overlay on small screens
							};
	mummyData[username].subscriber = session.subscribe(stream, subContainerId, subscriberOptions);
	// set mummies-list entry class to active
	setMummyActive(username);
}

function addSubscriber(stream) {
	if ($('.subscriber:empty').length > 0) {
		activateStream(stream);
	}
}

function unsubscribe(stream){
	var connectionData = JSON.parse(stream.connection.data);
	var username = connectionData.username;
	var usernameId = makeUsernameId(username);
	session.unsubscribe(mummyData[username].subscriber);
	$('#' + usernameId + '-subscriber').remove();
	mummyData[username].subscriber = null;
	mummyData[username].status = 'inactive';
	setMummyInactive(username);
}

function fillInFive() {
	console.log('fillInFive() called');
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
	console.log('Unsubscribing: ');
	console.log(activeUsernames);
	activeUsernames.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// sub to new streams
	console.log('Subscribing to: ');
	console.log(usernamesToSubscribeTo);
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
}

function nextFive() {
	console.log('nextFive() called');
	$('.OT_subscriber_error').remove();
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
	console.log('All streamers: ');
	console.log(usernamesOfAllStreamers);
	console.log('Active streamers: ');
	console.log(usernamesOfActiveStreamers);
	var usernamesToSubscribeTo;
	var lastPossibleUsername = usernamesOfAllStreamers[usernamesOfAllStreamers.length - 1];
	// check if < 5 streams avaiable. If so, display all
	if (usernamesOfAllStreamers.length <= 5 ) {
		console.log('Fewer than 5 available streams, displaying all');
		usernamesToSubscribeTo = usernamesOfAllStreamers;
	}
	// Check if last username in allStreamers currently active, if so, start again from begining
	else if (usernamesOfActiveStreamers.indexOf(lastPossibleUsername) !== -1) {
		console.log('Reached end of list. Wrapping around to start.');
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(0,5);
	}
	else {
		// find highest username currently displayed, and it's index in allStreamers
		var lastActiveUsername = usernamesOfActiveStreamers[usernamesOfActiveStreamers.length - 1];
		var lastActiveUsernameIndex = usernamesOfAllStreamers.indexOf(lastActiveUsername);
		// check if there are 5 more names after lastActive in allStreamers, if so, fetch
		if ( lastActiveUsernameIndex < usernamesOfAllStreamers.length - 6 ) {
			usernamesToSubscribeTo = usernamesOfAllStreamers.slice(lastActiveUsernameIndex + 1, lastActiveUsernameIndex + 6);
		}
		else { //fetch last 5 names
			console.log('Near end of list, fetching last 5 names');
			usernamesToSubscribeTo = usernamesOfAllStreamers.slice(usernamesOfAllStreamers.length - 5);
		}
	}
	// unsubscribe active streams
	usernamesOfActiveStreamers.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// subscribe to new streams
	console.log('Subscribing to: ');
	console.log(usernamesToSubscribeTo);
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
}

function prevFive() {
	console.log('nextFive() called');
	$('.OT_subscriber_error').remove();
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
	console.log('All streamers: ');
	console.log(usernamesOfAllStreamers);
	console.log('Active streamers: ');
	console.log(usernamesOfActiveStreamers);
	var usernamesToSubscribeTo;
	var firstPossibleUsername = usernamesOfAllStreamers[0];
	// check if < 5 streams avaiable. If so, display all
	if (usernamesOfAllStreamers.length <= 5 ) {
		console.log('Fewer than 5 available streams, displaying all');
		usernamesToSubscribeTo = usernamesOfAllStreamers;
	}
	// Check if first username in allStreamers currently active, if so, wrap around to end
	else if (usernamesOfActiveStreamers.indexOf(firstPossibleUsername) !== -1) {
		console.log('Reached start of list. Wrapping around to end.');
		usernamesToSubscribeTo = usernamesOfAllStreamers.slice(usernamesOfAllStreamers.length - 5);
	}
	else {
		// find lowest username currently displayed and it's index in allStreamers
		var firstActiveUsername = usernamesOfActiveStreamers[0];
		var firstActiveUsernameIndex = usernamesOfAllStreamers.indexOf(firstActiveUsername);
		// check if there are > 5 lower names to get, if so, fetch
		if ( firstActiveUsernameIndex >= 5 ) {
			usernamesToSubscribeTo = usernamesOfAllStreamers.slice(firstActiveUsernameIndex - 5, firstActiveUsernameIndex);
		}
		else { //else fetch first 5 names
			console.log('Near start of list, fetching first 5 names');
			usernamesToSubscribeTo = usernamesOfAllStreamers.slice(0,5);
		}
	}
	// unsubscribe active streams
	usernamesOfActiveStreamers.forEach(function(username){
		unsubscribe(mummyData[username].stream);
	});
	// subscribe to new streams
	console.log('Subscribing to: ');
	console.log(usernamesToSubscribeTo);
	usernamesToSubscribeTo.forEach(function(username){
		addSubscriber(mummyData[username].stream);
	});
}

function displayLoop() {
	console.log('displayLoop() called');
	// check if > 5 streams. If not, do nothing.
	usernamesOfAllStreamers = [];
	for (var username in mummyData) {
		if (mummyData[username].stream) {
			usernamesOfAllStreamers.push(username);
		}
	}
	if (usernamesOfAllStreamers.length > 5) {
		nextFive();
	}
	else {
		return false;
	}
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

	connectionCreated: function(event) {
		// Check for mummyRef, add if missing.
		// May already exist from stream created event?
		var connectionData = JSON.parse(event.connection.data);
		var username = connectionData.username;
		var usernameId = makeUsernameId(username);
		var role = connectionData.role;
		var displayName = connectionData.displayName;
		// check if receving own connection created event
		var ownConnection = false;
		if (event.target.connection.connectionId === session.connection.connectionId) ownConnection = true;
		if (!mummyData.hasOwnProperty(username) && !ownConnection ) {
			mummyData[username] = 	{
									stream: null,
									subscriber: null,
									status: 'no-stream'
								};
			var newMummy = $('<li/>').attr({id: usernameId, 'class': 'mummy no-stream'}).text(displayName);
			if (role === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies();
		}
	},

	streamCreated: function(event) {
		console.log(event);

		var newStream = event.stream;
		var newStreamId = newStream.streamId;
		var newStreamConnectionData = JSON.parse(newStream.connection.data);
		var username = newStreamConnectionData.username;
		var usernameId = makeUsernameId(username);
		var role = newStreamConnectionData.role;
		var displayName = newStreamconnectionData.displayName;

		// If mummyRef found, update mummyRef and list entry
		if (mummyData.hasOwnProperty(username) ) {
			mummyData[username].stream = newStream;
			mummyData[username].status = 'inactive';
			setMummyInactive(username);
		}
		else { // add new mummyRef and list entry
			mummyData[username] = 	{
										stream: newStream,
										subscriber: null,
										status: 'inactive'
									};
			var newMummy = $('<li/>').attr({id: usernameId, 'class': 'mummy inactive'}).text(displayName);
			if (role === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies();
		}
		// Call addSubscriber to subscribe if < 5 streams currently displayed
		addSubscriber(newStream);
	},

	streamDestroyed: function(event) {
		console.log(event);
		event.preventDefault();

		var destroyedStream = event.stream;
		var destroyedStreamId = event.stream.streamId;
		var connectionData = JSON.parse(destroyedStream.connection.data);
		var username = connectionData.username;
		var usernameId = makeUsernameId(username);
		// If stream subscribed, unsub (remove dom)
		if (mummyData.hasOwnProperty(username) ) {
			if (mummyData[username].subscriber) {
				unsubscribe(destroyedStream);
			}
			// update mummyRef
			mummyData[username].subscriber = null;
			mummyData[username].stream = null;
			mummyData[username].status = 'no-stream';
			// update mummies list entry
			setMummyNoStream(username);
			// try and keep 5 streams on screen
			fillInFive();
		}
	},
	// NB - this is a Connection Event, not a Stream Event
	connectionDestroyed: function(event) {
		console.log(event);
		event.preventDefault();

		var connectionData = JSON.parse(event.connection.data);
		var username = connectionData.username;
		// unsbscribe/clear DOM if needed
		if (mummyData[username].stream) {
			unsubscribe(mummyData[username].stream);
		}
		// remove mummyRef
		if (mummyData.hasOwnProperty(username) ) {
			delete mummyData[username];
		}
		// remove mummies-list entry
		removeMummy(username);
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


// Remove 'Cannot connect to stream' boxes from DOM on connection error
// If left, they clutter the display.
// ??? - Reason for frequency of these errors unclear. Seems to happen on cliet browser exit/refresh.
// ??? - Do streamDestroyed/connectionDestroyed events also trigger? If not, mummyData needs tidy up here.
OT.on('exception', function(event){
	if (event.code === 1013) {
		console.log('Connection Failed event:');
		console.log(event);
		$('.OT_subscriber_error').remove();
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

/////////////
//  Timer  //
/////////////

// var timer = intervalId for use with clearInterval
var timer = setInterval(function(){
	displayLoop();
}, 15000);


///////////////
//  Buttons  //
///////////////

// TODO check num avail streams. Do nothing if <=5. Disable? How to renable? piggyback 15sec set interval
// BUT, prevent handy use of arrow button to reset bad layout
$('#nextFive').click(function(){
	// get next 5 streams
	nextFive();
	// reset interval
	if (timer) clearInterval(timer);
	// restart interval if not paused
	if ( !$('#pauseToggle').hasClass('paused') ){
		timer = setInterval(function(){
			displayLoop();
		}, 15000);
	}
});


$('#prevFive').click(function(){
	// get previous 5 streams
	prevFive();
	// reset interval
	if (timer) clearInterval(timer);
	// restart interval if not paused
	if ( !$('#pauseToggle').hasClass('paused') ){
		timer = setInterval(function(){
			displayLoop();
		}, 15000);
	}
});

$('#pauseToggle').click(function(){
	if ( $(this).hasClass('paused') ) {
		$(this).removeClass('paused');
		$(this).removeClass('btn-success');
		$(this).addClass('btn-danger');
		$('#play').addClass('hidden');
		$('#pause').removeClass('hidden');
		// unpause!
		timer = setInterval(function(){
			displayLoop();
		}, 15000);
	}
	else {
		$(this).addClass('paused');
		$(this).removeClass('btn-danger');
		$(this).addClass('btn-success');
		$('#pause').addClass('hidden');
		$('#play').removeClass('hidden');
		// pause!
		if (timer) clearInterval(timer);
	}
});

$('#kill').click(function(){
	var usernameToKill = $('.selected').text();
	var connectionIdToKill;
	// confirmation dialogue
	var kill = confirm('Are you sure you want to kick this client?\nThey will be disconnected from the class');

	if (kill) {
		if (mummyData.hasOwnProperty(usernameToKill) ) {
			if (mummyData[usernameToKill].stream) {
					connectionIdToKill = mummyData[usernameToKill].stream.connection.connectionId;
			}
		}
		unsubscribe(mummyData[usernameToKill].stream);
		session.forceDisconnect(connectionIdToKill, function(err){
			if (err) {
				console.log('Failed to kill connection');
			}
			else {
				console.log('Killed '+ connectionIdToKill);
				delete mummyData[usernameToKill];
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
		// clear mummyData;
		mummyData = {};
	}
});


$(document).on('click', '.mummy', function(){
	$('.mummy').removeClass('selected');
	$(this).addClass('selected');
});

$(document).on('click', '.OT_subscriber', function(){
	if ($(this).hasClass('selected-subscriber') ){
		$('.OT_subscriber').removeClass('selected-subscriber');
		var usernameToMute = $(this).attr('id').replace(/-subscriber/,'');
		usernameToMute = usernameToMute.replace(/-/g, ' ');
		var subscriberToMute;
		console.log('Muting:');
		console.log(subscriberToMute);
		if (mummyData[usernameToMute].subscriber) subscriberToMute = mummyData[usernameToMute].subscriber;
		if (subscriberToMute) subscriberToMute.subscribeToAudio(false);
	}
	else {
		$('.OT_subscriber').removeClass('selected-subscriber');
		$(this).addClass('selected-subscriber');
		var selectedUsername = $(this).attr('id').replace(/-subscriber/,'');
		selectedUsername = selectedUsername.replace(/-/g, ' ');
		var subscriberToHear;
		if (mummyData[selectedUsername].subscriber) subscriberToHear = mummyData[selectedUsername].subscriber;
		console.log('Unmuting:');
		console.log(subscriberToHear);
		var subscribersToMute = [];
		for (var username in mummyData) {
			if (mummyData[username].subscriber && username !== selectedUsername) {
				subscribersToMute.push(mummyData[username].subscriber);
			}
		}
		if (subscriberToHear) subscriberToHear.subscribeToAudio(true);
		subscribersToMute.forEach(function(toMute){
			toMute.subscribeToAudio(false);
		});
	}
});

///////////////
// DEV TOOLS //
///////////////

// $('#getStreamData').click(function(){
// 	console.log(mummyData);
// });

// $('#getEmptySubscribers').click(function(){
// 	console.log($('.subscriber:empty'));
// 	console.log('Empty Subscriber Div length: ',$('.subscriber:empty').length);
// });

// Not currently used
// $('#help').click(function(){
// 	$('.help').toggleClass('hidden');
// });

