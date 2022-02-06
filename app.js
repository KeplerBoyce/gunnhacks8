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
            rooms[data.roomcode] = {usernames: [data.username], userIds: [socket.id], answer: "", score0: 0, score1: 0};
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
                var usernames = rooms[data.roomcode].usernames;
                var userIds = rooms[data.roomcode].userIds;
                var opponentId;
                if (usernames[0] === data.username) opponentId = userIds[1];
                else opponentId = userIds[0];
                console.log(rooms);
                socket.broadcast.emit('opponentJoin', {idValue: opponentId, username: data.username});
                console.log(data.username + ' joined room ' + data.roomcode);
            }
        } else {
            socket.emit('invalidCode', data.roomcode);
            console.log('room ' + data.roomcode + ' does not exist');
        }
    });
    socket.on('requestOpponentName', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        if (usernames[1] === data.username) socket.emit('returnOpponentName', {opponentName: usernames[0]});
        else if (usernames.length === 2) socket.emit('returnOpponentName', {opponentName: usernames[1]});
    });
    socket.on('requestId', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var userIds = rooms[data.roomcode].userIds;
        var id = userIds[usernames.indexOf(data.username)];
        socket.emit('returnId', {idValue: id});
    });
    socket.on('requestAnswersAndGuesses', function(data) {
        var answer;
        if (rooms[data.roomcode].answer === "") {
            answer = answerList[Math.floor(Math.random()*answerList.length)];
            rooms[data.roomcode].answer = answer;
        } else {
            answer = rooms[data.roomcode].answer;
        }
        socket.emit('answersAndGuesses', {answers: answerList, guesses: guessList, answer: answer});
        console.log('sent answer and guess lists to client');
    });
    socket.on('sendColorsToServer', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var userIds = rooms[data.roomcode].userIds;
        var opponentId;
        if (usernames[0] === data.username) opponentId = userIds[1];
        else opponentId = userIds[0];
        socket.broadcast.emit('sendColorsToClient', {idValue: opponentId, colors: data.colors, row: data.row});
        console.log('sent colors to session id ' + opponentId);
    });
    socket.on("requestOpponentIdAndName", function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var userIds = rooms[data.roomcode].userIds;
        var opponentId, username;
        if (usernames[0] === data.username) {
            opponentId = userIds[1];
            username = rooms[data.roomcode].usernames[1];
        } else {
            opponentId = userIds[0];
            username = rooms[data.roomcode].usernames[0];
        }
        socket.emit('opponentIdAndName', {idValue: opponentId, username: username});
        console.log('sent opponent id and name to ' + socket.id);
    });
    socket.on('startOpponentGame', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var userIds = rooms[data.roomcode].userIds;
        var id;
        if (usernames[0] === data.username) id = userIds[0];
        else id = userIds[1];
        socket.broadcast.emit('startGame', {idValue: id});
        console.log('started game for ' + id);
    });
    socket.on('win', function(data) {
        var userIds = rooms[data.roomcode].userIds;
        var usernames = rooms[data.roomcode].usernames;
        var opponentId;
        if (usernames[0] === data.username) {
            rooms[data.roomcode].score0++;
            opponentId = userIds[1];
        } else {
            rooms[data.roomcode].score1++;
            opponentId = userIds[0];
        }
        socket.broadcast.emit('opponentWon', {idValue: opponentId});
        console.log('player ' + socket.id + ' won the round');
    });
    socket.on('requestScores', function(data) {
        console.log(data.username);
        if (rooms[data.roomcode].usernames.indexOf(data.username) == 0) socket.broadcast.emit('updateScores', {roomcode: data.roomcode, leftscore: rooms[data.roomcode].score1, rightscore: rooms[data.roomcode].score0});
        else socket.broadcast.emit('updateScores', {roomcode: data.roomcode, leftscore: rooms[data.roomcode].score0, rightscore: rooms[data.roomcode].score1});
    });
    socket.on('disconnect', function() {
        console.log("a user disconnected");
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
