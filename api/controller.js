// var fs 		= require('fs');
// var Path 	= require('path');
// var Joi 	= require('joi');
// var members = require('./models/members.js');
var url		= require('url');
var opentok = require('./opentok');
var s2m 	= require('./s2member.js');

var config 		= require('./config');
var sessionId 	= config.openTok.sessionId;
var apiKey 		= config.openTok.key;

// NOTES //

// Auth strategy is a little complicated, with 2 cookies involved:
// 1. Yar cookie 'session' used to track results of a call to the Member Mouse API at MW.com. results stored in 's2m_api' key
// 2. Hapi-auth-coookie cookie 'oauth' used to track results of google oauth login

// 1. Currently not secure, needs a time based hash (at least). Consider encrpypting token properly -mcrypt?. Conisder incorporating time based hash INTO encrypted token
// 2. Compared against 's2m_api' to check email addresses match. An additional call to MM API is made to confirm googleEmail is valid secure user



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
	var displayName 	= cookie.displayName;
	var membershipLevel = cookie.membershipLevel;
	var tokBoxRole 		= (membershipLevel === 9) ? 'moderator' : 'publisher';
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
// Try and serve client view if s2m_api set
// If client is Instructor or Administrator, redirect to google login and retry
//////////////////////////

// yar cookie 'session' should be set before calling serveClientView()
function serveClientView(request, reply) {
	console.log('serveClientView() called');
	// get yar cookie
	var s2m_api = request.session.get('s2m_api');
	// check for yar cookie
	if (s2m_api) {
		// check if membership not 'Active'  !!! No longer possible with s2member. Double check...
		// if (false) {
		// 	// Checking membership status here (rather than homeView) so we can send lapsed users to a specific page.
		// 	console.error('serveClientView() failed - membership expired');
		// 	return reply.view('invalidUser', { error: 'Your membership has expired' });
		// }
		// check for Instructor or Adminstrator membership level
		if (s2m_api.membershipLevel === 10 || s2m_api.membershipLevel === 9) {
			// FALLBACK - this is accounted for in homeView
			// redirect to google oauth login
			console.error('serveClientView() failed - wrong membershipLevel. Redirecting to secure login');
			return reply.redirect('/login');
		}
		else {
			// generate TokBox token,
			var token = generateToken(s2m_api);
			// assemble local variables for view template
			var locals = {	apiKey: apiKey,
							sessionId: sessionId,
							token: token,
							membershipLevel: s2m_api.membershipLevel,
							role: 'publisher',
							username: s2m_api.username,
							email: s2m_api.email,
							displayName: s2m_api.displayName,
						};
			console.log('Serving client view');
			return reply.view('mummies', locals);
		}
	}
	// no yar cookie - fallback, shouldn't happen
	else {
		console.error('serveClientView() failed - cookie missing');
		return reply.view('invalidUser', { error: 'Server error: serveClientView() failed' });
	}
}

//////////////////////
// Try and serve a secure view i.e. instructor or admin
// Make a second MMapi check, to ensure email address in s2m_api cookie hasn't been tampered with
///////////////////////

// yar cookie and oauth cookie should be set before calling serveSecureView()
function serveSecureView(request, reply) {
	console.log('serveSecureView() called');
	// get yar cookie
	var s2m_api = request.session.get('s2m_api');
	// check for yar cookie and auth cookie
	if (s2m_api && request.auth.isAuthenticated) {

		// !!! No longer possbile to check membership expiry?
		// if (s2m_api.membershipStatus !== 'Active' ) {
		// 	// Checking membership status here (rather than homeView) so we can send lapsed users to a specific page.
		// 	console.error('serveSecureView() failed - membership expired');
		// 	return reply.view('invalidUser', { error: 'Your membership has expired' });
		// }
		// check for missing Instructor or Adminstrator membership level
		if (s2m_api.membershipLevel !== 10 && s2m_api.membershipLevel !== 9) {
			// FALLBACK - this is accounted for in homeView
			// redirect to homeView as client
			console.error('serveSecureView() failed - wrong membershipLevel');
			request.auth.session.clear();
			return reply.redirect('/');
		}
		else {
			// generate TokBox token,
			var token = generateToken(s2m_api);
			// assemble local variables for view template
			var locals = {	apiKey: apiKey,
							sessionId: sessionId,
							token: token,
							membershipLevel: s2m_api.membershipLevel,
							role: (s2m_api.membershipLevel === 9) ? 'moderator' : 'publisher',
							username: s2m_api.username,
							email: s2m_api.email,
							displayName: s2m_api.displayName,
						};
			if (s2m_api.membershipLevel === 9) {
				console.log('Serving instructor view');
				return reply.view('instructor', locals);
			}
			else if (s2m_api.membershipLevel === 10) {
				console.log('Serving adminsitrator view');
				// NB Admin view currently just client view
				return reply.view('mummies', locals);
			}
		}
	}
	else {
		// fallback - cookies not set
		console.error('serveSecureView() failed - cookies missing');
		return reply.view('invalidUser', { error: 'Server error: serveSecureView() failed' });
	}
}

////////////////
// Make a member mouse API call to MW.com to get user data
// Set yar cookie 's2m_api' if found
/////////////////

function setS2MemberCookie(userEmail, request, reply) {
	console.log('setS2MemberCookie() called');
	s2m.getMember(userEmail, function(err, memberData){
		if (err) {
			// query string token preserved so client brower refresh possible
			console.error('s2member API call error: ', err);
			return reply.view('invalidUser', { error: 'Error contacting membership server.\nPlease refresh the page to retry.' });
		}
		else if (memberData) {
			// set yar cookie 's2m_api' key
			var s2mData = {
				// membershipStatus: memberData.status_name,
				membershipLevel: memberData.level,
				displayName: memberData.data.display_name,
				username: memberData.data.user_login,
				email: memberData.data.user_email
			};
			request.session.clear('s2m_api');
			request.session.set('s2m_api', s2mData);
			console.log('Member found!');
			console.log('s2m_api cookie set: ', s2mData);
			// NB Calling serveClientView directly here failed as cookie not yet fully set? (async issue?)
			// Hence, redirect: (also, removes query string from browser URL)
			reply.redirect('/');
		}
		else {
			console.log('Member not found!');
			request.session.clear('s2m_api'); //???? not needed?
			return reply.view('invalidUser', { error: 'Member not found' });
		}
	});
}

///////////////
// deal with query string if one or both cookies already set
// check if query string contains a new user, or just the same one
// if new email, clear cookie(s) and redirect with query string intact. If same user, redirect to remove query string
//////////////

function checkQueryString(request, reply) {
	console.log('checkQueryString() called');
	var urlObject = url.parse(request.url, true);
	var s2m_api = request.session.get('s2m_api');
	// first check if different user is trying to log in
		if (urlObject.query.hasOwnProperty('token') && urlObject.query.token ) { //double check to account for e.g. token: undefined
			var currentUserEmail = s2m_api.email;
			var newUserEmail = new Buffer(urlObject.query.token, 'base64');
			newUserEmail = newUserEmail.toString('utf8');
			// if different user login attempted, clear s2m_api and start again
			if (newUserEmail !== currentUserEmail) {
				console.log('Email token for different user found. Clearing cookies and redirecting to root');
				request.session.clear('s2m_api'); //? redundant?
				request.auth.session.clear(); // in case trying to change from e.g. instructor to client
				return reply.redirect('/?token=' + urlObject.query.token);
			}
			else {
				// current users email address in query string. No need to reset cookie. Redirect to strip querystring from the url
				console.log('Email token for current user found. Redirecting to root to strip querystring');
				reply.redirect('/');
			}
		}
		else {
			// unwanted query string data, redirect to strip from URL.
			console.log('Unrecognised query string found. Redirecting to root to strip querystring');
			reply.redirect('/');
		}
}

///////////////////////////
// homeView sub handlers //
///////////////////////////

function bothCookiesHandler(request, reply) {
	console.log('bothCookiesHandler() called');
	var urlObject = url.parse(request.url, true);
	var s2m_api = request.session.get('s2m_api');
	var googleEmail = request.auth.credentials.googleEmail;
	var s2MemberEmail = s2m_api.email;
	// check if query string present
	if (Object.keys(urlObject.query).length > 0) {
		checkQueryString(request, reply);
	}
	// check if email addresses match
	else if (googleEmail !== s2MemberEmail) {
		// fail! emails don't match
		console.error('s2m API email and googleEmail don\'t match!');
		request.session.clear('s2m_api');
		request.auth.session.clear();
		return reply.view('invalidUser', { error: 'Error during secure login. Email addresses do not match.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
	}
	else {
		// email addresses match!
		console.log('s2m API email and googleEmail match!');
		// make a second MM API query to check googleEmail is still a valid instructor
		// not possbile to check against original values, as they're only record is s2m_api, which is what we're fallback checking
		// Reasoning: s2m_api cookie could be faked? (DOES THIS MAKE SENSE??) Defense in depth, fallback in case we did something stupid elsewhere!
		s2m.getMember(googleEmail, function(err, memberData){
			console.log('Double checking s2m API for googleEmail credentials');
			if (err) {
				console.error('s2m API error: ', err);
				request.session.clear('s2m_api');
				request.auth.session.clear();
				return reply.view('invalidUser', { error: 'Error during secure login. Email verfication failed.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
			}
			else if (memberData) {
				// bool to check contents of MM query with googleEmail still valid for secure view
				var membershipLevelCheck = (memberData.level === 10 || memberData.level === 9) ? true : false;
				if ( membershipLevelCheck ) {
					console.log('googleEmail membershipLevel confirmation succesful!');
					// attempt to serve Instructor/Administrator view
					serveSecureView(request, reply);
				}
				else {
					// member somehow lacks correct membershipLevel
					console.error('googleEmail membershipLevel confirmation failed! - member not Instructor/Administrator');
					request.auth.session.clear();
					return reply.redirect('/');
				}
			}
			else {
				// member somehow not found. hax!!
				console.error('googleEmail membershipLevel confirmation failed! - member not found');
				request.session.clear('s2m_api');
				request.auth.session.clear();
				return reply.view('invalidUser', { error: 'Error during secure login. Secondary account verfication failed.\nReturn to mummyworkouts.com and try again.\nIf issue persits, please contact support.' });
			}
		});
	}
}

function mmApiOnlyHandler(request, reply) {
	console.log('mmApiOnlyHandler called');
	var urlObject = url.parse(request.url, true);
	var s2m_api = request.session.get('s2m_api');
	// check if query string present
	if (Object.keys(urlObject.query).length > 0) {
		checkQueryString(request, reply);
	}
	else {
		// url is clean and s2m_api cookie set.
		// NB membershipLevel 10 == Administrator, 9 === Instructor
		if (s2m_api.membershipLevel === 10 || s2m_api.membershipLevel === 9) {
			// user is an Instructor or Admin. Redirect for secure login to aquire oauth cookie
			console.log('Instructor/Administrator detected. Redirecting to secure login');
			return reply.redirect('/login');
		}
		else {
			// Attempt to serve client view
			serveClientView(request, reply);
		}
	}
}

function noCookieHandler(request, reply) {
	console.log('noCookieHandler() called');
	var urlObject = url.parse(request.url, true);
	// fail if no query string token and no s2m_api cookie
	if (!urlObject.query.hasOwnProperty('token') || !urlObject.query.token  ) { //double check to account for e.g. token: undefined
		console.error('No query string token found');
		return reply.view('invalidUser', { error: 'Please return to Mummy Workouts and retry the join class button.' });
		// return reply.redirect('http://mummyworkouts.com');
	}
	else if (urlObject.query.hasOwnProperty('token') && urlObject.query.token ) { //double check to account for e.g. token: undefined
		// get user token from qs (Member Mouse email)
		var token = urlObject.query.token;
		console.log('Encoded user token: ', token);
		// NB no need to URL decode - hapi does it automatically
		var userEmail = new Buffer(token, 'base64');
		userEmail = userEmail.toString('utf8');
		console.log('Decoded user token: ', userEmail);

		// make s2m API call to check for member
		setS2MemberCookie(userEmail, request, reply);
	}
	else {
		// fallback
		console.error('fallback! homeView() failed');
		return reply.view('invalidUser', { error: 'Login failed.\nPlease return to Mummy Workouts to try again.' });
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
			request.session.clear('s2m_api');
			// clear oauth cookie
			request.auth.session.clear();
			return reply.redirect('/loggedout');
		}
	},

	loginView: {
		auth: false,
		handler: function (request, reply) {
			var s2m_api = request.session.get('s2m_api');
			if (s2m_api) {
				return reply.view('google', {mmEmail: s2m_api.email});
			}
			// loginView shold only be accessed once s2m_api set
			else {
				console.log('s2m_api cookie missing! Redirect to root.');
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
				// console.dir(googleCreds);

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
				console.log('Google login failed!');
				return reply.redirect('/logout');
			}
		}
	},

	homeView: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			// console.dir(urlObject);
			// console.log('Referer: ',request.headers.referer); <- no point trying to check referer. Not reliable.

			// get s2m_api cookie
			var s2m_api = request.session.get('s2m_api');

			// check if oauth cookie and s2m_api is set
			if (request.auth.isAuthenticated && s2m_api) {
				// user has logged in with MW.com link and google oauth
				console.log('s2m_api and auth Cookies BOTH Found');
				bothCookiesHandler(request, reply);
			}
			// check if only 's2m_api' cookie already set
			else if (s2m_api) {
				console.log('Only s2m_api Cookie Found');
				mmApiOnlyHandler(request, reply);
			}
			// else no cookies set
			else {
				console.log('s2m_api Cookie NOT Found, oauth Cookie NOT found');
				noCookieHandler(request, reply);
			}
		}
	},

	startArchive: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			var s2m_api = request.session.get('s2m_api');
			if (request.auth.isAuthenticated && s2m_api) {
				console.log(request.payload);
				var sessionIdToArchive = payload.sessionId;
				var instructorName = payload.name;
				var classDate = new Date().toString();
				var archiveName = instructorName + ' - ' + classDate;

				var archiveOptions = {
					name: archiveName,
					outputMode: 'individual'
				};

				opentok.startArchive(sessionIdToRecord, archiveOptions , function(err, archive) {
					if (err) {
						console.error(err);
						return reply(err).code(500);
					}
					else {
						// The id property is useful to save off into a database
						console.log("new archive:" + archive.id);
						console.dir(archive);
						return reply(archive.id).code(500);
					}
				});
			}
		}
	},

	stopArchive: {
		auth: {
			mode: 'try'
		},
		handler: function (request, reply ){
			var s2m_api = request.session.get('s2m_api');
			if (request.auth.isAuthenticated && s2m_api) {
				console.log(request.payload);
				var archiveIdToStop = payload.archiveId;
				opentok.stopArchive(archiveIdToStop, function(err, archive) {
  					if (err) {
  						console.error(err);
  						return reply(err).code(500);
  					}
  					else {
  						console.log("Stopped archive:" + archive.id);
  						return reply("Stopped archive:" + archive.id);
  					}
				});
			}
		}
	}
};





