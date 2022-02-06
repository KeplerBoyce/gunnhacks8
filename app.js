var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

rooms = [];
io.on('connection', function(socket) {
    console.log('A user connected');
    socket.on('attemptCreate', function(data) {
        var roomIndex = -1;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].roomcode == data.roomcode) roomIndex = i;
        }
        if (roomIndex > -1) {
            socket.emit('roomCodeTaken', data.roomcode);
            console.log('room code ' + data.roomcode + ' is taken');
        } else {
            rooms.push({roomcode: data.roomcode, users: [data.username]});
            socket.emit('joinRoom', data.roomcode);
            console.log(data.username + ' created room ' + data.roomcode);
        }
    })
    socket.on('attemptJoin', function(data) {
        var roomIndex = -1;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].roomcode == data.roomcode) roomIndex = i;
        }
        if (roomIndex > -1) {
            if (rooms[roomIndex].users.indexOf(data.username) > -1) {
                socket.emit('userAlreadyInRoom', {username: data.username, roomcode: data.roomcode});
                console.log('Already a user ' + data.username + ' in room ' + data.roomcode);
            } else {
                rooms[roomIndex].users.push(data.username);
                console.log(data.username + ' joined room ' + data.roomcode);
            }
        } else {
            socket.emit('invalidCode', data.roomcode);
            console.log('room ' + data.roomcode + ' does not exist');
        }
    })
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
