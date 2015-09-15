var request = require('superagent');
var config = require('./config');
var php = require('./php');


function getMember(email, callback) {
	var payload = {
		op: 'get_user',
		api_key: config.s2member.key,
		data: {
			user_email: email
		}
	};
	// s2member API requires a php-style serialized input
	payload = php.serialize(payload);
	// NB! phpjs serialize function has a bug with nested objects: adds too many ';' at end. so:
	payload = payload.replace(/\}\;/g, '}');
	// s2member API requires urlencoded input (!== encodeURIcomponent), with 'remote_op' key string
	payload = 's2member_pro_remote_op=' + php.urlencode(payload);

	request.post('https://heyworkout.com/?s2member_pro_remote_op=1')
		.send(payload)
		.end(function(err, res){
			if (err) {
				console.error('s2member.getMember error: ', err);
				return callback(err);
			}
			else if (res) {
				// s2member API return status 200 with error message if e.g. member not found
				if (res.text.match(/Error/) ) {
					console.error('s2member API response error: ', res.text);
					return callback(res.text);
				}
				else {
					var result = php.unserialize(res.text);
					console.log('s2member API response:');
					console.dir(result);
					return callback(null, result);
				}
			}
			// fallback
			else {
				console.error('s2member.getMember failed. No err or res.');
				return callback('s2member.getMember failed. No err or res.');
			}
		});
}

module.exports = {
	getMember: getMember
};

