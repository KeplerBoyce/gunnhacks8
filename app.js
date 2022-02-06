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
app.get('/game.html', function(req, res) {
    res.sendFile(__dirname + '/game.html');
});

rooms = [];
io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('attemptCreate', function(data) {
        if (data.roomcode in rooms) {
            socket.emit('roomCodeTaken', data.roomcode);
            console.log('room code ' + data.roomcode + ' is taken');
        } else {
            rooms[data.roomcode] = [data.username];
            socket.emit('joinRoom', data.roomcode);
            console.log(data.username + ' created room ' + data.roomcode);
        }
        console.log(rooms);
    });
    socket.on('attemptJoin', function(data) {
        if (data.roomcode in rooms) {
            if (rooms[data.roomcode].length === 2) {
                socket.emit('roomFull', data.roomcode);
                console.log('Cannot join; room ' + data.roomcode + ' is full');
            } else if (rooms[data.roomcode].indexOf(data.username) > -1) {
                socket.emit('userAlreadyInRoom', {username: data.username, roomcode: data.roomcode});
                console.log('Already a user ' + data.username + ' in room ' + data.roomcode);
            } else {
                rooms[data.roomcode].push(data.username);
                socket.emit('joinRoom', data.roomcode);
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
    });
    socket.on('disconnect', function() {
        console.log("a user disconnected");
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
