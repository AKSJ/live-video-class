var controller = require('./controller.js');

module.exports = [
	{path: "/{file*}",					method: "GET",		config: controller.serveFile},

	{path: '/', 						method: 'GET', 		config: controller.homeView},
	{path: '/login/facebook', 			method: 'GET', 		config: controller.loginFacebook},
	// {path: '/login/google', 			method: 'GET', 		config: controller.loginGoogle},
	{path: '/logout', 					method: 'GET', 		config: controller.logout},
	{path: '/loggedout',				method: 'GET',		config: controller.loggedoutView},
	{path: '/api/memberupdate',			method: 'POST',		config: controller.memberUpdate}
];
