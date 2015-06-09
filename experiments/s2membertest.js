var request = require('request');
var config = require('../api/config');
var php = require('../api/php');

// <?php
// $op["op"] = "get_user"; // The Remote Operation.

// $op["api_key"] = "string"; // Check your Dashboard for this value.
//     // See: `s2Member ⥱ API / Scripting ⥱ Remote Operations API ⥱ API Key`

// $op["data"] = array(
//     "user_id" => "123", // A User ID to query the database for.
//     "user_login" => "johndoe22", // OR, a Username to query the database for.
//     "user_email" => "johndoe22@example.com" // OR, an email address to query the database for.
// );

// $post_data = stream_context_create (array("http" => array("method" => "POST", "header" => "Content-type: application/x-www-form-urlencoded", "content" => "s2member_pro_remote_op=" . urlencode (serialize ($op)))));

// $result = trim (file_get_contents ("http://mummyworkouts.com/?s2member_pro_remote_op=1", false, $post_data));

// if (!empty($result) && !preg_match ("/^Error\:/i", $result) && is_array($user = @unserialize ($result)))
//     print_r($user); // Print full unserialized array with all User data properties.
// else
//     echo "API error reads: " . $result;
// ?>

// ///
//!!!!!!!!!!!!!
// s2 member api not happy. if s2member_pro_remote_op=' is missing, replied with MW.com index.html
// otherwise, complains that not a serialised array. hmm


var op = {
			op: 'get_user',
			api_key: config.s2member.key,
			data: {
				user_email: 'testmummyfac1@gmail.com'
			}
		};

var serialisedOp = php.serialize(op);

console.log(serialisedOp);

// var formData = { s2member_pro_remote_op: encodeURIComponent(serialisedOp) };

// NB!! php 'urlencode' != js encodeURIcomponent (== rawurlencode...)

var formData = 's2member_pro_remote_op=' + php.urlencode(serialisedOp); // <- still 'not serialized' if dont uriencode

request.post({
	headers: {
		// mod_security is running on Mummy Workout's Apche server. Spoofing the user-agent seems to get around it.
		// Look out for 406 errors...!
		// 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	url: 'http://mummyworkouts.com/?s2member_pro_remote_op=1',
	form: formData
	},
	function(err, res, body)  {
		if (err) {
			console.error(err);
		}
		else if (res.statusCode !== 200 && res.statusCode !== 409 ) {
			console.error('ERROR - StatusCode: ', res.statusCode);
			console.error('Message: : ', body );
			console.dir(res);
		}
		else {
			// console.dir(res);
			if (body) {
				console.dir(body);
				// var response = JSON.parse(body);
				// var statusCode = response.response_code; //NB - this *is* a string
				// console.log('Response StatusCode: ', statusCode);
				// var memberData = response.response_data;
				// console.dir(memberData);
			}
		}
	}
);
