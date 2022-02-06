var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var answerList = fs.readFileSync('wordleanswers.txt', 'utf8').split('\n');
var guessList = fs.readFileSync('wordleguesses.txt', 'utf8').split('\n');
answerList.forEach(word => {
    guessList.push(word);
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/lobby.html', function(req, res) {
    res.sendFile(__dirname + '/lobby.html');
});
app.get('/game.html', function(req, res) {
    res.sendFile(__dirname + '/game.html');
});

rooms = [];
io.on('connection', function(socket) {
    console.log('a user connected, id=' + socket.id);
    socket.on('attemptCreate', function(data) {
        if (data.roomcode in rooms) {
            socket.emit('roomCodeTaken', data.roomcode);
            console.log('room code ' + data.roomcode + ' is taken');
        } else {
            rooms[data.roomcode] = {usernames: [data.username], userIds: [socket.id]};
            socket.emit('joinRoom', {username: data.username, roomcode: data.roomcode});
            console.log(data.username + ' created room ' + data.roomcode);
        }
        console.log(rooms);
    });
    socket.on('attemptJoin', function(data) {
        if (data.roomcode in rooms) {
            if (rooms[data.roomcode].userIds.length === 2) {
                socket.emit('roomFull', data.roomcode);
                console.log('can\'t join; room ' + data.roomcode + ' is full');
            } else if (rooms[data.roomcode].usernames.indexOf(data.username) > -1) {
                socket.emit('userAlreadyInRoom', {username: data.username, roomcode: data.roomcode});
                console.log('already a user ' + data.username + ' in room ' + data.roomcode);
            } else {
                rooms[data.roomcode].usernames.push(data.username);
                rooms[data.roomcode].userIds.push(socket.id);
                socket.emit('joinRoom', {username: data.username, roomcode: data.roomcode});
                console.log(data.username + ' joined room ' + data.roomcode);
            }
        } else {
            socket.emit('invalidCode', data.roomcode);
            console.log('room ' + data.roomcode + ' does not exist');
        }
        console.log(rooms);
    });
    socket.on('requestAnswersAndGuesses', function() {
        socket.emit('answersAndGuesses', {answers: answerList, guesses: guessList});
        console.log('sent answer and guess lists to client');
    });
    socket.on('sendColorsToServer', function(data) {
        var userIds = rooms[data.roomcode].userIds;
        var opponentId;
        if (userIds[0] === socket.id) opponentId = userIds[1];
        else opponentId = userIds[0];
        socket.broadcast.emit('sendColorsToClient', {idValue: opponentId, colors: data.colors, row: data.row});
        console.log('sent colors to session id ' + opponentId);
    });
    socket.on("requestOpponentId", function(data) {
        var userIds = rooms[data.roomcode].userIds;
        var opponentId;
        if (userIds[0] === socket.id) opponentId = userIds[1];
        else opponentId = userIds[0];
        socket.emit('opponentId', {idValue: opponentId});
        console.log('sent opponent id to ' + socket.id);
    });
    socket.on('disconnect', function() {
        console.log("a user disconnected");
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
