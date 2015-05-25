var request = require('request');
var config = require('../api/config');

var realUserRequest = {
			apikey: config.mm.key,
			apisecret: config.mm.secret,
			// member_id: '35',
			email: 'tinnovamail@gmail.com'
		};

request.post({
	headers: {
		// mod_security is running on Mummy Workout's Apche server. Spoofing the user-agent seems to get around it.
		// Look out for 406 errors...!
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	url: 'https://mummyworkouts.com/wp-content/plugins/membermouse/api/request.php?q=/getMember',
	form: realUserRequest
	},
	function(err, res, body)  {
		if (err) {
			console.error(err);
		}
		else if (res.statusCode !== 200 && res.statusCode !== 409 ) {
			console.error('ERROR - StatusCode: ', res.statusCode);
			console.error('Message: : ', body );
		}
		else {
			console.dir(res);
			if (body) {
				var response = JSON.parse(body);
				var statusCode = response.response_code; //NB - this *is* a string
				console.log('Response StatusCode: ', statusCode);
				var memberData = response.response_data;
				console.dir(memberData);
			}
		}
	}
);
