// TODO Explicitly place subscribers in subscriber-n, rather than reply on subscriber:empty
// TODO Refactor to avoid variable name reuse - username, role, displayName (+more?)
// are global vars from script tag, but are also used in event listeners..

// TODO stop passing username local as no longer used. Check which other locals are also not used.

// Global vars passed to view template
console.log('Token: ' + token);
console.log('SessionId: ' + sessionId);
console.log('ArchiveToken: ' + archiveToken);
console.log('ArchiveSessionId: ' + archiveSessionId);
console.log('Email: ' + email);
console.log('Username: ' + username);
console.log('Display Name: ' + displayName);
console.log('MembershipLevel: ' + membershipLevel);
console.log('Role: ' + role);

OT.setLogLevel(OT.LOG); // <- or OT.DEBUG for VERY verbose logging

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey, sessionId);
// Initialize a second OpenTok Session object to be recorded
// var archiveSession = OT.initSession(apiKey, archiveSessionId);

// Initialize a Publisher, and place it into the element with id='publisher'
var publisherOptions = {
							name: displayName,
							width: '100%',
							height: '100%',
							// resolution choices: "1280x720", "640x480" (default), "320x240"
							resolution: '640x480',
							// framerate choices: 30, 15, 7, 1
							// frameRate: 30,
							style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/}
						};

var publisher = OT.initPublisher('publisher', publisherOptions );


// Initialize a second publisher to be recorded -appended to hidden div, so not visible
// var archivePublisherOptions = {
// 							name: displayName,
// 							// width: '100%',
// 							// height: '100%',
// 							resolution: '640x480', // recording is always 640x480 (== default res)
// 							insertMode: 'append' //,
// 							// framerate choices: 30, 15, 7, 1
// 							// frameRate: 30,
// 							// style: {nameDisplayMode: 'off', buttonDisplayMode: 'off'}
// 						};

// var archivePublisher = OT.initPublisher('archive-publisher', archivePublisherOptions );

//////////////////
// Data Object //
/////////////////

// NB 'mummyId' is now derived from clients email address (as must be unique)

// mummyData[mummyId] = {stream:{}/null, subscriber:{}/null, status: 'active'/'inactive'/'no-stream'}
var mummyData = {};
// Id of started archive
var archiveId;

///////////////////////
//  HELPER FUNCTIONS //
///////////////////////

// not currently used - relying on unique mummyIds from MM, and checking mummyData manually
// function mummyIdFreeCheck(stream) {
// 	var connectionData = JSON.parse(stream.connection.data);
// 	var mummyId = connectionData.email;
// 	if (mummyData.hasOwnProperty(mummyId) ) {
// 		return false;
// 	}
// 	return true;
// }

// mummies-list helpers
//////////////////////////

function makeMummyId(string) {
	// spaces to hyphens
	var mummyId = string.replace(/\s+/g, '-');
	// strip all characters not valid for css selectors
	mummyId = mummyId.replace(/[^a-z0-9_-]/gi, '');
	// check if first character is a number (css first char must match /-_a-z/i )
	// if (/[0-9]/.test(mummyId.charAt(0) ) ) {
	//	mummyId = 'id-' + mummyId;
	// }
	// NB - no need for check, prepending 'id-' in all cases
	mummyId = 'id-' + mummyId;
	return mummyId;
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

function setMummyNoStream(mummyId) {
	$('#'+mummyId).removeClass('inactive');
	$('#'+mummyId).removeClass('active');
	$('#'+mummyId).addClass('no-stream');
	sortMummies();
}

function setMummyActive(mummyId) {
	$('#'+mummyId).removeClass('no-stream');
	$('#'+mummyId).removeClass('inactive');
	$('#'+mummyId).addClass('active');
	sortMummies();
}

function setMummyInactive(mummyId) {
	$('#'+mummyId).removeClass('no-stream');
	$('#'+mummyId).removeClass('active');
	$('#'+mummyId).addClass('inactive');
	sortMummies();
}

function removeMummy(mummyId) {
	$('#'+mummyId).remove();
	sortMummies();
}

// subscription/DOM helpers
///////////////////////////

function activateStream(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var mummyId = makeMummyId(connectionData.email);
	mummyData[mummyId].status = 'active';
	var subContainerId = mummyId + '-subscriber';
	$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty')[0]);
	var subscriberOptions = {
								width: '100%',
								height: '100%',
								subscribeToAudio: false,
								style: {nameDisplayMode: 'on', /*buttonDisplayMode: 'on'*/} //buttonDisplay on auto (i.e. mouseover), as 'on' causes central overlay on small screens
							};
	mummyData[mummyId].subscriber = session.subscribe(stream, subContainerId, subscriberOptions);
	// set mummies-list entry class to active
	setMummyActive(mummyId);
}

function addSubscriber(stream) {
	if ($('.subscriber:empty').length > 0) {
		activateStream(stream);
	}
}

function unsubscribe(stream){
	var connectionData = JSON.parse(stream.connection.data);
	var mummyId = makeMummyId(connectionData.email);
	session.unsubscribe(mummyData[mummyId].subscriber);
	$('#' + mummyId + '-subscriber').remove();
	mummyData[mummyId].subscriber = null;
	mummyData[mummyId].status = 'inactive';
	setMummyInactive(mummyId);
}

function fillInFive() {
	console.log('fillInFive() called');
	var mummyIdsWithStreams = [];
	var mummyIdsToSubscribeTo;
	// find all available streams
	for (var mummyId in mummyData) {
		if (mummyData[mummyId].stream) {
			mummyIdsWithStreams.push(mummyId);
		}
	}
	mummyIdsWithStreams.sort();
	// find all currently subscribed to streams
	var activeMummyIds = [];
		for (var mummyId2 in mummyData) {
			if (mummyData[mummyId2].subscriber) {
				activeMummyIds.push(mummyId2);
			}
		}
	activeMummyIds.sort();
	//  if <= 5 streams available, use them
	if (mummyIdsWithStreams.length <= 5) {
		mummyIdsToSubscribeTo = mummyIdsWithStreams;
	}
	//  if > 5 streams available, find lowest active mummyId, go up 5 from there
	else {
		var lowestActiveMummyId = activeMummyIds[0];
		var lowestActiveMummyIdIndex = mummyIdsWithStreams.indexOf(lowestActiveMummyId);
		// Check if 5 more after lowest active - if not, use last 5 available
		if (mummyIdsWithStreams.slice(lowestActiveMummyIdIndex, lowestActiveMummyIdIndex + 5).length > 5) {
			mummyIdsToSubscribeTo = mummyIdsWithStreams.slice(lowestActiveMummyIdIndex, lowestActiveMummyIdIndex + 5);
		}
		else {
			mummyIdsToSubscribeTo = mummyIdsWithStreams.slice(mummyIdsWithStreams.length - 5);
		}
	}
	// unsub all active
	console.log('Unsubscribing: ');
	console.log(activeMummyIds);
	activeMummyIds.forEach(function(mummyId){
		unsubscribe(mummyData[mummyId].stream);
	});
	// sub to new streams
	console.log('Subscribing to: ');
	console.log(mummyIdsToSubscribeTo);
	mummyIdsToSubscribeTo.forEach(function(mummyId){
		addSubscriber(mummyData[mummyId].stream);
	});
}

function nextFive() {
	console.log('nextFive() called');
	// fallback to remove annoying subscriber_error elements
	$('.OT_subscriber_error').remove();
	mummyIdsOfAllStreamers = [];
	mummyIdsOfActiveStreamers = [];
	for (var mummyId in mummyData) {
		if (mummyData[mummyId].stream) {
			mummyIdsOfAllStreamers.push(mummyId);
			if (mummyData[mummyId].status === 'active') {
				mummyIdsOfActiveStreamers.push(mummyId);
			}
		}
	}
	mummyIdsOfAllStreamers.sort();
	mummyIdsOfActiveStreamers.sort();
	console.log('All streamers: ');
	console.log(mummyIdsOfAllStreamers);
	console.log('Active streamers: ');
	console.log(mummyIdsOfActiveStreamers);
	var mummyIdsToSubscribeTo;
	var lastPossibleMummyId = mummyIdsOfAllStreamers[mummyIdsOfAllStreamers.length - 1];
	// check if < 5 streams avaiable. If so, display all
	if (mummyIdsOfAllStreamers.length <= 5 ) {
		console.log('Fewer than 5 available streams, displaying all');
		mummyIdsToSubscribeTo = mummyIdsOfAllStreamers;
	}
	// Check if last mummyId in allStreamers currently active, if so, start again from begining
	else if (mummyIdsOfActiveStreamers.indexOf(lastPossibleMummyId) !== -1) {
		console.log('Reached end of list. Wrapping around to start.');
		mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(0,5);
	}
	else {
		// find highest mummyId currently displayed, and it's index in allStreamers
		var lastActiveMummyId = mummyIdsOfActiveStreamers[mummyIdsOfActiveStreamers.length - 1];
		var lastActiveMummyIdIndex = mummyIdsOfAllStreamers.indexOf(lastActiveMummyId);
		// check if there are 5 more names after lastActive in allStreamers, if so, fetch
		if ( lastActiveMummyIdIndex < mummyIdsOfAllStreamers.length - 6 ) {
			mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(lastActiveMummyIdIndex + 1, lastActiveMummyIdIndex + 6);
		}
		else { //fetch last 5 names
			console.log('Near end of list, fetching last 5 names');
			mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(mummyIdsOfAllStreamers.length - 5);
		}
	}
	// unsubscribe active streams
	mummyIdsOfActiveStreamers.forEach(function(mummyId){
		unsubscribe(mummyData[mummyId].stream);
	});
	// subscribe to new streams
	console.log('Subscribing to: ');
	console.log(mummyIdsToSubscribeTo);
	mummyIdsToSubscribeTo.forEach(function(mummyId){
		addSubscriber(mummyData[mummyId].stream);
	});
}

function prevFive() {
	console.log('prevFive() called');
	// fallback to remove annoying suscriber_error elements
	$('.OT_subscriber_error').remove();
	mummyIdsOfAllStreamers = [];
	mummyIdsOfActiveStreamers = [];
	for (var mummyId in mummyData) {
		if (mummyData[mummyId].stream) {
			mummyIdsOfAllStreamers.push(mummyId);
			if (mummyData[mummyId].status === 'active') {
				mummyIdsOfActiveStreamers.push(mummyId);
			}
		}
	}
	mummyIdsOfAllStreamers.sort();
	mummyIdsOfActiveStreamers.sort();
	console.log('All streamers: ');
	console.log(mummyIdsOfAllStreamers);
	console.log('Active streamers: ');
	console.log(mummyIdsOfActiveStreamers);
	var mummyIdsToSubscribeTo;
	var firstPossibleMummyId = mummyIdsOfAllStreamers[0];
	// check if < 5 streams avaiable. If so, display all
	if (mummyIdsOfAllStreamers.length <= 5 ) {
		console.log('Fewer than 5 available streams, displaying all');
		mummyIdsToSubscribeTo = mummyIdsOfAllStreamers;
	}
	// Check if first mummyId in allStreamers currently active, if so, wrap around to end
	else if (mummyIdsOfActiveStreamers.indexOf(firstPossibleMummyId) !== -1) {
		console.log('Reached start of list. Wrapping around to end.');
		mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(mummyIdsOfAllStreamers.length - 5);
	}
	else {
		// find lowest mummyId currently displayed and it's index in allStreamers
		var firstActiveMummyId = mummyIdsOfActiveStreamers[0];
		var firstActiveMummyIdIndex = mummyIdsOfAllStreamers.indexOf(firstActiveMummyId);
		// check if there are > 5 lower names to get, if so, fetch
		if ( firstActiveMummyIdIndex >= 5 ) {
			mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(firstActiveMummyIdIndex - 5, firstActiveMummyIdIndex);
		}
		else { //else fetch first 5 names
			console.log('Near start of list, fetching first 5 names');
			mummyIdsToSubscribeTo = mummyIdsOfAllStreamers.slice(0,5);
		}
	}
	// unsubscribe active streams
	mummyIdsOfActiveStreamers.forEach(function(mummyId){
		unsubscribe(mummyData[mummyId].stream);
	});
	// subscribe to new streams
	console.log('Subscribing to: ');
	console.log(mummyIdsToSubscribeTo);
	mummyIdsToSubscribeTo.forEach(function(mummyId){
		addSubscriber(mummyData[mummyId].stream);
	});
}

function displayLoop() {
	console.log('displayLoop() called');
	// check if > 5 streams. If not, do nothing.
	mummyIdsOfAllStreamers = [];
	for (var mummyId in mummyData) {
		if (mummyData[mummyId].stream) {
			mummyIdsOfAllStreamers.push(mummyId);
		}
	}
	if (mummyIdsOfAllStreamers.length > 5) {
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
		var mummyId = makeMummyId(connectionData.email);
		var role = connectionData.role;
		var displayName = connectionData.displayName;
		// check if recieving own connection created event
		var ownConnection = false;
		if (event.target.connection.connectionId === session.connection.connectionId) ownConnection = true;
		if (!mummyData.hasOwnProperty(mummyId) && !ownConnection ) {
			mummyData[mummyId] = 	{
									stream: null,
									subscriber: null,
									status: 'no-stream'
								};
			var newMummy = $('<li/>').attr({id: mummyId, 'class': 'mummy no-stream'}).text(displayName);
			if (role === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies();
		}

		//////////////////
		// /////////////////
		if (ownConnection) {
			$.post('/start', {sessionId: sessionId, name: displayName})
			.done(function(data){
				console.log('Archive Started. id: ' + data);
				archiveId = data;
			})
			.fail(function(data){
				console.log('Archive Start FAILED: ' + data);
			});
		}
	},

	streamCreated: function(event) {
		console.log(event);

		var stream = event.stream;
		var connectionData = JSON.parse(stream.connection.data);
		var mummyId = makeMummyId(connectionData.email);
		var role = connectionData.role;
		var displayName = connectionData.displayName;

		// If mummyRef found, update mummyRef and list entry
		if (mummyData.hasOwnProperty(mummyId) ) {
			mummyData[mummyId].stream = stream;
			mummyData[mummyId].status = 'inactive';
			setMummyInactive(mummyId);
		}
		else { // add new mummyRef and list entry
			mummyData[mummyId] = 	{
										stream: stream,
										subscriber: null,
										status: 'inactive'
									};
			var newMummy = $('<li/>').attr({id: mummyId, 'class': 'mummy inactive'}).text(displayName);
			if (role === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies();
		}
		// Call addSubscriber to subscribe if < 5 streams currently displayed
		addSubscriber(stream);
	},

	streamDestroyed: function(event) {
		console.log(event);
		event.preventDefault();

		var destroyedStream = event.stream;
		var connectionData = JSON.parse(destroyedStream.connection.data);
		var mummyId = makeMummyId(connectionData.email);
		// If stream subscribed, unsub (remove dom)
		if (mummyData.hasOwnProperty(mummyId) ) {
			if (mummyData[mummyId].subscriber) {
				unsubscribe(destroyedStream);
			}
			// update mummyRef
			mummyData[mummyId].subscriber = null;
			mummyData[mummyId].stream = null;
			mummyData[mummyId].status = 'no-stream';
			// update mummies list entry
			setMummyNoStream(mummyId);
			// try and keep 5 streams on screen
			fillInFive();
		}
	},
	// NB - this is a Connection Event, not a Stream Event
	connectionDestroyed: function(event) {
		console.log(event);
		event.preventDefault();

		var connectionData = JSON.parse(event.connection.data);
		var mummyId = makeMummyId(connectionData.email);

		if (mummyData.hasOwnProperty(mummyId) ) {
			// unsbscribe/clear DOM if needed
			if (mummyData[mummyId].stream) {
				unsubscribe(mummyData[mummyId].stream);
			}
			// remove mummyRef
			delete mummyData[mummyId];
		}
		// remove mummies-list entry
		removeMummy(mummyId);
	},
});

publisher.on({
	streamDestroyed: function(event) {
		// Check if stream is our own. We want to leave it in place if so.
		console.log('Publisher Event:');
		console.log(event);
		// TODO add 'if session/ if session hasOWnProerpty connection to prevent not defined error whenown connection breaks
		if (event.stream.connection.connectionId === session.connection.connectionId) {
			console.log('ConnectionId match');
			event.preventDefault();
		}
	}
});


// Remove 'Cannot connect to stream' boxes from DOM on connection error
// If left, they clutter the display.
// ??? - Reason for frequency of these errors unclear. Seems to happen on client browser exit/refresh.
// ??? - Do streamDestroyed/connectionDestroyed events also trigger? If not, mummyData needs tidy up here.
OT.on('exception', function(event){
	if (event.code === 1013) {
		console.log('Connection Failed event:');
		console.log(event);
		$('.OT_subscriber_error').remove();
	}
});


// archiveSession.on({

// 	sessionConnected: function(event) {
// 		console.log(event);
// 		console.log('Archive Session Connection data:');
// 		console.log(archiveSession.connection);
// 		console.log('Arhive Publisher properties:');
// 		console.log(archivePublisher);
// 		archiveSession.publish(archivePublisher);
// 	},

// 	connectionCreated: function(event) {
// 		// leave ownConnetion check, to prevent sending extra requests if other instructors join by mistakr
// 		var ownConnection = false;
// 		if (event.target.connection.connectionId === archiveSession.connection.connectionId) ownConnection = true;

// 		if (ownConnection) {
// 			$.post('/start', {sessionId: archiveSessionId, name: displayName})
// 			.done(function(data){
// 				console.log('Archive Started. id: ' + data);
// 				archiveId = data;
// 			})
// 			.fail(function(data){
// 				console.log('Archive Start FAILED: ' + data);
// 			});
// 		}
// 	},

// });

////////////////////////////////
// Session Connect!
///////////////////////////////
session.connect(token);
// archiveSession.connect(archiveToken);
////////////////////////////////



/////////////
//  Timer  //
/////////////

// var timer = intervalId for use with clearInterval
var timer = setInterval(function(){
	displayLoop();
}, 15000);  // <- 15 seconds


///////////////
//  Buttons  //
///////////////

// TODO check num avail streams. Do nothing if <=5. Disable? How to renable? piggyback 15sec set interval
// BUT, would prevent handy use of arrow button to reset bad layout
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

////////
// Pause/play button - class member auto scroll
////////
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

/////////////////////
// Kick mummy button
/////////////////////

$('#kill').click(function(){
	var mummyIdToKill = $('.selected').attr('id');
	var connectionIdToKill;

	if (!mummyIdToKill) {
		alert(	'\nNo client selected!' +
				'\n\nPlease select a name to kick from the list on the left.');
	}
	else {
		// confirmation dialogue
		var kill = confirm(	'\nAre you sure you want to kick this client?' +
							'\n\nThey will be disconnected from the class.' +
							'\n\n\'Cancel\' to leave the client in the class.\n\'OK\' to kick the client.');

		if (kill) {
			if (mummyData.hasOwnProperty(mummyIdToKill) ) {
				if (mummyData[mummyIdToKill].stream) {
						connectionIdToKill = mummyData[mummyIdToKill].stream.connection.connectionId;
				}
			}
			unsubscribe(mummyData[mummyIdToKill].stream);
			session.forceDisconnect(connectionIdToKill, function(err){
				if (err) {
					console.log('Failed to kill connection');
				}
				else {
					console.log('Killed '+ connectionIdToKill);
					// delete mummyData[mummyIdToKill];
					// don't delete mummyRef? allow connectionDestroyed event to handle delete/removeMummy etc.
				}
			});
		}
	}
});

/////////////////////
// End class button
/////////////////////

$('#endClass').click(function(){
	// confirmation dialogue
	var end = confirm(	'\nAre you sure you want to end the class?' +
						'\n\nWarning: this will end the class and kick everyone out of the session.' +
						'\n\n\'Cancel\' to leave the class running.\n\'OK\' to end the class.');

	if (end) {
		// kick off all mummies
		var mummyIdsToKill = [];
		for (var mummyId in mummyData) {
			if (mummyData[mummyId].stream) {
				 mummyIdsToKill.push = mummyId;
			}
		}
		if (mummyIdsToKill.length > 0) {
			mummyIdsToKill.forEach(function(mummyId){
				var connectionIdToKill = mummyData[mummyId].stream.connection.connectionId;
				session.forceDisconnect(connectionIdToKill, function(err){
					if (err) {
						console.log('Failed to kill connection');
					}
					else {
						console.log('Killed '+ connectionIdToKill);
					}
				});
			});
		}
		// disconnect self
		session.disconnect();
		// clear mummies-list
		$('#mummies-list').empty();
		// clear mummyData;
		mummyData = {};
		// added a redirect here, the idea being to make sure the instructor can't stay in the class somehow. Maybe by refreshing their browser
		// if we keep this, can remove the DOM/data clearing above, but should keep session.disconnect() to make sure we're pplaying nicely with the TokBox session, maybe.
		if (archiveId) {
			$.post('/stop', {archiveId: archiveId})
			.done(function(){
				archiveId = null;
				console.log('Archive Stopped');
				// window.location.replace('/logout');
			})
			.fail(function(data){
				console.log('Archive Stop FAILED: ' + data );
				// leave window anyway. Archive will time out after 60 seconds
				// window.location.replace('/logout');
			});
		}
		// leave window without waiting for AJAX reply - not needed unless debugging
		// using location.replace as it effectively disables the back button, encouraging clients to rejoin the class via MW.com
		// NB - auth cookies cleared by server
		window.location.replace('/logout');
	}
});

/////////////////////
// Exit class button
/////////////////////

$('#logOut').click(function(){
	var exit = confirm('\nAre you sure you want to exit the class?' +
						'\n\nThis will only log you out. It will NOT end the class.' +
						'\n\n\'Cancel\' to remain in the class.\n\'OK\' to exit.');
	if(exit){
		if (archiveId) {
			$.post('/stop', {archiveId: archiveId})
			.done(function(){
				archiveId = null;
				console.log('Archive Stopped');
				// window.location.replace('/logout');
			})
			.fail(function(data){
				console.log('Archive Stop FAILED: ' + data );
				// leave window anyway. Archive will time out after 60 seconds
				// window.location.replace('/logout');
			});
		}
		// leave window without waiting for AJAX reply - not needed unless debugging
		// using location.replace as it effectively disables the back button, encouraging clients to rejoin the class via MW.com
		// NB - auth cookies cleared by server
		window.location.replace('/logout');
	}
});

////////////////////
// Click Handlers //
////////////////////

/////////////////////
// Select mummy list entry click handler
/////////////////////

$(document).on('click', '.mummy', function(){
	$('.mummy').removeClass('selected');
	$(this).addClass('selected');
});

/////////////////////////////////
// Subscriber un-mute / re-mute click handler
/////////////////////////////////

// TODO add pause auto scroll on un-mute / Resume on mute?

$(document).on('click', '.OT_subscriber', function(){
	console.log(mummyData);
	if ($(this).hasClass('selected-subscriber') ){
		$('.OT_subscriber').removeClass('selected-subscriber');
		var mummyIdToMute = $(this).attr('id').replace(/-subscriber$/,'');
		var subscriberToMute;
		console.log('Muting:');
		console.log(subscriberToMute);
		if (mummyData[mummyIdToMute].subscriber) subscriberToMute = mummyData[mummyIdToMute].subscriber;
		if (subscriberToMute) subscriberToMute.subscribeToAudio(false);
	}
	else {
		$('.OT_subscriber').removeClass('selected-subscriber');
		$(this).addClass('selected-subscriber');
		var selectedMummyId = $(this).attr('id').replace(/-subscriber$/,'');
		var subscriberToHear;
		if (mummyData[selectedMummyId].subscriber) subscriberToHear = mummyData[selectedMummyId].subscriber;
		console.log('Unmuting:');
		console.log(subscriberToHear);
		var subscribersToMute = [];
		for (var mummyId in mummyData) {
			if (mummyData[mummyId].subscriber && mummyId !== selectedMummyId) {
				subscribersToMute.push(mummyData[mummyId].subscriber);
			}
		}
		if (subscriberToHear) subscriberToHear.subscribeToAudio(true);
		subscribersToMute.forEach(function(toMute){
			toMute.subscribeToAudio(false);
		});
	}
});


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
