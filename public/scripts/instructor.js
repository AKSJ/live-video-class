// NB - Currently (sometimes) getting a dev console error 'cannnot read property 'videoWidth of null' on unpublish
// This may be a bug, code seems okay as far as I can tell. See: http://webcache.googleusercontent.com/search?q=cache:EEXBFdO8mQsJ:https://forums.tokbox.com/bugs/cannot-read-property-videowidth-of-null-error-t45250+&cd=1&hl=en&ct=clnk&gl=uk

// TODO Create client list (where on page?) with forceDisconnect buttons. Audio Focus?

// Initialize an OpenTok Session object
var session = OT.initSession(apiKey,sessionId);
console.log("Token: " + token );
console.log("SessionId: " + sessionId );
console.log("Username: " + username );
console.log("Permissions: " + permissions );

// Initialize a Publisher, and place it into the element with id="publisher"
var publisher = OT.initPublisher('publisher', {"name": username, width: '100%', height: '100%', style: {nameDisplayMode: "on"}});

// store all incoming streams in 'streams'. Add an object with property name of stream id:
// streamId:{	stream: {},
// 				status: 'active',
// 				id: 1,
// 				subscriber: {}
// 			}
var streamData = {};
var maxId = 0;

function findMissingId() {
	var currentIds = [];
	var maxRange = [];
	for (var stream in streamData) {
		currentIds.push(stream.id);
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
// recursive function to patch holes in our ids
// Not using now :(   Must find a use!
function rationaliseIds() {
	var missingId = findMissingId();
	if (missingId) {
		for (var stream in streamData) {
			if (stream.id > missingId) {
				stream.id = stream.id -1;
			}
		}
		rationaliseIds();
	}
}

function activateStream(stream) {
	var streamId = stream.streamId;
	streamData[streamId].status = 'active';
	var subContainerId = 'stream-' + streamId;
	$('<div/>').attr('id',subContainerId).appendTo($('.subscriber:empty'));
	streamData[streamId].subscriber = session.subscribe(stream, subContainerId, {width: '100%', height: '100%', style: {nameDisplayMode: 'on'}});
}


function addSubscriber(stream) {
	if ($('.subscriber:empty').length > 0) {
		activateStream(stream);
	}
}

function unsubscribe(stream){
	var streamId = stream.stream.streamId;
	$('stream-'+ streamId).remove();
	session.unsubscribe(stream.subscriber);
	streamData[streamId].subscriber = null;
	streamData[streamId].status = 'inactive';
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

		streamData[newStreamId] = {
									stream: newStream,
									status: 'inactive',
									id: getAvailableId(),
									subscriber: null
								};
		// addSubscriber checks for space in DOM
		addSubscriber(newStream);
	},

	streamDestroyed: function(event) {
		// Not currently unsubscribing, as default behaviour should handle that.
		var destroyedStreamId = event.stream.streamId;
		var vacatedId;
		if (streamData[destroyedStreamId]) {
			vacatedId = streamData[destroyedStreamId].id;
			delete streamData[destroyedStreamId];
			// Find stream with max id and put it in the hole - this should repostion things nicely in DOM if no inactive streams
			for (var stream in streamData) {
				if (stream.id === maxId) { //could actaully check for highest id?
					stream.id = vacatedId;
					maxId-- ;
					addSubscriber(stream);
				}
			}
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
	var activeStreams = [];
	var idsToLoad = [];
	var streamsToLoad = [];
	for (var stream in streamData) {
		if (stream.status === 'active') {
			activeStreams.push(stream);
		}
		if (stream.status === 'active' && stream.id > highestActiveId) {
			highestActiveId = stream.id;
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
			idsToLoad.unshift(j);
		}
	}
	// gather stream objects to load
	for (var stream2 in streamData) {
		if (idsToLoad.indexOf(stream2.id) !== -1) {
			streamsToLoad.push(stream2);
		}
	}
	// wipeDOM/unsubscribe
	activeStreams.forEach(function(stream){
		unsubscribe(stream);
	});
	// subscribe to new streams
	streamsToLoad.forEach(function(stream){
		addSubscriber(stream);
	});
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

