module.exports = {
	db : {
				dbuser 	: 	process.env.DBUSER 			|| require('./creds.json').database.dbuser,
				dbpwd  	: 	process.env.DBPWD 			|| require('./creds.json').database.dbpwd,
				dburl  	: 	process.env.DBURL 			|| require('./creds.json').database.dburl,
	},
	openTok: {
				key 	: 	process.env.OPENTOKKEY 		|| require('./creds.json').openTok.key,
				secret 	: 	process.env.OPENTOKSECRET 	|| require('./creds.json').openTok.secret,
				sessionId : process.env.SESSIONID 		|| require('./creds.json').openTok.sessionId
	},
	// google : {
	// 			secret 	: 	process.env.GOOGLESECRET 	|| require('./creds.json').google.secret,
	// 			cKey	: 	process.env.GOOGLECKEY 		|| require('./creds.json').google.cKey,
	// 			cSecret	: 	process.env.GOOGLECSECRET 	|| require('./creds.json').google.cSecret,
	// },
	facebook : {
				secret 	: 	process.env.FBSECRET 		|| require('./creds.json').facebook.secret,
				cKey	: 	process.env.FBCKEY 			|| require('./creds.json').facebook.cKey,
				cSecret	: 	process.env.FBCSECRET 		|| require('./creds.json').facebook.cSecret,
	},
	cookie : {
				password: 	process.env.COOKIESECRET 	|| require('./creds.json').cookieSecret
	}
};
