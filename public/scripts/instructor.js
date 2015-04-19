// TODO: Make mummies mute by default (audio off).

// TODO Create client list (where on page?) with forceDisconnect buttons. Audio Focus?
// Show 'active' status by setting class?

OT.setLogLevel(OT.DEBUG);

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );

// Initialize a Publisher, and place it into the element with id="publisher"
var publisherOptions = {
							name: username,
							width: '100%',
							height: '100%',
							resolution: '1280x720', //max resolution -default 640x480
							frameRate: 30, //max frame rate
							style: {nameDisplayMode: 'on', buttonDisplayMode: 'on'}
						};

var publisher = OT.initPublisher('publisher', publisherOptions );

// store all incoming streams in 'streams'. Add an object with property name of streamId:
// streamId:{	stream: {},
// 				status: 'active',
// 				id: 1,
// 				subscriber: {}
// 			}
// NB -These custom streamData objects are refered to as 'streamRefs', to avoid confusion with the OT stream objects they hold
var streamData = {};
var maxId = 0;
var selectedMummy;
// TODO? Replace maxId counter with a maxId() function

// streamData id helpers
function findMissingId() {
	var currentIds = [];
	var maxRange = [];
	for (var streamId in streamData) {
		currentIds.push(streamData[streamId].id);
	}
	currentIds.sort();
	for (var i=1; i<=maxId; i++) {
		maxRange.push(i);
	}
	if (currentIds.length !== maxRange.length) {
		maxRange.forEach(function(id, index){
			if (currentIds.indexOf(id) === -1) {
				return id;
			}
		});
	}
	else {
		return false;
	}
}

function getAvailableId() {
	var availableId = findMissingId();
	if (availableId) {
		return availableId;
	}
	else {
		maxId++ ;
		return maxId;
	}
}

// to pass to array.sort and arrange streamRefs by id
function sortStreamRefsById(a,b) {
	if 		(a.id < b.id) 	{ return -1;}
	else if (a.id > b.id) 	{ return 1; }
	else 	/* === */		{ return 0; }
}

// recursive function to patch holes in our ids
// Not using now :(   Must find a use!
function rationaliseIds() {
	var missingId = findMissingId();
	if (missingId) {
		for (var streamId in streamData) {
			if (streamData[streamId].id > missingId) {
				streamData[streamId].id -= 1;
			}
		}
		rationaliseIds();
	}
}

// mummies-list helpers
function hyphenate(string) {
	return string.replace(/\s+/g,'-');
}

function sortByDataId(a,b) {
	var aId = $(a).data('id');
	var bId = $(b).data('id');
	if 		( aId < bId ) 	{ return -1;}
	else if ( aId > bId ) 	{ return 1; }
	else					{ return 0; }
}

function sortMummies() {
	var mummiesList = $('#mummies-list');
	var mummies = mummiesList.children('li');
	mummies.detach().sort(sortByDataId);
	mummiesList.append(mummies);
}

function setMummyActive(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var usernameId = hyphenate(connectionData.username);
	$('#'+usernameId).addClass('active');
}

function setMummyInactive(stream) {
	var connectionData = JSON.parse(stream.connection.data);
	var usernameId = hyphenate(connectionData.username);
	$('#'+usernameId).removeClass('active');
}

function removeMummy(event) {
	var connectionData = JSON.parse(event.connection.data);
	var usernameId = hyphenate(connectionData.username);
	$('#'+usernameId).remove();
}

// subscription/DOM helpers
function activateStream(stream) {
	var streamId = stream.streamId;
	streamData[streamId].status = 'active';
	var subContainerId = 'stream-' + streamId;
	$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty')[0]);
	streamData[streamId].subscriber = session.subscribe(stream, subContainerId, {width: '100%', height: '100%', audioVolume: 0, style: {nameDisplayMode: 'on'}});
	// set mummies-list entry class to active
	setMummyActive(stream);
	sortMummies();
}

function addSubscriber(stream) {
	if ($('.subscriber:empty').length > 0) {
		activateStream(stream);
	}
}

function unsubscribe(stream){
	var streamId = stream.streamId;
	session.unsubscribe(streamData[streamId].subscriber);
	$('stream-'+ streamId).remove();
	streamData[streamId].subscriber = null;
	streamData[streamId].status = 'inactive';
	setMummyInactive(stream);
	sortMummies();
}

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
		usernameId = hyphenate(username);
		var permissions = newStreamConnectionData.permissions;
		var availableId = getAvailableId();

		streamData[newStreamId] = {
									stream: newStream,
									status: 'inactive',
									id: availableId,
									subscriber: null
								};
		// check for mummy li before adding new one - mummies in list only removed on connectionDestroyed
		if ( !$('#'+usernameId).length) {
			var newMummy = $('<li/>').attr({id: usernameId, 'class': 'mummy', 'data-id': availableId }).text(username);
			if (permissions === 'moderator') { newMummy.addClass('moderator'); }
			newMummy.appendTo($('#mummies-list'));
			sortMummies(); //also called in activateStream, but not invoked if 5+ active streams
		}
		addSubscriber(newStream);
	},

	streamDestroyed: function(event) {
		// Not currently unsubscribing, as default behaviour should handle that.
		var destroyedStreamId = event.stream.streamId;
		var vacatedId;
		if (streamData[destroyedStreamId]) {
			vacatedId = streamData[destroyedStreamId].id;
			delete streamData[destroyedStreamId];
			// Find stream with max id and put it in the hole - this should reposition things nicely in DOM if no inactive streams
			for (var streamId in streamData) {
				if (streamData[streamId].id === maxId) {
					streamData[streamId].id = vacatedId;
					maxId-- ;
					addSubscriber(streamData[streamId].stream);
				}
			}
		}
	},

	connectionDestroyed: function(event) {
		removeMummy(event);
		sortMummies();
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

session.connect(token);

// NOT NEEDED?
// if < 5 active streams, check for inactive streams and subscribe
// setInterval(function(){
// 	var streamsToAddCount = 5 - activeStreams.length;
// 	if (activeStreams.length < 5 && inactiveStreams.length > 0) {
// 		for (var i=0; i<streamsToAddCount; i++) {
// 			var newStream = inactiveStreams.pop();
// 			if (newStream) activateStream(newStream);
// 		}
// 	}
// },1000);

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
	// find higest active id and collect active streams
	var highestActiveId = 0;
	var activeStreamRefs = [];
	var idsToLoad = [];
	var streamRefsToLoad = [];
	for (var streamId in streamData) {
		if (streamData[streamId].status === 'active') {
			activeStreamRefs.push(streamData[streamId]);
			if (streamData[streamId].id > highestActiveId) {
				highestActiveId = streamData[streamId].id;
			}
		}

	}
	// Collect ids of streams to load. If fewer than 5 left until max, count back from max
	if (highestActiveId <= (maxId - 5 ) ) {
		for (var i=highestActiveId; i < highestActiveId + 5; i++) {
			idsToLoad.push(i + 1);
		}
	}
	else {
		for (var j=maxId; j > maxId - 5; j--) {
			idsToLoad.unshift(j); //unshift to keep ids in asc order
		}
	}
	// gather stream objects to load
	for (var streamId2 in streamData) {
		if (idsToLoad.indexOf(streamData[streamId2].id) !== -1) {
			streamRefsToLoad.push(streamData[streamId2]);
		}
	}
	// wipeDOM/unsubscribe
	activeStreamRefs.forEach(function(streamRef){
		unsubscribe(streamRef.stream);
	});
	// subscribe to new streams, first sort into asc id order
	streamRefsToLoad.sort(sortStreamRefsById);
	streamRefsToLoad.forEach(function(streamRef){
		addSubscriber(streamRef.stream);
	});
});

$('#prevFive').click(function(){
	// find lowest active id and collect active streams
	var lowestActiveId = 9000;
	var activeStreamRefs = [];
	var idsToLoad = [];
	var streamRefsToLoad = [];
	for (var streamId in streamData) {
		if (streamData[streamId].status === 'active') {
			activeStreams.push(streamData[streamId]);
			if (streamData[streamId].id < lowestActiveId) {
				lowestActiveId = streamData[streamId].id;
			}
		}

	}
	// Collect ids of streams to load. If >6, count back 5 from lowestId, else 1-5
	if (lowestActiveId >  5 ) {
		for (var i=lowestActiveId; i > lowestActiveId - 5 ; i--) {
			idsToLoad.unshift(i - 1); //unshift to keep ids in asc order
		}
	}
	else {
		idsToLoad = [1,2,3,4,5];
	}
	// gather stream objects to load
	for (var streamId2 in streamData) {
		if (idsToLoad.indexOf(streamData[streamId2].id) !== -1) {
			streamRefsToLoad.push(streamData[streamId2]);
		}
	}
	// wipeDOM/unsubscribe
	activeStreamRefs.forEach(function(streamRef){
		unsubscribe(streamRef.stream);
	});
	// subscribe to new streams, first sort into asc id order
	streamRefsToLoad.sort(sortStreamRefsById);
	streamRefsToLoad.forEach(function(streamRef){
		addSubscriber(streamRef.stream);
	});
});

$('#getStreamData').click(function(){
	console.log(streamData);
});

$('#getEmptySubscribers').click(function(){
	console.log($('.subscriber:empty'));
	console.log('Empty Subscriber Div length: ',$('.subscriber:empty').length);
});

$('#kill').click(function(){
	var mummyIdToKill = $('.selected').data('id');
	var connectionIdToKill;
	for (var streamId in streamData) {
		if (streamData[streamId].id === mummyIdToKill) {
			connectionIdToKill = streamData[streamId].stream.connection.connectionId;
		}
	}
	session.forceDisconnect(connectionIdToKill, function(err){
		if (err) {
			console.log('Failed to kill conection');
		}
		else {
			console.log('Killed '+ connectionIdToKill);
		}
	});
});

$(document).on('click', '.mummy', function(){
	$('.mummy').removeClass('selected');
	$(this).addClass('selected');
});

