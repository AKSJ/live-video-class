// Initialize an OpenTok Session object
var session = TB.initSession(sessionId);

// Initialize a Publisher, and place it into the element with id="publisher"
var publisher = TB.initPublisher(apiKey, 'publisher');

var streamCount = 0;
var activeStreams = [];

// Attach event handlers
session.on({

	// This function runs when session.connect() asynchronously completes
	sessionConnected: function(event) {
		// Publish the publisher we initialzed earlier (this will trigger 'streamCreated' on other
		// clients)
		session.publish(publisher);
	},

	// This function runs when another client publishes a stream (eg. session.publish())
	streamCreated: function(event) {
		// Create a container for a new Subscriber, assign it an id using the streamId, put it inside
		// the element with id="subscriber"+count.
		// Ignore 6th or subsequent streams (for now) TODO: Stick the ids in an array to switch to later?
		console.log(event);
		var subContainer = document.createElement('div');
		if (streamCount < 5) {
			streamCount++;
			activeStreams.push(event.stream.streamId);
			subContainer.id = 'stream-' + event.stream.streamId;
			document.getElementById('subscriber' + streamCount).appendChild(subContainer);
		}
		// Subscribe to the stream that caused this event, put it inside the container we just made
		session.subscribe(event.stream, subContainer);
	},

	streamDestoyed: function(event) {
		//Check if stream is currently displayed, if so remove from DOM and adjust count/activeStreams
		// Not currently unsubscribing, as defualt behaviour should handle that.
		var streamId = event.stream.streamId;
		var streamIndex = activeStreams.indexOf(streamId);
		if (streamIndex !== -1) {
			$('#stream-'+streamId).remove(function(){
				streamCount--;
				activeStreams.splice(streamIndex,1);
			});
		}
	}

});

// Connect to the Session using the 'apiKey' of the application and a 'token' for permission
session.connect(apiKey, token);

$('#stopStream').click(function(){
	session.unpublish(publisher);
});

$('#startStream').click(function(){
	session.publish(publisher);
});

