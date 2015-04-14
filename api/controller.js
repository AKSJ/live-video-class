var fs 		= require('fs');
var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
// var mongoose = require('mongoose');
var config 	= require('./config');
var opentok = require('./opentok');
var members = require('./models/members.js');

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
				console.log( "Profile: " + JSON.stringify( profile ) );
				// look up in database
				members.search( { query: {"email": profile.email }}, function( error, member ){
					if( error ) {
						console.log( error );
						request.auth.session.clear();
						reply.redirect( '/login' );
					}
					else {
						console.log( 'Found member: ' + member.email );
						profile.permissions = member.permissions;
						request.auth.session.clear();
						request.auth.session.set(profile);
						return reply.redirect('/');
					}
				});
				return reply.redirect('/login');
			}
			else {
				return reply.redirect('/');
			}
		}
	},

	logout: {
		handler: function (request, reply ){
			request.auth.session.clear();
			return reply.redirect('/');
		}
	},

	homeView: {
		auth: {mode: 'optional'},
		handler: function (request, reply ){
			fs.readFile(Path.join(__dirname, '../sessionId.txt'), {encoding: 'utf-8'}, function(err, data){
				if (err) {
					console.error(err);
					return reply.view('index');
				}
				else {
					console.log(data);
					var token = opentok.generateToken(data);
					var permissions = request.auth.credentials.permissions;
					return reply.view('index', {apiKey: config.openTok.key, sessionId: data, token: token, permissions: creds.permissions });
				}
			});
		}
	},
};
