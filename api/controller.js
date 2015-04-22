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

/////////////
// Helpers //
/////////////

// Recursive medthod - simple, slow if many duplicate usernames but they're likely to be uncommon
// Alternative - use regex db query to find all copies of username+n, replace(/username/,''),
// put in array do index of count, if found, increment
var findUniqueUsername = function(username, count, callback) {
	var newUsername;
	if (count > 0) {
		newUsername = username + count;
	}
	else {
		newUsername = username;
	}
	members.findMemberByUsername(newUsername, function(err, member){
		if (err) {
			console.error(err);
			return callback(err);
		}
		else if (member) {
			return findUniqueUsername(username, (count + 1), callback);
		}
		else {
			return callback(null, newUsername);
		}
	});
};

// TODO - add cookie errors the various db steps, for better user feedback
var findOrAddUser = function( request, reply, profile ) {
	// look up in database and if not found, then add to the database as a publisher
	members.findMemberByEmail( profile.email, function( err1, member ){
		console.log('Looking up member');
		if(err1) {
			console.error(err1);
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
			console.log('Member not found, checking for duplicate username');
			findUniqueUsername(profile.username, 0, function(err3, uniqueUsername){
				if (err3) {
					console.error(err3);
					console.log('Failed to find unique username');
					request.auth.session.clear();
					return reply.redirect( '/loggedout' );
				}
				else if (uniqueUsername) {
					var newMember = {
					username: uniqueUsername,
					email: profile.email,
					permissions: 'publisher'
					};
					members.addMember(newMember, function(err4, newMember){
						if (err4) {
							console.error(err4);
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
				else { //This step should never be reached. Redundant?

				}
			});
			// TODO if duplicate found, add number to username.
			// Method: var count = 1, if dupe found, search for username+count,
			// If not found, as newUser as username+count
			// If found, add 1 to count, try again....
		}
	});
};

////////////////////
// Route Handlers //
////////////////////

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
					email 		: gPlus.profile.email,
					error 		: null
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
					email 		: fb.profile.email,
					error 		: null
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
						request.auth.session.set('error', null);
						if( userPermissions === 'moderator' ) {
							return reply.view('instructor', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
						}
						else if( userPermissions === 'publisher'){
							return reply.view('mummies', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
						}
						else if( userPermissions === 'administrator' ){
							members.findAll( function( err, members ) {
								if (err) {
									error = (error ? error + '\n'+err : error = err);
									if (request.auth.credentials.error) request.auth.session.set('error', null);
									return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
								else if (members) {
									console.dir( members );
									if (request.auth.credentials.error) request.auth.session.set('error', null);
									return reply.view( 'admin_panel', { members: members, apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
								else {
									error = ( error ? error + '\nMembers not found' : 'Members not found');
									if (request.auth.credentials.error) request.auth.session.set('error', null);
									return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
								}
							});
						}
						else{
							request.auth.session.set( 'error', 'Your user permissions are invalid: ' + userPermissions );
						}
					}
				}
			}
			else {
				console.log( 'You are not authorised');

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
											console.error( error );
											request.auth.session.set('error', error); //TODO don't pass raw errors to user
											return request.redirect('/');
										}
										else {
											// update credentials if current user has had permissions changed
											var creds = request.auth.credentials;
											if( creds.username === data.username ) {
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
