var fs 		= require('fs');
var url		= require('url');
var Path 	= require('path');
// var Joi 	= require('joi');
var opentok = require('./opentok');
var members = require('./models/members.js');
var MM 		= require('./memberMouse.js');

var config 		= require('./config');
var sessionId 	= config.openTok.sessionId;
var apiKey 		= config.openTok.key;

/////////////
// Helpers //
/////////////

function  generateToken(credentials) {
	var username = credentials.username;
	var displayName = credentials.firstName + ' ' + credentials.lastName;
	var membershipLevel = credentials.membershipLevel;
	var tokBoxRole = (membershipLevel === 'Instructor') ? 'moderator' : 'publisher';
	console.log( 'Username: ' + username );
	console.log( 'DisplayName: ' + displayName );
	console.log( 'MembershipLevel: ' + membershipLevel);
	console.log( 'TokBox Role: ' + tokBoxRole );
	var token = opentok.generateToken(sessionId,({
		role : 			tokBoxRole,
		expireTime : 	(new Date().getTime() / 1000)+ 60*180, // in 3 hours
		data : 			JSON.stringify( { 'username' : username, displayName : displayName, 'membershipLevel' : membershipLevel, role: tokBoxRole } )
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

	// still needed?
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

	// TODO: add custom views for the various login failures/ loggedout
	homeView: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			// console.dir(request);
			console.log('Referer: ',request.headers.referer);
			var urlObject = url.parse(request.url, true);
			console.dir(urlObject);
			// Check if auth cookie already set
			if (request.auth.isAuthenticated) {
				console.log('Auth Cookie Found');
				if (Object.keys(urlObject.query).length > 0) {
					reply.redirect('/');
				}
				else {
					serveView(request, reply);
				}
			}
			else {
				console.log('Auth Cookie NOT Found');


				var referer = request.headers.referer;
				// NB Currently checking referer header for, mostly to try and ensure people are usimg link from MW, not a bookmark
				// This is NOT SECURE. Needs testing to ensure not broken by people turing off header in browser
				if (/*!/mummyworkouts\.com/.test(referer) || */ !urlObject.hasOwnProperty('query')) {
					//reply 'fail' Error message? 'Please use link from mummy workouts, link'
					return reply.view('invalidUser', { error: 'Please return to Mummy Workouts and retry the join class button.' });
				}
				else if (/*/mummyworkouts\.com/.test(referer) &&*/ urlObject.query.hasOwnProperty('token') ) {
					// get user token from qs (Member Mouse email)
					var token = urlObject.query.token;
					console.log('Encoded user token: ', token);
					// NB no need to URL decode - hapi does it automatically
					var userEmail = new Buffer(token, 'base64');
					userEmail = userEmail.toString('utf8');
					console.log('Decoded user token: ', userEmail);

					// make MM API call to check for member
					MM.getMember(userEmail, function(err, statusCode, memberData){
						if (err) {
							// reply error view - error contacting server, retry
							return reply.view('invalidUser', { error: 'Error contacting membership server.\nPlease refresh the page' });
						}
						else if ( (statusCode === '200' /*|| statusCode === '409'*/) && memberData) { //string???
							// if member - set cookie
							var profile = {
								membershipStatus: memberData.status_name,
								membershipLevel: memberData.membership_level_name,
								firstName: memberData.first_name,
								lastName: memberData.last_name,
								username: memberData.username
							};
							request.auth.session.clear();
							request.auth.session.set(profile);
							console.log(profile);
							console.log(request.auth.credentials);
							// NB Calling serveView directly here failed as cookie not yet fully set (async issue?)
							// Hence, redirect:
							reply.redirect('/');
						}
						else {
							request.auth.session.clear(); //????
							// reply error view - member not found
							return reply.view('invalidUser', { error: 'Member not found' });
						}

					});
				}
				else {
					console.error('homeView failed');
					return reply.view('invalidUser', { error: 'Login failed - invlaid user token or wrong origin.\nPlease return to Mummy Workouts.' });
				}
			}
		}
	}
};
