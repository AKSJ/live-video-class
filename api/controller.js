var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
var opentok = require('./opentok');
var members = require('./models/members.js');

var config 	= require('./config');
var sessionId = config.sessionId;

module.exports = {

	serveFile: {
		auth: false,
		handler: {
			directory: {
				path: '../public'
			}
		}
	},

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
					picture 	: gPlus.profile.raw.picture,
				};
				console.log('Profile:');
				console.dir(profile);
				// look up in database
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
						members.addMember(newMember, function(err, member){
							if (err) {
								console.error(err);
								console.log('Failed to add new member');
								request.auth.session.clear();
								return reply.redirect( '/loggedout' );
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
			// 	var username = fb.profile.displayName || fb.profile.email.replace(/[^\w]/g,'') + (Math.random()*100).toFixed(0);
			// 	var profile = {
			// 		username 	: username,
			// 		email 		: fb.profile.email,
			// 		picture 	: fb.profile.raw.picture,
			// 	};
			// 	console.log('Profile:');
			// 	console.dir(profile);
			// 	// look up in database
			// 	members.findMemberByEmail( profile.email, function( error, member ){
			// 		console.log('Looking up member');
			// 		if( error ) {
			// 			console.error( error );
			// 			request.auth.session.clear();
			// 			return reply.redirect( '/loggedout' );
			// 		}
			// 		else if (member) {
			// 			console.log('Found member:');
			// 			console.dir(member);
			// 			profile.permissions = member.permissions;
			// 			request.auth.session.clear();
			// 			request.auth.session.set(profile);
			// 			return reply.redirect('/');
			// 		}
			// 		else {
			// 			console.log('Member not found, adding to db');
			// 			var newMember = {
			// 				username: profile.username,
			// 				email: profile.email,
			// 				permissions: 'publisher'
			// 			};
			// 			members.addMember(newMember, function(err, member){
			// 				if (err) {
			// 					console.error(err);
			// 					console.log('Failed to add new member');
			// 					request.auth.session.clear();
			// 					return reply.redirect( '/loggedout' );
			// 				}
			// 				else {
			// 					console.log('New member added to db');
			// 					console.dir(member);
			// 					profile.permissions = member.permissions;
			// 					request.auth.session.clear();
			// 					request.auth.session.set(profile);
			// 					return reply.redirect('/');
			// 				}
			// 			});
			// 		}
			// 	});
			// }
			// else {
			// 	return reply.redirect('/loggedout');
			// }
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
				if( creds ) {
					var userPermissions = creds.permissions;
					if( permissions !== 'moderator' || permissions !== 'publisher'){
						return reply.view('invalidUser', { error: 'You do not have valid permissions' });
					}

					var token = opentok.generateToken(sessionId,({
					  role :       userPermissions,
					  expireTime : (new Date().getTime() / 1000)+ 60*180, // in three hours
					  data :       JSON.stringify( { 'username' : creds.username, 'permissions' : creds.permissions } )
					}));
					console.log( 'Permissions: ' + userPermissions);
					console.log('Token: ', token);
					if( userPermissions === 'moderator' ) {
						return reply.view('instructor', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: creds.username });
					}
					else if( userPermissions === 'publisher'){
						return reply.view('mummies', {apiKey: config.openTok.key, sessionId: sessionId, token: token, permissions: permissions, username: creds.username });
					}
				}
			}
			else {
				return reply.view('invalidUser', { error: 'You are not an authorised user.' });
			}
		}
	},
};
