var controller = require('./controller.js');

module.exports = [
	{path: "/{file*}",					method: "GET",		config: controller.serveFile},

	{path: '/', 						method: 'GET', 		config: controller.homeView},
	{path: '/signup', 					method: 'GET', 		config: controller.signupView},
	{path: '/signup', 					method: 'POST', 	config: controller.signupSubmit},
	{path: '/login', 					method: 'GET', 		config: controller.login},
	{path: '/logout', 					method: 'GET', 		config: controller.logout},
];
