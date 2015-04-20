var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
var config 	= require('./config');
var opentok = require('./opentok');
var members = require('./models/members.js');

var permissions = { "moderator" : "moderator", "publisher":"publisher", "administrator": "moderator" };
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
				console.dir(gPlus);
				var username = gPlus.profile.displayName || gPlus.profile.email.replace(/@.+/,'') + (Math.random()*100).toFixed(0);
				var profile = {
					username 	: username,
					email 		: gPlus.profile.email,
					picture 	: gPlus.profile.raw.picture,
				};
				request.auth.session.clear();
				request.auth.session.set(profile);
				console.log('Profile:');
				console.dir(profile);
				// look up in database
				members.findMemberByEmail( profile.email, function( error, member ){
					console.log('Looking up member');
					if( error ) {
						console.error( error );
						request.auth.session.clear();
						return reply.redirect( '/login' );
					}
					else if (member) {
						console.log('Found member:');
						console.dir(member);
						profile.permissions = member.permissions;
						request.auth.session.clear();
						request.auth.session.set(profile);
						return reply.redirect('/');
					}
					else {
						console.log('Member not found, adding to db');
						var newMember = {
							username: profile.username,
							email: profile.email,
							permissions: 'publisher'
						};
						members.addMember(newMember, function(err, member){
							if (err) {
								console.error(err);
								console.log('Failed to add new member');
								request.auth.session.clear();
								return reply.redirect( '/login' );
							}
							else {
								console.log('New member added to db');
								console.dir(member);
								profile.permissions = member.permissions;
								request.auth.session.clear();
								request.auth.session.set(profile);
								return reply.redirect('/');
							}
						});
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
						console.log( "TokBox Role: " + permissions[ userPermissions]);
						if( permissions[ userPermissions ] === undefined ){
							return reply.view('invalidUser', { error: "You do not have valid permissions" });
						}

						var token = opentok.generateToken(sessionId,({
						  role :       permissions[userPermissions ],
						  expireTime : (new Date().getTime() / 1000)+ 60*60, // in one hour
						  data :       JSON.stringify( { "username" : gPlus.username, "permissions" : userPermissions } )
						}));
						console.log('Token: ', token);

						if( userPermissions === 'moderator' ) {
							return reply.view('instructor', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: gPlus.username });
						}
						else if( userPermissions === 'publisher'){
							return reply.view('mummies', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: gPlus.username });
						}
						else if( userPermissions === 'administrator' ){
							members.findAll( function( err, members ) {
								console.dir( members );
								return reply.view( 'admin_panel', {apiKey: config.openTok.key, members: members, sessionId: sessionId, token: token, permissions: permissions, username:gPlus.username});
							});
						}
					}
					else{
						return reply.view('invalidUser', { error: "You are not an authorized user" });
					}
				}
			});
		}
	},

	memberUpdate  : {
		handler : function( request, reply ) {
			var alert;
			var data = request.payload.data;
			members.updateMember( { query: { username: data.username, email: data.email },
									update: {permissions: data.permissions }
								  }, function( error, result ) {
										if( error ) {
											console.log( error );


											return reply.view( 'admin_panel', { apiKey: config.openTok.key,
													members: members,
													/*sessionId: sessionId,
													token: token,
													permissions: permissions,*/
													username: data.username,
													error : error });
										}
										return reply.redirect("/");
								  });
		}
	}
};
