var fs			= require('fs');
var opentok 	= require('./api/opentok');

/////////////////////////
// Generate Session Id //
/////////////////////////

// Run once to create a sessionId for creds.json or process.env.SESSIONID

// NB - you must have entered a valid TokBox api key and secret in creds.json / as an environment variable

opentok.createSession({mediaMode: 'routed'}, function(err, session) {
		if (err) return console.error(err);
		if (session) {
			console.log('SessionId:');
			console.dir(session.sessionId);
			fs.writeFile('sessionId.txt', session.sessionId, function(err){
				if (err) console.error(err);
			});
		}
	});
