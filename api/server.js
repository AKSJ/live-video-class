var Hapi 	= require('hapi');
var Cookie 	= require('hapi-auth-cookie');
var Bell 	= require('bell');
var Path 	= require('path');
var routes 	= require('./routes');
var config 	= require('./config');

// var host = 'localhost';
// if (process.env.PORT) host = '0.0.0.0';
var serverOptions 	= {port: (process.env.PORT || 3000 ), host: '0.0.0.0' }; // or host: host

var server = new Hapi.Server({
	connections: {
		routes: {
			files: {
				relativeTo: Path.join(__dirname, '../public')
			}
		}
	}
});


server.connection(serverOptions);

server.register([Bell, Cookie], function (err) {
	if (err) console.error(err);

	server.auth.strategy('google', 'bell', {
		provider: 'google',
		password: config.google.secret,
		isSecure: true,
		clientId: config.google.cKey,
		clientSecret: config.google.cSecret
	});

	server.auth.strategy('session', 'cookie',{
		password: config.cookie.password,
		cookie: 'MM_api',
		redirectOnTry: false,
		isSecure: true,
		ttl: 1000 * 60 * 60 * 2 // 2 hours
	});

	server.views({
		engines: {
			jade: require("jade")
		},
		compileOptions: {
			pretty: true
		},
		relativeTo: __dirname,
		path: 	'./views',
		isCached: false
	});

	server.auth.default('session');
	server.route(routes);
});

// GOOD error reporting
var goodOptions = {
	// opsInterval: 60 * 1000,
	reporters: [{
		reporter: require('good-console'),
		events: {log: '*', error: '*', response: '*'}
	}]
};

server.register({
	register: require('good'),
	options: goodOptions
}, function (err) { if (err) console.error(err); });


module.exports = server;

