var fs   = require('fs');
var utils = require('./utils.js');

var http  = require('http');
var url  = require('url');
var express = require('express');
var connect = require('connect');

var 	app = express.createServer();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('maillog.db');

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
		select.each(0, function (err, row) {
	       if (err) {
	           plugin.logerror("SELECT failed: " + err);
	           return;
	       }

			report += '<br/><br/><br/>' + JSON.stringify(row);
	   }, 
	   function (err, row_count) {
	       if (err) {
	           plugin.logerror("SELECT completion failed: " + err);
	           return;
	       }       
	       res.send(report);
	   });
	});
		
	//open up a webserver on port 8085
	app.listen(8085);
	this.loginfo("Maillog http server running on port " + '8025');
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
	         // plugin.logdebug("SQLite Busy - re-running");
	         // return setTimeout(function () {
	         //     plugin.hook_deny(callback, connection, params);
	         // }, 50); // try again in 50ms
	     }
	     plugin.logerror("Insert failed: " + err);
	 }
	 callback(CONT);
	});
};



function report (plugin, res) {
	//FOR NOW SET "start date" to zero

}