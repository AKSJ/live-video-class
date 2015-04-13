var Hapi 	= require('hapi');
var Bell 	= require('bell');
var Cookie 	= require('hapi-auth-cookie');
var Path 	= require('path');
var routes 	= require('./routes.js');
var config 	= require('./config.js');

var host = 'localhost';
if (process.env.PORT) host = '0.0.0.0';
var serverOptions 	= {port: (process.env.PORT || 3000 ), host: host };

var goodOptions = {
	opsInterval: 1000,
	reporters: [{
		reporter: require('good-console'),
		args:[{ log: '*', error: '*'}]
	}]
};

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

	server.auth.strategy('session', 'cookie',{
		password: config.cookie.password,
		cookie: 'sid',
		redirectTo: '/',
		redirectOnTry: false,
		isSecure: false
	});

	server.auth.strategy('google', 'bell', {
		provider: 'google',
		password: config.google.secret,
		isSecure: false,
		clientId: config.google.cKey,
		clientSecret: config.google.cSecret
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

server.register({
	register: require('good'),
	options: goodOptions
}, function (err) { if (err) console.error(err); });

module.exports = server;




