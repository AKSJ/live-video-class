var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
var opentok = require('./opentok');
var members = require('./models/members.js');


var config 	= require('./config');
var sessionId = config.openTok.sessionId;
var apiKey 	= config.openTok.key;
var permissionsList = { 'moderator': 'moderator', 'publisher': 'publisher', 'administrator': 'publisher' };

/////////////
// Helpers //
/////////////

var findUniqueUsername = function(username, callback) {
	var usernameRegex = new RegExp(username);
	members.findMembersByUsername(usernameRegex, function(err, membersArray){
		if (err) {
			console.error(err);
			return callback(err);
		}
		else {
			var usernames = [];
			membersArray.forEach(function(memberObject){
				usernames.push(memberObject.username);
			});
			console.dir(usernames);
			if (usernames.length === 0 || usernames.indexOf(username) === -1) {
				console.log('Username available');
				return callback (null, username);
			}
			else {
				console.log('Iterating to find free username');
				for (var i = 1; i < usernames.length+5; i++) {
					var newUsername = username + ' - ' + i;
					if (usernames.indexOf(newUsername) === -1) {
						console.log('available username: ', newUsername);
						return callback(null, newUsername);
					}
					else {
						if (i === usernames.length+4) {
							return callback('findUniqueUsername() failed in operation');
						}
					}
				}
			}
		}
	});
};

// TODO - add cookie errors the various db steps, for better user feedback
// TODO - look up user by username rather than email, as usernames are now unique
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
			findUniqueUsername(profile.username, function(err3, uniqueUsername){
				if (err3) {
					console.error(err3);
					console.error('Failed to find unique username');
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
							console.error('Failed to add new member');
							request.auth.session.clear();
							return reply.redirect( '/loggedout' );
						}
						else {
							console.log('New member added to db');
							console.dir(newMember);
							profile.permissions = newMember.permissions;
							profile.username = newMember.username;
							request.auth.session.clear();
							request.auth.session.set(profile);
							return reply.redirect('/');
						}
					});
				}
				else { //This step should never be reached. Redundant?
					console.error('findUniqueUsername failed to return a string');
					request.auth.session.clear();
					return reply.redirect( '/loggedout' );
				}
			});
		}
	});
};

generateToken = function( credentials ){
	var username = credentials.username;
	var userPermissions = credentials.permissions;
	var tokBoxRole = permissionsList[userPermissions];
	console.log( 'Username: ' + username );
	console.log( 'Email: ' + credentials.email );
	console.log( 'Permissions: ' + userPermissions);
	console.log( 'TokBox Role: ' + tokBoxRole );
	var token = opentok.generateToken(sessionId,({
		role : 			tokBoxRole,
		expireTime : 	(new Date().getTime() / 1000)+ 60*180, // in 3 hours
		data : 			JSON.stringify( { 'username' : username, 'permissions' : userPermissions, role: tokBoxRole } )
	}));
	console.log('Token: ', token);
	return token;
};

generateAdminView = function( request, reply, aToken, error ) {
	var credentials = request.auth.credentials;
	var username = credentials.username;
	var userPermissions = credentials.permissions;
	var tokBoxRole = permissionsList[userPermissions];
	var token = ( aToken ) ? aToken : generateToken( credentials );
	members.findAll( function( err, members ) {
		if (err) {
			error = error ? error + '\n'+err : err;
			return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
		}
		else if (members) {
			console.dir( members );
			return reply.view( 'admin_panel', { members: members, apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
		}
		else {
			error = error ? error + '\nMembers not found' : 'Members not found';
			return reply.view( 'admin_panel', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error});
		}
	});
};

clientView = function( request, reply ) {
	var credentials = request.auth.credentials;
	var username = credentials.username;
	var userPermissions = credentials.permissions;
	var tokBoxRole = permissionsList[userPermissions];

	var error = credentials.error ? credentials.error : null;
	request.auth.session.set('error', null);

	var token = generateToken( credentials );

	if( userPermissions === 'moderator' ) {
		return reply.view('instructor', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
	}
	else if( userPermissions === 'publisher'){
		return reply.view('mummies', {apiKey: apiKey, sessionId: sessionId, token: token, permissions: userPermissions, role: tokBoxRole, username: username, error: error });
	}
	else if( userPermissions === 'administrator' ){
		return generateAdminView( request, reply, token, error );
	}
	else{
		request.auth.session.set( 'error', 'Your user permissions are invalid: ' + userPermissions );
	}
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
	// loginGoogle: {
	// 	 auth: {
	// 		strategy: 'google'
	// 	 },
	// 	 handler: function (request, reply) {
	// 		if (request.auth.isAuthenticated) {
	// 			var gPlus = request.auth.credentials;
	// 			console.dir(gPlus);
	// 			var username = gPlus.profile.displayName || gPlus.profile.email.replace(/[^\w]/g,'') + (Math.random()*100).toFixed(0);
	// 			var profile = {
	// 				username 	: username,
	// 				email 		: gPlus.profile.email,
	// 				error 		: null
	// 			};
	// 			console.log('Profile:');
	// 			console.dir(profile);
	// 			return findOrAddUser( request, reply, profile );
	// 		}
	// 		else {
	// 			return reply.redirect('/loggedout');
	// 		}
	// 	}
	// },

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
					var userPermissions = creds.permissions;
					if ( !permissionsList.hasOwnProperty(userPermissions) ) {
						return reply.view('invalidUser', { error: 'You do not have valid permissions' });
					}
					else {
						return clientView( request, reply );
					}
				}
				else {
					return reply.view( 'invalidUser', { error: 'Your do not have the correct credentials.'});
				}
			}
			else {
				console.log( 'You are not authorised');
				return reply.view('invalidUser', { error: 'You are not an authorised user.' });
			}
		}
	},

	// api routes:
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
											return reply( 'Error updating member');
										}
										else {
											// update credentials if current user has had permissions changed
											var creds = request.auth.credentials;
											if( creds.username === data.username ) {
												request.auth.session.set('permissions', data.permissions);
												return reply('Updated administrator. ');
											}
											else {
												return reply('Updated user: ' + data.username );
											}
										}
								  });
		}
	}
};
