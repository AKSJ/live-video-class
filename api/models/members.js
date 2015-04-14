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

