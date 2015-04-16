var fs 			= require('fs');
var server 		= require('./api/server');
var opentok 	= require('./api/opentok');

var mongoose 	= require("mongoose");
var config 		= require("./api/config").db;
var mongodbUri 	= config.dburl;

server.start(function () {

	mongoose.connect(mongodbUri, function() {
		var db = mongoose.connection;

		db.on("error", console.error.bind(console, "connection error"));
		db.once("open", function() {
			console.log("database connection successful");
		});
	});

	// Commented out as I don't think we need to create a new session every time we run the server
	// TODO: if we stick with this, put sessionId in creds. Leave commented out code for other users to generate ID?
	// opentok.createSession({mediaMode:"routed"}, function(err, session) {
	// 	if (err) return console.error(err);
	// 	if (session) {
	// 		fs.writeFile('sessionId.txt', session.sessionId, function(err){
	// 			if (err) console.error(err);
	// 		});
	// 		console.log('Session:');
	// 		console.dir(session);
	// 	}
	// });


	console.log('Server running at:', server.info.uri);
});

