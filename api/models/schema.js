var mongoose = require("mongoose");
var Schema 	 = mongoose.Schema;

var memberSchema = new Schema({
	username   : {type: String, required: true},
	email      : {type: String, required: true},
	permissions: {type: String, required: true}
});

var Members 	= mongoose.model("members", memberSchema);

module.exports = {
	Member 		: Members
};
