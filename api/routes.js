var controller = require('./controller.js');

module.exports = [
	{path: "/{file*}",					method: "GET",		config: controller.serveFile},
	{path: '/', 						method: 'GET', 		config: controller.homeView},
	{path: '/login', 					method: 'GET', 		config: controller.loginView},
	{path: '/login/google', 			method: 'GET', 		config: controller.loginGoogle},
	{path: '/logout', 					method: 'GET', 		config: controller.logout},
	{path: '/loggedout',				method: 'GET',		config: controller.loggedoutView},
	{path: '/start',					method: 'POST',		config: controller.startArchive},
	{path: '/stop',						method: 'POST',		config: controller.stopArchive},
	{path: '/log',						method: 'POST',		config: controller.logArchive}
];

