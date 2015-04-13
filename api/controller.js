var Bell 	= require('bell');
var Path 	= require('path');
// var Joi 	= require('joi');
// var mongoose = require('mongoose');
var config 	= require('./config');

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

				request.auth.session.clear();
				request.auth.session.set(profile);

				return reply.redirect('/');
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
			return reply.view('index');
		}
	},

	signupView: {
		auth: {mode: 'optional'},
		handler: function (request, reply ){
			return reply.redirect('/');
		}
	},

	signupSubmit: {
		auth: {mode: 'required'},
		handler: function (request, reply ){
		 return reply.redirect('/');
		}
	}
};
