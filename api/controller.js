// var fs 		= require('fs');
var url		= require('url');
// var Path 	= require('path');
// var Joi 	= require('joi');
// var members = require('./models/members.js');
var opentok = require('./opentok');
var MM 		= require('./memberMouse.js');

var config 		= require('./config');
var sessionId 	= config.openTok.sessionId;
var apiKey 		= config.openTok.key;

/////////////
// Helpers //
/////////////

function  generateToken(credentials) {
	var email 			= credentials.email;
	var username 		= credentials.username;
	var displayName 	= credentials.firstName + ' ' + credentials.lastName;
	var membershipLevel = credentials.membershipLevel;
	var tokBoxRole 		= (membershipLevel === 'Instructor') ? 'moderator' : 'publisher';
	console.log( 'Token Generated:', '\nEmail: ' + email, '\nUsername: ' + username, '\nDisplayName: ' + displayName, '\nMembershipLevel: ' + membershipLevel, '\nTokBox Role: ' + tokBoxRole );

	var token = opentok.generateToken(sessionId,({
		role : 			tokBoxRole,
		expireTime : 	(new Date().getTime() / 1000)+ 60*180, // in 3 hours
		data : 			JSON.stringify( { email: email, 'username' : username, displayName : displayName, 'membershipLevel' : membershipLevel, role: tokBoxRole } )
	}));
	// console.log('Token: ', token);
	return token;
}

// auth cookie should be set before calling serveView()
function serveView(request, reply) {
	// check for auth cookie
	if (request.auth.isAuthenticated) {
		var creds = request.auth.credentials;
		// check if membership not 'Active'
		if (creds.membershipStatus !== 'Active' ) {
			// reply 'Membership Expired'
			return reply.view('invalidUser', { error: 'Your membership has expired' });
		}
		else {
			// generate TokBox token,
			var token = generateToken(creds);
			// assemble local variables for view template
			var locals = {	apiKey: apiKey,
							sessionId: sessionId,
							token: token,
							membershipLevel: creds.membershipLevel,
							role: (creds.membershipLevel === 'Instructor') ? 'moderator' : 'publisher',
							username: creds.username,
							displayName: creds.firstName + ' ' + creds.lastName,
						};

			// check for Instructor membership level
			if (creds.membershipLevel === 'Instructor') {
				return reply.view('instructor', locals);
			}
			// check for Administrator membership level
			else if (creds.membershipLevel === 'Administrator') {
				// TODO --ADMIN VIEW---
				// currently, just client!
				return reply.view('mummies', locals);
			}
			else {
				return reply.view('mummies', locals);
			}
		}
	}
	// no auth cookie - fallback, shouldn't happen
	else {
		return reply.view('invalidUser', { error: 'Server error: serveView() failed' });
	}
}

function checkMemberMouse(userEmail, request, reply) {
	MM.getMember(userEmail, function(err, statusCode, memberData){
		if (err) {
			// query string token preserved so client brower refresh possible
			return reply.view('invalidUser', { error: 'Error contacting membership server.\nPlease refresh the page to retry.' });
		}
		else if ( statusCode === '200' && memberData) {
			// set auth cookie
			var profile = {
				membershipStatus: memberData.status_name,
				membershipLevel: memberData.membership_level_name,
				firstName: memberData.first_name,
				lastName: memberData.last_name,
				username: memberData.username,
				email: memberData.email
			};
			request.auth.session.clear();
			request.auth.session.set(profile);
			console.log(profile);
			console.log(request.auth.credentials);
			// NB Calling serveView directly here failed as cookie not yet fully set (async issue?)
			// Hence, redirect: (also, removes query string from browser URL)
			reply.redirect('/');
		}
		else {
			request.auth.session.clear(); //???? not needed?
			return reply.view('invalidUser', { error: 'Member not found' });
		}
	});
}


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

	// NB Keeping logout/logged out for the moment. But, could remove.
	loggedoutView: {
		auth: false,
		handler: function (request, reply) {
			return reply.view('loggedout');
		}
	},

	logout: {
		handler: function (request, reply){
			request.auth.session.clear();
			return reply.redirect('/loggedout');
		}
	},

	// TODO: add custom views for the various login failures
	homeView: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			console.log('Referer: ',request.headers.referer);
			var urlObject = url.parse(request.url, true);
			console.dir(urlObject);
			// Check if auth cookie already set
			if (request.auth.isAuthenticated) {
				console.log('Auth Cookie Found');
				// NB Redirect to '/' in order to strip token from user visible url in browser bar
				// Looks better, and will discourage bookmarking.
				if (Object.keys(urlObject.query).length > 0) {
					// first check if different user is trying to log in
					if (urlObject.query.hasOwnProperty('token') ) {
						var currentUserEmail = request.auth.credentials.email;
						var newUserEmail = new Buffer(urlObject.query.token, 'base64');
						newUserEmail = newUserEmail.toString('utf8');
						// if different user login attempted, clear session and start again
						if (newUserEmail !== currentUserEmail) {
							request.auth.session.clear(); //? redundant?
							checkMemberMouse(newUserEmail, request, reply);
						}
						else {
							reply.redirect('/');
						}
					}
					else {
						reply.redirect('/');
					}
				}
				else {
					serveView(request, reply);
				}
			}
			else {
				console.log('Auth Cookie NOT Found');
				if (!urlObject.query.hasOwnProperty('token') ) {
					console.error('No query string token found');
					return reply.view('invalidUser', { error: 'Please return to Mummy Workouts and retry the join class button.' });
				}
				else if (urlObject.query.hasOwnProperty('token') ) {
					// get user token from qs (Member Mouse email)
					var token = urlObject.query.token;
					console.log('Encoded user token: ', token);
					// NB no need to URL decode - hapi does it automatically
					var userEmail = new Buffer(token, 'base64');
					userEmail = userEmail.toString('utf8');
					console.log('Decoded user token: ', userEmail);

					// make MM API call to check for member
					checkMemberMouse(userEmail, request, reply);
				}
				else {
					// fallback
					console.error('homeView failed');
					return reply.view('invalidUser', { error: 'Login failed.\nPlease return to Mummy Workouts to try again.' });
				}
			}
		}
	}
};
