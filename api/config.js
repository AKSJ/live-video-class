module.exports = {
	// db : {
	// 			dbuser 	: process.env.DBUSER 	|| require('./creds.json').database.dbuser,
	// 			dbpwd  	: process.env.DBPWD 	|| require('./creds.json').database.dbpwd,
	// 			dburl  	: process.env.DBURL 	|| require('./creds.json').database.dburl,
	// },
	openTok: {
				key 	: process.env.OPENTOKKEY 		|| require('./creds.json').openTok.key,
				secret 	: process.env.OPENTOKSECRET 	|| require('./creds.json').openTok.secret
	},
	google : {
				secret 	: process.env.GOOGLESECRET 		|| require('./creds.json').google.secret,
				cKey	: process.env.GOOGLECKEY 		|| require('./creds.json').google.cKey,
				cSecret	: process.env.GOOGLECSECRET 	|| require('./creds.json').google.cSecret,
	},
	cookie : {
				password: process.env.COOKIESECRET 		|| require('./creds.json').cookieSecret
	}
};
