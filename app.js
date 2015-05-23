var server 		= require('./api/server');

// only needed if generating sessionIds on the fly.
// var opentok 	= require('./api/opentok');

// var mongoose 	= require("mongoose");
// var config 		= require("./api/config").db;
// var mongodbUri 	= config.dburl;

server.start(function () {

	// NOT CURRENTLY USING MONGODB
	// Keeping code for future logging etc.
	// mongoose.connect(mongodbUri, function() {
	// 	var db = mongoose.connection;

	// 	db.on("error", console.error.bind(console, "connection error"));
	// 	db.once("open", function() {
	// 		console.log("database connection successful");
	// 	});
	// });

	console.log('Server running at:', server.info.uri, ':', server.info.port);

	if (process.env.PORT) {
		console.log('process.env.PORT detected.' +
					'\ncookies isSecure = true' +
					'\nhttp requests redirected to https');
	}
});

