var OpenTok = require('opentok');
var config 	= require('./config');

var opentok = new OpenTok(config.openTok.key, config.openTok.secret);

module.exports = opentok;
