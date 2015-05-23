var controller = require('./controller.js');

module.exports = [
	{path: "/{file*}",					method: "GET",		config: controller.serveFile},
	{path: '/', 						method: 'GET', 		config: controller.homeView},
	{path: '/login', 					method: 'GET', 		config: controller.loginGoogle},
	{path: '/logout', 					method: 'GET', 		config: controller.logout},
	{path: '/loggedout',				method: 'GET',		config: controller.loggedoutView},
];

// TODO: resolve logout/loggedout issue. If keeping logout, loggedout cannot allow relogin
// Instead, have link back to mummy workouts live class page
