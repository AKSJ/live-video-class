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

// NOTES //

// Auth strategy is a little complicated, with 2 cookies involved:
// 1. Yar cookie 'session' used to track results of a call to the Member Mouse API at MW.com. results stored in 'mm_api' key
// 2. Hapi-auth-coookie cookie 'oauth' used to track results of google oauth login

// 1. Currently not secure, needs a time based hash (at least)
// 2. Compared against 'mm_api' to check email addresses match. An additional call to MM API is made to confirm info in 'mm_api' cookie?

// TODO abstract homeView into 3 functions noCookieHandler() mmApiOnlyHandler() bothCookiesHandler()

// TODO
// 1. Are we sending unecessary local vars to templates? Most not needed

/////////////
// Helpers //
/////////////

////////////
// Generate a TokBok token to send to the client
/////////
function  generateToken(cookie) {
	var email 			= cookie.email;
	var username 		= cookie.username;
	var displayName 	= cookie.firstName + ' ' + cookie.lastName;
	var membershipLevel = cookie.membershipLevel;
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

///////////////////////////
// Try and serve client view if mm_api set
// If client is Instructor or Administrator, redirect to google login and retry
//////////////////////////

// yar cookie 'session' should be set before calling serveClientView()
function serveClientView(request, reply) {
	// get yar cookie
	var mm_api = request.session.get('mm_api');
	// check for yar cookie
	if (mm_api) {
		// check if membership not 'Active'
		if (mm_api.membershipStatus !== 'Active' ) {
			// Checking membership status here (rather than homeView) so we can send lapsed users to a specific page.
			return reply.view('invalidUser', { error: 'Your membership has expired' });
		}
		// check for Instructor or Adminstrator membership level
		else if (mm_api.membershipLevel === 'Instructor' || mm_api.membershipLevel === 'Administrator') {
			// FALLBACK - this is accounted for in homeView
			// redirect to google oauth login
			return reply.redirect('/login');
		}
		else {
			// generate TokBox token,
			var token = generateToken(mm_api);
			// assemble local variables for view template
			var locals = {	apiKey: apiKey,
							sessionId: sessionId,
							token: token,
							membershipLevel: mm_api.membershipLevel,
							role: 'publisher',
							username: mm_api.username,
							displayName: mm_api.firstName + ' ' + mm_api.lastName,
						};
			return reply.view('mummies', locals);
		}
	}
	// no yar cookie - fallback, shouldn't happen
	else {
		return reply.view('invalidUser', { error: 'Server error: serveClientView() failed' });
	}
}

//////////////////////
// Try and serve a secure view i.e. instructor or admin
// Make a second MMapi check, to ensure email address in mm_api cookie hasn't been tampered with
///////////////////////

// yar cookie and oauth cookie should be set before calling serveSecureView()
function serveSecureView(request, reply) {
	// get yar cookie
	var mm_api = request.session.get('mm_api');
	// check for yar cookie and auth cookie
	if (mm_api && request.auth.isAuthenticated) {

		if (mm_api.membershipStatus !== 'Active' ) {
			// Checking membership status here (rather than homeView) so we can send lapsed users to a specific page.
			return reply.view('invalidUser', { error: 'Your membership has expired' });
		}
		// check for missing Instructor or Adminstrator membership level
		else if (mm_api.membershipLevel !== 'Instructor' && mm_api.membershipLevel !== 'Administrator') {
			// FALLBACK - this is accounted for in homeView
			// redirect to homeView as client
			request.auth.session.clear();
			return reply.redirect('/');
		}
		else {
			// generate TokBox token,
			var token = generateToken(mm_api);
			// assemble local variables for view template
			var locals = {	apiKey: apiKey,
							sessionId: sessionId,
							token: token,
							membershipLevel: mm_api.membershipLevel,
							role: (mm_api.membershipLevel === 'Instructor') ? 'moderator' : 'publisher',
							username: mm_api.username,
							displayName: mm_api.firstName + ' ' + mm_api.lastName,
						};
			if (mm_api.membershipLevel === 'Instructor') {
				return reply.view('instructor', locals);
			}
			else if (mm_api.membershipLevel === 'Administrator') {
				// NB Admin view currently just client view
				return reply.view('mummies', locals);
			}
		}
	}
	else {
		// fallback - cookies not set
		return reply.view('invalidUser', { error: 'Server error: serveSecureView() failed' });
	}
}

////////////////
// Make a member mouse API call to MW.com to get user data
// Set yar cookie 'mm_api' if found
/////////////////

function setMemberMouseCookie(userEmail, request, reply) {
	MM.getMember(userEmail, function(err, statusCode, memberData){
		if (err) {
			// query string token preserved so client brower refresh possible
			return reply.view('invalidUser', { error: 'Error contacting membership server.\nPlease refresh the page to retry.' });
		}
		else if ( statusCode === '200' && memberData) {
			// set yar cookie 'mm_api' key
			var mmData = {
				membershipStatus: memberData.status_name,
				membershipLevel: memberData.membership_level_name,
				firstName: memberData.first_name,
				lastName: memberData.last_name,
				username: memberData.username,
				email: memberData.email
			};
			request.session.clear('mm_api');
			request.session.set('mm_api', mmData);
			console.log('mm_api cookie set: ', mmData);
			// NB Calling serveClientView directly here failed as cookie not yet fully set? (async issue?)
			// Hence, redirect: (also, removes query string from browser URL)
			reply.redirect('/');
		}
		else {
			request.session.clear('mm_api'); //???? not needed?
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

	// Current plan is to replace out loggedOut/InvalidUser views with redirects to MW.com pages
	// NB - in that event, consider using 'logout' route to do it / clear auth cookie first
	loggedoutView: {
		auth: false,
		handler: function (request, reply) {
			return reply.view('loggedout');
		}
	},

	logout: {
		auth: false,
		handler: function (request, reply){
			// clear yar cookie
			request.session.clear('mm_api');
			// clear oauth cookie
			request.auth.session.clear();
			return reply.redirect('/loggedout');
		}
	},

	loginView: {
		auth: false,
		handler: function (request, reply) {
			var mm_api = request.session.get('mm_api');
			if (mm_api) {
				return reply.view('google', {mmEmail: mm_api.email});
			}
			// loginView shold only be accessed once mm_api set
			else {
				return reply.redirect('/');
			}
		}
	},

	loginGoogle: {
		auth: {
			strategy: 'google'
		 },
		 handler: function (request, reply) {
			if (request.auth.isAuthenticated) {
				var googleCreds = request.auth.credentials;
				console.dir(googleCreds);

				var googleProfile = {
					googleEmail : googleCreds.profile.email
				};

				console.log('Google Profile:');
				console.dir(googleProfile);
				request.auth.session.clear();
				request.auth.session.set(googleProfile);
				return reply.redirect('/');
			}
			else {
				return reply.redirect('/logout');
			}
		}
	},

	// TODO: add custom views for the various login failures
	homeView: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			var urlObject = url.parse(request.url, true);
			// console.dir(urlObject);
			// console.log('Referer: ',request.headers.referer);

			// get mm_api cookie
			var mm_api = request.session.get('mm_api');

			// check if oauth cokkie and mm_api is set
			if (request.auth.isAuthenticated && mm_api) {
				// user has logged in with MW.com link and google oauth
				console.log('mm_api and auth Cookies Found');
				var googleEmail = request.auth.credentials.googleEmail;
				var memberMouseEmail = mm_api.email;
				// check if email addresses match
				if (googleEmail !== memberMouseEmail) {
					// fail! emails don't match
					request.session.clear('mm_api');
					request.auth.session.clear();
					return reply.view('invalidUser', { error: 'Error during secure login. Email addresses do not match.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
				}
				else {
					// email addresses match!
					// make a second MM API query to check googleEmail is still a valid instructor
					// not possbile to check against original values, as they're only record is mm_api, which is what we're fallback checking
					// Reasoning: mm_api cookie could be faked? (DOES THIS MAKE SENSE??)
					MM.getMember(googleEmail, function(err, statusCode, memberData){
						if (err) {
							request.session.clear('mm_api');
							request.auth.session.clear();
							return reply.view('invalidUser', { error: 'Error during secure login. Email verfication failed.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
						}
						else if (statusCode === '200' && memberData) {
							// bools to check contents of MM query with googleEmail still valid for secure view
							var membershipLevelCheck = (memberData.membership_level_name === 'Instructor' || memberData.membership_level_name === 'Administrator') ? true : false;
							if ( membershipLevelCheck ) {
								// attempt to serve Instructor/Administrator view
								serveSecureView(request, reply);
							}
						}
						else {
							// member somehow not found. hax!!
							request.session.clear('mm_api');
							request.auth.session.clear();
							return reply.view('invalidUser', { error: 'Error during secure login. Secondary account verfication failed.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
						}
					});

				}
			}
			// check if only 'mm_api' cookie already set
			else if (mm_api) {
				console.log('mm_api Cookie Found');
				// NB Redirecting to '/' in order to strip token from user visible url in browser bar
				if (Object.keys(urlObject.query).length > 0) {
					// first check if different user is trying to log in
					if (urlObject.query.hasOwnProperty('token') ) {
						var currentUserEmail = mm_api.email;
						var newUserEmail = new Buffer(urlObject.query.token, 'base64');
						newUserEmail = newUserEmail.toString('utf8');
						// if different user login attempted, clear mm_api and start again
						if (newUserEmail !== currentUserEmail) {
							request.session.clear('mm_api'); //? redundant?
							request.auth.session.clear(); // in case trying to change from e.g. instructor to client
							setMemberMouseCookie(newUserEmail, request, reply);
						}
						else {
							// current users email address in query string. No need to reset cookie.
							reply.redirect('/');
						}
					}
					else {
						// unwanted query string data, redirect to strip from URL.
						reply.redirect('/');
					}
				}
				else {
					// url clean and mm_api cookie set.
					if (mm_api.membershipLevel === 'Instructor' || mm_api.membershipLevel === 'Administrator') {
						// user is an Instructor or Admin. Redirect for secure login
						return reply.redirect('/login');
					}
					else {
					// Attempt to serve client view
					serveClientView(request, reply);
					}
				}
			}
			// else no cookies set
			else {
				console.log('mm_api Cookie NOT Found');
				// fail if no query string token and no mm_api cookie
				if (!urlObject.query.hasOwnProperty('token') ) {
					console.error('No query string token found');
					return reply.view('invalidUser', { error: 'Please return to Mummy Workouts and retry the join class button.' });
					// return reply.redirect('http://mummyworkouts.com');
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
					setMemberMouseCookie(userEmail, request, reply);
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
