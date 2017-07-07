var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    mysql = require('mysql'),
    nicknames = [],
    users={};

server.listen(3000);

var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'chat'
});
connection.connect(function (err) {
    if (err) throw err;
    console.log("Mysql Connected!");
});

app.get('/', function (req, res)
{
    res.sendFile(__dirname + '/index.html');
});


io.sockets.on('connection', function (socket)
{
    connection.query('SELECT * FROM messages', function (err, docs) {
        if (err) throw err;
        socket.emit('load old msgs', docs);
    });


    socket.on('new user', function (data, callback)
    {
        if (data in users){
            callback(false);
        } else {
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            updateNicknames();
        }
    });

    function updateNicknames() {
        io.sockets.emit('usernames', Object.keys(users));
    };

   socket.on('send message', function (data, callback)
   {
       var  msg = data.trim();
       if (msg.substr(0,3) === '/w ')
       {
            msg = msg.substr(3);
            var ind = msg.indexOf(' ');
            if (ind !== -1){
                var name = msg.substr(0, ind);
                var msg = msg.substr(ind + 1);
                if (name in users){
                    users[name].emit('whisper', {msg: msg, nick: socket.nickname});
                }else {
                    callback('Error! Enter a Valid user !');
                }

            }else {
                callback('Error! Please enter a message for your whisper !');
            }
       }else {

           var newMsg = {msg: msg, nick: socket.nickname};
           connection.query('INSERT INTO messages SET ?',newMsg, function (err) {
               if(err) throw err;
               console.log('Data inserted !')
           });

           io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
       }

   });

   socket.on('disconnect', function (data) {
      if (!socket.nickname) return;
      delete users[socket.nickname];
       updateNicknames();
   });



});