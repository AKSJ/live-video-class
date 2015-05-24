var Hapi 	= require('hapi');


var server = new Hapi.Server();
server.connection({ port: process.env.PORT || 8080 });

var yarOptions = {
	name: 'yartest',
	cookieOptions: {
		password: 'password',
		isSecure: process.env.PORT ? true : false, // we want isSecure true if https is enabled  i.e on heroku
		ttl: 10000 //10 secs
	}
};

server.register({
	register: require('yar'),
	options: yarOptions
},function(err){
	if (err) {
		console.error('Failed to load yar');
		console.error(err);
	}
});

////////////
// NOTES
///////////

// Yar sets one cookie

// Code dive suggests should be possbile to set all normal hapi session.state cookie options
// in additon to options mentioned in readme.

// CONFIRMED - ttl works
// CONFIRMED - name works


server.route({
	method: 'GET',
	path: '/',
	handler: function (request, reply) {
		request.session.set('key1', {username: 'test McTestburger', key: 'value'} );
		request.session.set('key2', {email: 'test@test.com'} );
		return reply('Set');
	}
});

server.route({
	method: 'GET',
	path: '/read',
	handler: function (request, reply) {
		var key1 = request.session.get('key1');
		console.dir(key1);
		var key2 = request.session.get('key2');
		console.dir(key2);
		return reply('Read');
	}
});

server.route({
	method: 'GET',
	path: '/clear',
	handler: function (request, reply) {
		request.session.clear('key1');
		request.session.clear('key2');
		return reply('Cleared');
	}
});

server.route({
	method: 'GET',
	path: '/auth',
	handler: function (request, reply) {
		var key1 = request.session.get('key1');
		if (key1) {
			return reply('Authenticated');
		}
		else {
			return reply('NOT Authenticated');
		}
	}
});

server.route({
	method: 'GET',
	path: '/session',
	handler: function (request, reply) {
		return reply(request.session);
	}
});

server.start(function(){
	console.log('Server running at:', server.info.uri);
});
