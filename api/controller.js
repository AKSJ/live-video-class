var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
var config 	= require('./config');
var opentok = require('./opentok');
var members = require('./models/members.js');

var permissions = [ 'moderator', 'publisher' ];
module.exports = {

	serveFile: {
		auth: false,
		handler: {
			directory: {
				path: '../public'
			}
		}
	},

	login: {
		 auth: {
			strategy: 'google'
		 },
		 handler: function (request, reply) {
			if (request.auth.isAuthenticated) {

				var gPlus = request.auth.credentials;
				var profile = {
					username 	: gPlus.profile.displayName,
					email 		: gPlus.profile.email,
					picture 	: gPlus.profile.raw.picture,
				};
				console.log('Profile:');
				console.dir(profile);
				// look up in database
				members.search( { query: {"email": profile.email }}, function( error, member ){
					if( error ) {
						console.log( error );
						request.auth.session.clear();
						return reply.redirect( '/login' );
					}
					else {
						console.log('Found member:');
						console.dir(member);
						profile.permissions = member.permissions;
						request.auth.session.clear();
						request.auth.session.set(profile);
						return reply.redirect('/');
					}
				});
			}
			else {
				return reply.redirect('/');
			}
		}
	},

	logout: {
		handler: function (request, reply ){
			request.auth.session.clear();
			return reply.redirect('/login');
		}
	},

	homeView: {
		handler: function (request, reply ){
			var error;
			fs.readFile(Path.join(__dirname, '../sessionId.txt'), {encoding: 'utf-8'}, function(err, sessionId){
				if (err) {
					console.error(err);
					return reply.view('invalidSession', {error:err});
				}
				else {
					var gPlus = request.auth.credentials;

					if( gPlus ) {
						var userPermissions = gPlus.permissions;
						console.log( "Permissions: " + userPermissions);
						if( permissions.indexOf( userPermissions ) === -1 ){
							return reply.view('invalidUser', { error: "You do not have valid permissions" });
						}

						var token = opentok.generateToken(sessionId,({
						  role :       userPermissions,
						  expireTime : (new Date().getTime() / 1000)+ 60*60, // in one hour
						  data :       JSON.stringify( { "username" : gPlus.username, "permissions" : gPlus.permissions } )
						}));
						console.log('Token: ', token);

						if( userPermissions === 'moderator' ) {
							return reply.view('instructor', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: gPlus.username });
						}
						else if( userPermissions === 'publisher'){
							return reply.view('mummies', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: gPlus.username });
						}
					}
					return reply.view('invalidUser', { error: "You are not an authorized user" });
				}
			});
		}
	},
};
