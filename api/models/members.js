var mongoose 	= require("mongoose");
var schema 		= require("./schema.js");
var Member		= schema.Member;

// sample params: 	{ 	query: {'email': 'foo'},
// 		optional ----->	filter: {'permissions': 1, 'username':1, _id': 0}
// 					}
exports.search = function(params, onComplete) {
	// NB - Probably want find rather than findOne for general search
	if (params.filter) {
		Member.findOne(params.query, params.filter, function(err, result){
			if (err) {
				return onComplete(err);
			}
			return onComplete(null, result);
		});
	}
	else {
		Member.findOne(params.query, function(err, result){
			if (err) {
				return onComplete(err);
			}
			return onComplete(null, result);
		});
	}
};

// NB if no member found, returns result of null, not error
exports.findMemberByEmail = function(email, callback) {
	Member.findOne({email: email}, function(err, result){
		if (err) {
			return callback(err);
		}
		else if (result) {
			return callback(null, result);
		}
	});
};

exports.addMember = function(newMember, callback) {
	Member.create(newMember, function(err, member){
		if (err) {
			return callback(err);
		}
		else
			return callback(null, member);
	});
};
