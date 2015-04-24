var mongoose = require("mongoose");
var Schema 	 = mongoose.Schema;

var memberSchema = new Schema({
	username   : {type: String, required: true},
	email      : {type: String, required: true},
	permissions: {type: String, required: true}
});

var Member 	= mongoose.model("Member", memberSchema);

module.exports = {
	Member 		: Member
};
