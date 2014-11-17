var io = require('socket.io').listen(8080);
var mysql = require('mysql');
var gcm = require('node-gcm');
var message = new gcm.Message();
 
//API Server Key
var sender = new gcm.Sender('AIzaSyB9CV-5AtbtAeL_kzPgCLXzZyKx9ODfFTU');
var registrationIds = [];
 
// Value the payload data to send...
message.addData('message',"\u270C Peace, Love \u2764 and PhoneGap \u2706!");
message.addData('title','Push Notification Sample' );
message.addData('msgcnt','3'); // Shows up in the notification in the status bar
//message.addData('soundname','beep.wav'); //Sound to play upon notification receipt - put in the www folder in app
//message.collapseKey = 'demo';
//message.delayWhileIdle = true; //Default is false
message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
 
// At least one reg id required
registrationIds.push('APA91bG7xdajFn4khOa5hM2kK4AhlteI_8LzjHrVmR5pCouJxTwV8sIpi75jkILBb72W9nDFD_f0zu7pVTuSDEj_ZZ1qxWzkKS3Xf-wIjuP39Edi9EEQ2xAJjlFUvEQPUnFyen6jz9Ww_o5iMbE7E0geDQbJkQU9gXlbAsrHPSNf-A-VO9DK-9A');
 
/**
 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
 */
sender.send(message, registrationIds, 4, function (err, result) {
    console.log("result: " + result);
});

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'test',
    database : 'traintracker'
});

connection.connect();

console.log("Server started and waiting for devices")

io.sockets.on('connection', function (socket) {

    var socketRef = socket;

    socket.on('client', function (){
        // Client connected - send all tracking data
        socketRef.join("clients");
        var out = "";
        connection.query("SELECT trainid,GROUP_CONCAT(lat ORDER BY pointid DESC SEPARATOR ',') AS lat,GROUP_CONCAT(lon ORDER BY pointid DESC SEPARATOR ',') AS lon,GROUP_CONCAT(speed ORDER BY pointid DESC SEPARATOR ',') AS speed FROM traintracker_tracks GROUP BY trainid ORDER BY trainid",
        function(err, rows, fields) {
            if (err) throw err;
            var outObj = {};
            outObj.runners = [];
            for (var i = 0; i < rows.length; i++) {
                outObj.runners.push(rows[i]);
            }
            out = JSON.stringify(outObj);
            socketRef.emit('allData', out);
            console.log('sent init data');
        });
    });

    socket.on('sendevent', function (data){
        // Data recieved from runner

        // emit data to clients
        io.sockets.in('clients').emit('sendfromserver', data);

        // save to database
        connection.query('INSERT INTO traintracker_tracks SET trainid = '+connection.escape(data.id)+', lat = '+connection.escape(data.lat)+', lon = '+connection.escape(data.lon)+', speed = '+connection.escape(data.speed)+', time = '+connection.escape(data.time)+'',
        function(err, rows, fields) {
            if (err) throw err;
        });
    });

    socket.on('trainConnect', function (data){
        console.log(data);
    });

    //when recived an alert from a train this alert should be pushed to the clients. 
    socket.on('trainAlert', function (data){
	sender.send(message, registrationIds, 4, function (err, result) {
	    console.log("result: " + result);
	});
    });
});

process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)");
    connection.end();
    process.exit();
})
