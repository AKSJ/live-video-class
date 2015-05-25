// !!!!!!!
// USE 2MMAPITEST FORMAT
// much easier

var querystring = require('querystring');
var request = require('request');
var config = require('../api/config');

var realUserRequest = {
			apikey: config.mm.key,
			apisecret: config.mm.secret,
			// member_id: '35',
			email: 'tinnovamail@gmail.com'
		};
//api accepts BOTH id and email together, no error.
// ID has priority, so if id wrong, fails 409. If ID right and email wrong, suceeds 200.

var fakeUserRequest = {
			apikey: config.mm.key,
			apisecret: config.mm.secret,
			// member_id: ''
			email: 'thecatinthehat@gmail.com'
		};

var oneDayExpiryRequest = {
			apikey: config.mm.key,
			apisecret: config.mm.secret,
			// member_id: ''
			email: 'adamkowalczyk+onedaytest@gmail.com'
		};


var realUser = querystring.stringify(realUserRequest);
var fakeUser = querystring.stringify(fakeUserRequest);
var oneDay = querystring.stringify(oneDayExpiryRequest);

request({
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	uri: 'https://mummyworkouts.com/wp-content/plugins/membermouse/api/request.php?q=/getMember',
	body: realUser,
	method: 'POST'
	}, function (err, res, body) {
		if (err) {
			console.error(err);
		}
		else {
			// console.log(res);
			console.log(res.statusCode);
			if (body) console.dir(body);
			res.on('data', function(chunk){
				console.log(chunk);
			});
		}
	});


request({
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	uri: 'http://mummyworkouts.com/wp-content/plugins/membermouse/api/request.php?q=/getMember',
	body: fakeUser,
	method: 'POST'
	}, function (err, res, body) {
		if (err) {
			console.error(err);
		}
		else {
			// console.log(res);
			console.log(res.statusCode);
			if (body) console.dir(body);
			res.on('data', function(chunk){
				console.log(chunk);
			});
		}
	});

request({
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
	},
	uri: 'http://mummyworkouts.com/wp-content/plugins/membermouse/api/request.php?q=/getMember',
	body: oneDay,
	method: 'POST'
	}, function (err, res, body) {
		if (err) {
			console.error(err);
		}
		else {
			// console.log(res);
			console.log(res.statusCode);
			if (body) console.dir(body);
			res.on('data', function(chunk){
				console.log(chunk);
			});
		}
	});


// RealUser response
// {
//   "response_code": "200",
//   "response_message": "",
//   "response_data": {
//     "member_id": 35,
//     "first_name": "Tin",
//     "last_name": "Novakovic",
//     "is_complimentary": "false",
//     "registered": "2015-03-09 17:03:05",
//     "cancellation_date": "",
//     "last_logged_in": "2015-03-10 00:44:58",
//     "last_updated": "2015-03-10 00:44:58",
//     "days_as_member": 67,
//     "status": "1",
//     "status_name": "Active",
//     "membership_level": "2",
//     "membership_level_name": "7 Day Free Triall",
//     "username": "tinnovamail@gmail.com",
//     "email": "tinnovamail@gmail.com",
//     "password": null,
//     "phone": "",
//     "billing_address": "",
//     "billing_city": "",
//     "billing_state": "",
//     "billing_zip": "",
//     "billing_country": "United Kingdom",
//     "shipping_address": "",
//     "shipping_city": "",
//     "shipping_state": "",
//     "shipping_zip": "",
//     "shipping_country": "United Kingdom",
//     "bundles": [

//     ],
//     "custom_fields": [

//     ]
//   }
// }


// Fake User Response
// {
// 	"response_code":"409",
// 	"response_message":"No member found for email \'thecatinthehat@gmail.com\'",
// 	"response_data":null
// }'


// One Day response - active:
// '\r\n{"response_code":"200","response_message":"","response_data":{"member_id":57,"first_name":"AdamTestOneDay","last_name":"LastNameTest","is_complimentary":"false","registered":"2015-05-16 10:26:28","cancellation_date":"","last_logged_in":"2015-05-16 10:26:31","last_updated":"2015-05-16 10:28:46","days_as_member":0,"status":"1","status_name":"Active","membership_level":"3","membership_level_name":"Expiry Test","username":"adamkowalczykonedaytest@gmail.com","email":"adamkowalczyk+onedaytest@gmail.com","password":null,"phone":"","billing_address":"","billing_city":"","billing_state":"ABE","billing_zip":"","billing_country":"United Kingdom","shipping_address":"","shipping_city":"","shipping_state":"ABE","shipping_zip":"","shipping_country":"United Kingdom","bundles":[],"custom_fields":[{"id":1,"name":"TokBox Permissions","value":""}]}}'

// One Day response - expred:
	// '\r\n{"response_code":"200","response_message":"","response_data":{"member_id":57,"first_name":"AdamTestOneDay","last_name":"LastNameTest","is_complimentary":"false","registered":"2015-05-16 10:26:28","cancellation_date":"","last_logged_in":"2015-05-16 10:26:31","last_updated":"2015-05-17 05:57:34","days_as_member":2,"status":"8","status_name":"Expired","membership_level":"3","membership_level_name":"Expiry Test","username":"adamkowalczykonedaytest@gmail.com","email":"adamkowalczyk+onedaytest@gmail.com","password":null,"phone":"","billing_address":"","billing_city":"","billing_state":"ABE","billing_zip":"","billing_country":"United Kingdom","shipping_address":"","shipping_city":"","shipping_state":"ABE","shipping_zip":"","shipping_country":"United Kingdom","bundles":[],"custom_fields":[{"id":1,"name":"TokBox Permissions","value":""}]}}'
