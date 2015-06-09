module.exports = {
	db : {
				dbuser 	: 	process.env.DBUSER 			|| require('./creds.json').database.dbuser,
				dbpwd  	: 	process.env.DBPWD 			|| require('./creds.json').database.dbpwd,
				dburl  	: 	process.env.DBURL 			|| require('./creds.json').database.dburl,
	},
	openTok: {
				key 	: 	process.env.OPENTOKKEY 		|| require('./creds.json').openTok.key,
				secret 	: 	process.env.OPENTOKSECRET 	|| require('./creds.json').openTok.secret,
				sessionId : process.env.SESSIONID 		|| require('./creds.json').openTok.sessionId,
				archiveSessionId : process.env.ARCHIVESESSIONID 		|| require('./creds.json').openTok.archiveSessionId
	},
	google : {
				secret 	: 	process.env.GOOGLESECRET 	|| require('./creds.json').google.secret,
				cKey	: 	process.env.GOOGLECKEY 		|| require('./creds.json').google.cKey,
				cSecret	: 	process.env.GOOGLECSECRET 	|| require('./creds.json').google.cSecret,
	},
	// facebook : {
	// 			secret 	: 	process.env.FBSECRET 		|| require('./creds.json').facebook.secret,
	// 			cKey	: 	process.env.FBCKEY 			|| require('./creds.json').facebook.cKey,
	// 			cSecret	: 	process.env.FBCSECRET 		|| require('./creds.json').facebook.cSecret,
	// },
	cookie : {
				password1: 	process.env.COOKIESECRET1 	|| require('./creds.json').cookie.secret1,
				password2: 	process.env.COOKIESECRET2 	|| require('./creds.json').cookie.secret2
	},
	mm : {
				key: 		process.env.MMKEY 			|| require('./creds.json').mm.key,
				secret: 	process.env.MMSECRET 		|| require('./creds.json').mm.secret
	},
	s2member: {
				key: 		process.env.S2MEMBERKEY		||	require('./creds.json').s2member.key
	}
};
