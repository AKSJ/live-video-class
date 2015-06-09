var request = require('superagent');
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


var op = {
			op: 'get_user',
			api_key: config.s2member.key,
			data: {
				user_email: 'testmummyfac1@gmail.com'
			}
		};

var serialisedOp = php.serialize(op);
console.log(serialisedOp);

// NB! phpjs serialize function has a bug with nested objects: adds too many ';' at end. so:
serialisedOp =  serialisedOp.replace(/\}\;/g, '}');
console.log(serialisedOp);

// NB!! php 'urlencode' != js encodeURIcomponent (== rawurlencode...)
var formData = 's2member_pro_remote_op=' + php.urlencode(serialisedOp); // <- still 'not serialized' if dont uriencode

console.log(formData);

request.post('https://mummyworkouts.com/?s2member_pro_remote_op=1')
	.send(formData)
	.end(function(err,res){
		if (err) {
			console.log(err);
		}
		if (res) {
			console.log(res.status);
			if (res.text.match(/Error/) ) {
				console.error(res.text);
			}
			else {
			// console.log(res);
			var result = php.unserialize(res.text);
			console.log(result);
			}
		}
	});

	var op2 = {
			op: 'get_user',
			api_key: config.s2member.key,
			data: {
				user_email: 'IDONTEXISTYO'
			}
		};

var serialisedOp2 = php.serialize(op2);
console.log(serialisedOp2);

// NB! phpjs serialize function has a bug with nested objects: adds too many ';' at end. so:
serialisedOp2 =  serialisedOp2.replace(/\}\;/g, '}');
console.log(serialisedOp2);

// NB!! php 'urlencode' != js encodeURIcomponent (== rawurlencode...)
var formData2 = 's2member_pro_remote_op=' + php.urlencode(serialisedOp2); // <- still 'not serialized' if dont uriencode

console.log(formData2);

request.post('https://mummyworkouts.com/?s2member_pro_remote_op=1')
	.send(formData2)
	.end(function(err,res){
		if (err) {
			console.log(err);
		}
		if (res) {
			console.log(res.status);
			if (res.text.match(/Error/) ) {
				console.error(res.text);
			}
			else {
			// console.log(res);
			var result = php.unserialize(res.text);
			console.log(result);
			}
		}
	});

// user not found - status code *still* 200. no error

// User not found -res.text:
// Error: Failed to locate this User. Unable to obtain WP_User object instance with data supplied (i.e., ID/Username/Email not found).

// User Found:
// result =
// { ID: 60,
//   role: 'administrator',
//   level: 10,
//   ccaps: [],
//   data:
//    { ID: '60',
//      user_login: 'adamkowalczykMWadmin@gmail.com',
//      user_nicename: 'adamkowalczykmwadmingmail-com',
//      user_email: 'testmummyfac1@gmail.com',
//      user_url: '',
//      user_registered: '2015-05-19 11:43:20',
//      user_activation_key: '',
//      user_status: '0',
//      display_name: 'Adam A' },
//   s2member_originating_blog: false,
//   s2member_subscr_gateway: false,
//   s2member_subscr_id: false,
//   s2member_custom: false,
//   s2member_registration_ip: false,
//   s2member_notes: false,
//   s2member_auto_eot_time: false,
//   s2member_custom_fields: false,
//   s2member_paid_registration_times: false,
//   s2member_file_download_access_log: false }
