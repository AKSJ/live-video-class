var mongoose 	= require("mongoose");
var schema 		= require("./schema.js");
var Member		= schema.Member;

exports.findAll = function( callback ) {
	Member.find(function( err, result ) {
		if( err ) {
			callback( err );
		}
		else {
			return callback(null, result);
		}
	});
};
// sample params: 	{ 	query: {'email': 'foo'},
// 		optional ----->	filter: {'permissions': 1, 'username':1, _id': 0}
// 					}
exports.search = function(params, callback) {
	// NB - Probably want find rather than findOne for general search
	if (params.filter) {
		Member.find(params.query, params.filter, function(err, result){
			if (err) {
				return onComplete(err);
			}
			return onComplete(null, result);
		});
	}
	else {
		Member.find(params.query, function(err, result){
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
		else {
			return callback(null, result);
		}
	});
};

exports.addMember = function(newMember, callback) {
	var newMemberObj = new Member(newMember);
	Member.create(newMemberObj, function(err, member){
		if (err) {
			return callback(err);
		}
		else
			return callback(null, member);
	});
};

// sample params: 	{ 	query: {'email': 'foo'},
// 		   				update: {'permissions': 'moderator'}
//
exports.updateMember= function( params, callback ) {
	Member.findOneAndUpdate(params.query, params.update, function(err, result) {
		if (err) {
			return callback(err);
		}
		return callback(null, result);
	});
};
