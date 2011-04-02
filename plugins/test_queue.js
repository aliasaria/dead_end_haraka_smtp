var utils = require('./utils.js');
var async = require('async');

//Webserver requires
var http  = require('http');
var url  = require('url');
var express = require('express');
var connect = require('connect');

var 	app = express.createServer();

//Database requires
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('maillog.db');

//var MailParser = require("../mailparser/mailparser.js").MailParser;
var MailParser = require("./lib/mailparser/mailparser.js").MailParser;



//Set up database if it hasn't been set up yet
db.run("CREATE TABLE maillog (timestamp, mail TEXT)",
    function (err) {
        if (!err) {
            db.run("CREATE INDEX timestamp_idx ON maillog (timestamp)");
        }
        insert = db.prepare("INSERT INTO maillog VALUES (?,?)");
        select = db.prepare("SELECT * FROM maillog WHERE timestamp >= ? ORDER BY timestamp");
    }
);

//Set up report webserver
exports.register = function() {
	plugin = this;
	
	var report = '';
	
	app.get('/', function(req, res) {
			HTMLreport(req, res, plugin);
	});
		
	//open up a webserver on port 8085
	app.listen(8085);
	this.loginfo("Maillog http server running on port " + '8025');
}

function HTMLreport(req, res, plugin) {
	var emails = new Array();
	
	// STEP 1: Do select on database and it returns a bunch of rows which are th emails
	select.each(0, function (err, row) {
       if (err) {
           plugin.logerror("SELECT failed: " + err);
           return;
       }
		
		// STEP 2: create an array of all the emails
		emails.push(row);
   }, 
   function (err, row_count) {
       if (err) {
           plugin.logerror("SELECT completion failed: " + err);
           return;
       }

		//STEP 3: now that you have an array of email, run a reduce
		//on them to combine them all into one big string, extracting
		//the header only.
		
		//NOTE: None of this guarantees a consistant order.
		//Should proabably manage order or do a sort as last step
		//actually async.reduce operates in series so it will
		//have order
		async.reduce(emails, '', function(memo, item, callback) {
			var mp = new MailParser();
			//plugin.logdebug("reduce step: " + item.timestamp);
			//plugin.logdebug(item.mail);

			mp.on("headers", function(headers){
	          callback(null, memo + "<HR/>\n" + item.timestamp + " " + headers.subject);
	      });
	
			mp.feed(item.mail);
			mp.end();
		}, function (err, result){
			// STEP 4: respond to web request with the combined output of all the emails
			res.send(result);
		});

   });
}

/*
This hook will attempt to write the mail into the sqlite database.
*/
exports.hook_queue = function(callback, connection) {
	var plugin = this;
   
    var lines = connection.transaction.data_lines;
    if (lines.length === 0) {
        return callback(DENY);
    }
   //this.logdebug((new Date()).getTime());
	//this.logdebug(lines);
	insert.run( (new Date()).getTime(), lines.join(''), function (err) {
	 if (err) {
	     if (err.code === 'SQLITE_BUSY') {
	         plugin.logdebug("SQLite Busy - re-running");
	          return setTimeout(function () {
	              plugin.hook_deny(callback, connection, params);
	          }, 50); // try again in 50ms
	     }
	     plugin.logerror("Insert failed: " + err);
	 }
	 callback(CONT);
	});
};



exports.hook_deny = function (callback, connection, params) {
    var plugin = this;
    insert.run((new Date()).getTime(), params[2], function (err) {
        if (err) {
            if (err.code === 'SQLITE_BUSY') {
                plugin.logdebug("SQLite Busy - re-running");
                return setTimeout(function () {
                    plugin.hook_deny(callback, connection, params);
                }, 50); // try again in 50ms
            }
            plugin.logerror("Insert failed: " + err);
        }
        callback(CONT);
    });
};
