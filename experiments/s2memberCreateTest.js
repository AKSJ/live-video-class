var request = require('request');
var config = require('../api/config');
var php = require('../api/php');

// <?php
// $op["op"] = "create_user"; // The Remote Operation.

// $op["api_key"] = "string"; // Check your Dashboard for this value.
//     // See: `s2Member ⥱ API / Scripting ⥱ Remote Operations API ⥱ API Key`

// $op["data"] = array(
//     "user_login" => "johndoe22", // Required. A unique Username. Lowercase alphanumerics/underscores.
//     "user_email" => "johndoe22@example.com", // Required. A valid/unique Email Address for the new User.

//     // These additional details are 100% completely optional.

//     "modify_if_login_exists" => "1", // Optional. Update/modify if ``user_login`` value already exists in the database?
//         // A non-zero value tells s2Member to update/modify an existing account with the details you provide, if this Username already exists.

//     "user_pass" => "456DkaIjsd!", // Optional. Plain text Password. If empty, this will be auto-generated.

//     "first_name" => "John", // Optional. First Name for the new User.
//     "last_name" => "Doe", // Optional. Last Name for the new User.

//     "s2member_level" => "2", // Optional. Defaults to Level #0 (a Free Subscriber).
//     "s2member_ccaps" => "music,videos", // Optional. Comma-delimited list of Custom Capabilities.

//     "s2member_registration_ip" => "123.456.789.100", // Optional. User's IP Address. If empty, s2Member will fill this upon first login.

//     "s2member_subscr_gateway" => "paypal", // Optional. User's Paid Subscr. Gateway Code. One of: (paypal|alipay|authnet|ccbill|clickbank|google).
//     "s2member_subscr_id" => "I-DJASODJF8933J", // Optional. User's Paid Subscr. ID. For PayPal®, use their Subscription ID, or Recurring Profile ID.

//     "s2member_custom" => "mummyworkouts.com", // Optional. If provided, should always start with your installation domain name (i.e., $_SERVER["HTTP_HOST"]).

//     "s2member_auto_eot_time" => "2030-12-25", // Optional. Can be any value that PHP's ``strtotime()`` function will understand (i.e., YYYY-MM-DD).

//     "custom_fields" => array("my_field_id" => "Some value."), // Optional. An array of Custom Registration/Profile Field ID's, with associative values.

//     "s2member_notes" => "Administrative notation. Created this User via API call.", // Optional. Administrative notations.

//     "opt_in" => "1", // Optional. A non-zero value tells s2Member to attempt to process any List Servers you've configured in the Dashboard area.
//         // This may result in your mailing list provider sending the User/Member a subscription confirmation email (i.e., ... please confirm your subscription).

//     "notification" => "1", // Optional. A non-zero value tells s2Member to email the new User/Member their Username/Password.
//         // The "notification" parameter also tells s2Member to notify the site Administrator about this new account.
// );

// $post_data = stream_context_create (array("http" => array("method" => "POST", "header" => "Content-type: application/x-www-form-urlencoded", "content" => "s2member_pro_remote_op=" . urlencode (serialize ($op)))));

// $result = trim (file_get_contents ("http://mummyworkouts.com/?s2member_pro_remote_op=1", false, $post_data));

// if (!empty($result) && !preg_match ("/^Error\:/i", $result) && is_array($user = @unserialize ($result)))
//     echo "Success. New User created with ID: " . $user["ID"];
// else
//     echo "API error reads: " . $result;
// ?>

var payload = {
			op: 'create_user',
			api_key: config.s2member.key,
			data: {
				user_login: 'TestUserS2MemberAPI',
				user_email: 'TestUserS2MemberAPI@test.com',
				user_pass: 'test'
			}
		};

var serialisedPayload = php.serialize(payload);

console.log(serialisedPayload);

var serialisedPayload = encodeURIComponent(serialisedPayload);
console.log(serialisedPayload);

// var serialisedPayload = encodeURIComponent(serialisedPayload);
// console.log(serialisedPayload);

request.post({
	headers: {
		// mod_security is running on Mummy Workout's Apche server. Spoofing the user-agent seems to get around it.
		// Look out for 406 errors...!
		// 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	url: 'http://mummyworkouts.com/?s2member_pro_remote_op=1',
	form: serialisedPayload
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
			console.dir(res);
			if (body) {
				// console.dir(body);
				// var response = JSON.parse(body);
				// var statusCode = response.response_code; //NB - this *is* a string
				// console.log('Response StatusCode: ', statusCode);
				// var memberData = response.response_data;
				// console.dir(memberData);
			}
		}
	}
);
