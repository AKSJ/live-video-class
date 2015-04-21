var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
var opentok = require('./opentok');
var members = require('./models/members.js');


var config 	= require('./config');
var sessionId = config.openTok.sessionId;
var apiKey 	= config.openTok.key;
var permissionsList = { 'moderator' : 'moderator', 'publisher':'publisher', 'administrator': 'moderator' };

findOrAddUser = function( request, reply, profile ) {
	// look up in database and if not found, then add to the database as a publisher
	members.findMemberByEmail( profile.email, function( error, member ){
		console.log('Looking up member');
		if( error ) {
			console.error( error );
			request.auth.session.clear();
			return reply.redirect( '/loggedout' );
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
			members.addMember(newMember, function(err, newMember){
				if (err) {
					console.error(err);
					console.log('Failed to add new member');
					request.auth.session.clear();
					return reply.redirect( '/loggedout' );
				}
				else {
					console.log('New member added to db');
					console.dir(newMember);
					profile.permissions = newMember.permissions;
					request.auth.session.clear();
					request.auth.session.set(profile);
					return reply.redirect('/');
				}
			});
		}
	});
};
module.exports = {

	serveFile: {
		auth: false,
		handler: {
			directory: {
				path: '../public'
			}
		}
	},

// TODO remove google auth and route etc. for production.
	loginGoogle: {
		 auth: {
			strategy: 'google'
		 },
		 handler: function (request, reply) {
			if (request.auth.isAuthenticated) {
				var gPlus = request.auth.credentials;
				console.dir(gPlus);
				var username = gPlus.profile.displayName || gPlus.profile.email.replace(/[^\w]/g,'') + (Math.random()*100).toFixed(0);
				var profile = {
					username 	: username,
					email 		: gPlus.profile.email
				};
				console.log('Profile:');
				console.dir(profile);
				return findOrAddUser( request, reply, profile );
			}
			else {
				return reply.redirect('/loggedout');
			}
		}
	},

	loginFacebook: {
		 auth: {
			strategy: 'facebook'
		 },
		 handler: function (request, reply) {
			if (request.auth.isAuthenticated) {
				var fb = request.auth.credentials;
				console.dir(fb);
				var username = fb.profile.displayName || fb.profile.email.replace(/[^\w]/g,'') + (Math.random()*100).toFixed(0);
				var profile = {
					username 	: username,
					email 		: fb.profile.email
				};
				console.log('Profile:');
				console.dir(profile);
				return findOrAddUser( request, reply, profile );
			}
			else {
				return reply.redirect('/loggedout');
			}
		}
	},

	logout: {
		handler: function (request, reply){
			request.auth.session.clear();
			return reply.redirect('/loggedout');
		}
	},

	loggedoutView: {
		auth: false,
		handler: function (request, reply) {
			return reply.view('loggedout');
		}
	},

	homeView: {
		handler: function (request, reply ){
			// fs.readFile(Path.join(__dirname, '../sessionId.txt'), {encoding: 'utf-8'}, function(err, sessionId){
			// 	if (err) {
			// 		console.error(err);
			// 		return reply.view('invalidSession', {error:err});
			// 	}
			if (request.auth.isAuthenticated) {
				var creds = request.auth.credentials;
				if(creds) {
					var error = null;
					if (creds.error) error = creds.error;
					var username = creds.username;
					var userPermissions = creds.permissions;
					console.log( 'Username: ' + username );
					console.log( 'Permissions: ' + userPermissions);
					console.log( 'TokBox Role: ' + permissionsList[ userPermissions]);
					// if( permissionsList[ userPermissions ] === undefined ){
					if ( !permissionsList.hasOwnProperty(userPermissions) ) {
						return reply.view('invalidUser', { error: 'You do not have valid permissions' });
					}
					else {
						var tokBoxRole = permissionsList[userPermissions];
						var token = opentok.generateToken(sessionId,({
							role : 			tokBoxRole,
							expireTime : 	(new Date().getTime() / 1000)+ 60*180, // in 3 hours
							data : 			JSON.stringify( { 'username' : username, 'permissions' : userPermissions, role: tokBoxRole } )
						}));
						console.log('Token: ', token);
						if( userPermissions === 'moderator' ) {
							return reply.view('instructor', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
						}
						else if( userPermissions === 'publisher'){
							return reply.view('mummies', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
						}
						else if( userPermissions === 'administrator' ){
							members.findAll( function( err, members ) {
								if (err) {
									error = (error ? error += '\n'+err : error = err);
									request.auth.session.set('error', null);
									return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
								else if (members) {
									console.dir( members );
									request.auth.session.set('error', null);
									return reply.view( 'admin_panel', { members: members, apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
								else {
									error = ( error ? error += '\nMembers not found' : 'Members not found');
									request.auth.session.set('error', null);
									return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
							});
						}
					}
				}
			}
			else {
				return reply.view('invalidUser', { error: 'You are not an authorised user.' });
			}
		}
	},

	memberUpdate  : {
		handler : function( request, reply ) {
			// var alert;
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
										else {
											// update credentials if current user has had permissions changed
											var creds = request.auth.credentials;
											if( creds.username === data.username ) {
												// creds.permissions = data.permissions;
												// request.auth.session.clear();
												// ??? Better just to change the permissions field?
												request.auth.session.set('permissions', data.permissions);
												return reply.redirect('/');
											}
											else {
												return reply.redirect('/');
											}
										// return reply.view( 'admin_panel', { apiKey: apiKey,
										// 		members: members,
										// 		sessionId: sessionId,
										// 		token: token,
										// 		permissions: permissions,
										// 		username: data.username, alert: alert });
										}
								  });
		}
	}
};
