var server 		= require('./api/server');
var opentok 	= require('./api/opentok');

// var mongoose 	= require("mongoose");
// var config 		= require("./api/config").db;
// var mongodbUri 	= "mongodb://" + config.dbuser + ":" + config.dbpwd + "@" + config.dburl;

server.start(function () {

	// mongoose.connect(mongodbUri, function() {
	// 	var db = mongoose.connection;

	// 	db.on("error", console.error.bind(console, "connection error"));
	// 	db.once("open", function() {
	// 		console.log("database connection successful");
	// 	});
	// });

	opentok.createSession({mediaMode:"routed"}, function(err, session) {
		if (err) return console.error(err);
		if (session) console.dir(session);
	});


	console.log('Server running at:', server.info.uri);
});
