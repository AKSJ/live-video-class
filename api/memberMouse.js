var request = require('request');


// returns callback(error, responseCode, memberData)
function getMember(userEmail, callback) {

	var requestObject = {
				apikey: 'gZD524b',
				apisecret: 'zc4IGKe',
				email: userEmail
			};

	// requestObject.email = userEmail;

	var APIurl = 'http://mummyworkouts.com/wp-content/plugins/membermouse/api/request.php?q=/getMember';

	request.post({
		headers: {
			// mod_security is running on Mummy Workout's Apche server. Spoofing the user-agent seems to get around it.
			// Look out for 406 errors...!
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
		},
		url: APIurl,
		form: requestObject
		},
		function(err, res, body)  {
			if (err) {
				console.error(err);
				return callback(err);
			}
				else if (res.statusCode !== 200 && res.statusCode !== 409 ) {
				console.error('ERROR - StatusCode: ', res.statusCode);
				console.error('Message: : ', body );
				return callback(body);
			}
			else {
				if (body) {
					var response = JSON.parse(body);
					var statusCode = response.response_code;
					console.log('Response StatusCode: ', statusCode);
					var memberData = response.response_data;
					console.dir(memberData);
					return callback(null, statusCode, memberData);
				}
			}
		}
	);
}

module.exports = {
	getMember: getMember
};
