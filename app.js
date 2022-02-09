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
            rooms[data.roomcode] = {usernames: [data.username], userIds: [socket.id], answer: "", score0: 0, score1: 0, timers: [], heartbeats: []}
            var logoffTimer = setTimeout(function() {
                io.emit('returnToMainMenu', {roomcode: data.roomcode, username: data.username});
                var usernames = rooms[data.roomcode].usernames;
                var userIds = rooms[data.roomcode].userIds;
                if (usernames.length === 1) {
                    delete rooms[data.roomcode];
                    console.log("user " + data.username + " left room; room was deleted");
                } else {
                    var opponentName;
                    if (usernames[0] === data.username) {
                        opponentName = usernames[1];
                        rooms[data.roomcode].usernames = usernames.splice(0, 1);
                        rooms[data.roomcode].userIds = userIds.splice(0, 1);
                    } else {
                        opponentName = usernames[0];
                        rooms[data.roomcode].usernames = usernames.splice(1, 1);
                        rooms[data.roomcode].userIds = userIds.splice(1, 1);
                    }
                    socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: data.username, opponentName: opponentName});
                    console.log("user " + data.username + " left room");
                }
            }, 1200000);
            rooms[data.roomcode].timers.push(logoffTimer);
            var usernames = rooms[data.roomcode].usernames;
            var index;
            if (usernames[0] === data.username) index = 0;
            else index = 1;
            var heartbeatTimer  = setTimeout(function() {
                console.log(usernames.length + " in room");
                if (usernames.length === 1) {
                    delete rooms[data.roomcode];
                    console.log("user " + usernames[index] + " left room; room was deleted");
                } else {
                    socket.broadcast.emit('opponentDisconnect', {roomcode: data.roomcode, username: data.username});
                    rooms[data.roomcode].usernames.splice(index, 1);
                    rooms[data.roomcode].userIds.splice(index, 1);
                    rooms[data.roomcode].timers.splice(index, 1);
                    rooms[data.roomcode].heartbeats.splice(index, 1);
                    socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: usernames[index], opponentName: usernames[1 - index]});
                    console.log("user " + usernames[index] + " left room");
                }
                socket.emit('forceReturn');
            }, 3000);
            rooms[data.roomcode].heartbeats.push(heartbeatTimer);
            socket.emit('joinRoom', {username: data.username, roomcode: data.roomcode});
            console.log(data.username + ' created room ' + data.roomcode);
        }
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
                var logoffTimer = setTimeout(function() {
                    io.emit('returnToMainMenu', {roomcode: data.roomcode, username: data.username});
                    var usernames = rooms[data.roomcode].usernames;
                    var userIds = rooms[data.roomcode].userIds;
                    if (usernames.length === 1) {
                        delete rooms[data.roomcode];
                        console.log("user " + data.username + " kicked for inactivity; room was deleted");
                    } else {
                        var opponentName;
                        if (usernames[0] === data.username) {
                            opponentName = usernames[1];
                            rooms[data.roomcode].usernames = usernames.splice(0, 1);
                            rooms[data.roomcode].userIds = userIds.splice(0, 1);
                        } else {
                            opponentName = usernames[0];
                            rooms[data.roomcode].usernames = usernames.splice(1, 1);
                            rooms[data.roomcode].userIds = userIds.splice(1, 1);
                        }
                        socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: data.username, opponentName: opponentName});
                        console.log("user " + data.username + " kicked for inactivity");
                    }
                }, 1200000);
                rooms[data.roomcode].timers.push(logoffTimer);
                var usernames = rooms[data.roomcode].usernames;
                var index;
                if (usernames[0] === data.username) index = 0;
                else index = 1;
                var heartbeatTimer  = setTimeout(function() {
                    console.log(usernames.length + " in room");
                    if (usernames.length === 1) {
                        delete rooms[data.roomcode];
                        console.log("user " + usernames[index] + " left room; room was deleted");
                    } else {
                        socket.broadcast.emit('opponentDisconnect', {roomcode: data.roomcode, username: data.username});
                        rooms[data.roomcode].usernames.splice(index, 1);
                        rooms[data.roomcode].userIds.splice(index, 1);
                        rooms[data.roomcode].timers.splice(index, 1);
                        rooms[data.roomcode].heartbeats.splice(index, 1);
                        socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: usernames[index], opponentName: usernames[1 - index]});
                        console.log("user " + usernames[index] + " left room");
                    }
                    socket.emit('forceReturn');
                }, 3000);
                rooms[data.roomcode].heartbeats.push(heartbeatTimer);
                socket.emit('joinRoom', {username: data.username, roomcode: data.roomcode});
                var usernames = rooms[data.roomcode].usernames;
                var userIds = rooms[data.roomcode].userIds;
                var opponentId;
                if (usernames[0] === data.username) opponentId = userIds[1];
                else opponentId = userIds[0];
                socket.broadcast.emit('opponentJoin', {idValue: opponentId, username: data.username});
                console.log(data.username + ' joined room ' + data.roomcode);
            }
        } else {
            socket.emit('invalidCode', data.roomcode);
            console.log('room ' + data.roomcode + ' does not exist');
        }
    });
    socket.on('resetTimer', function(data) {
        if (data.roomcode in rooms) {
            var usernames = rooms[data.roomcode].usernames;
            if (usernames[0] === data.username) {
                clearTimeout(rooms[data.roomcode].timers[0]);
                rooms[data.roomcode].timers[0] = setTimeout(function() {
                    socket.emit('returnToMainMenu', {roomcode: data.roomcode, username: usernames[0]});
                    if (usernames.length === 1) {
                        delete rooms[data.roomcode];
                        console.log("user " + usernames[0] + " left room; room was deleted");
                    } else {
                        socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: usernames[0], opponentName: usernames[1]});
                        console.log("user " + usernames[0] + " left room");
                    }
                }, 1200000);
            } else {
                clearTimeout(rooms[data.roomcode].timers[1]);
                rooms[data.roomcode].timers[1] = setTimeout(function() {
                    socket.emit('returnToMainMenu', {roomcode: data.roomcode, username: usernames[1]});
                    if (usernames.length === 1) {
                        delete rooms[data.roomcode];
                        console.log("user " + usernames[1] + " left room; room was deleted");
                    } else {
                        rooms[data.roomcode].usernames.splice(index, 1);
                        rooms[data.roomcode].userIds.splice(index, 1);
                        rooms[data.roomcode].timers.splice(index, 1);
                        rooms[data.roomcode].heartbeats.splice(index, 1);
                        socket.broadast.emit('userLeft', {roomcode: data.roomcode, username: usernames[1], opponentName: usernames[0]});
                        console.log("user " + usernames[1] + " left room");
                    }
                }, 1200000);
            }
        }
    });
    socket.on('requestOpponentName', function(data) {
        if (!(data.roomcode in rooms) || data.roomcode === null) socket.emit('forceReturn');
        else if (rooms[data.roomcode].usernames.indexOf(data.username) < 0) socket.emit('forceReturn');
        else {
            var usernames = rooms[data.roomcode].usernames;
            if (usernames[1] === data.username) socket.emit('returnOpponentName', {opponentName: usernames[0]});
            else if (usernames.length === 2) socket.emit('returnOpponentName', {opponentName: usernames[1]});
        }
    });
    socket.on('requestId', function(data) {
        if (!(data.roomcode in rooms) || data.roomcode === null) socket.emit('forceReturn');
        else if (rooms[data.roomcode].usernames.indexOf(data.username) < 0) socket.emit('forceReturn');
        else {
            var usernames = rooms[data.roomcode].usernames;
            var userIds = rooms[data.roomcode].userIds;
            var id = userIds[usernames.indexOf(data.username)];
            socket.emit('returnId', {idValue: id});
        }
    });
    socket.on('requestAnswersAndGuesses', function(data) {
        if (!(data.roomcode in rooms) || data.roomcode === null) socket.emit('forceReturn');
        else if (rooms[data.roomcode].usernames.indexOf(data.username) < 0) socket.emit('forceReturn');
        else {
            var answer;
            if (rooms[data.roomcode].answer === "") {
                answer = answerList[Math.floor(Math.random()*answerList.length)];
                rooms[data.roomcode].answer = answer;
            } else {
                answer = rooms[data.roomcode].answer;
            }
            socket.emit('answersAndGuesses', {answers: answerList, guesses: guessList, answer: answer});
            console.log('sent answer and guess lists to client');
        }
    });
    socket.on('sendColorsToServer', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var opponentName;
        if (usernames[0] === data.username) opponentName = usernames[1];
        else opponentName = usernames[0];
        socket.broadcast.emit('sendColorsToClient', {roomcode: data.roomcode, opponentName: opponentName, colors: data.colors, row: data.row});
        console.log('sent colors to user ' + opponentName);
    });
    socket.on("requestOpponentIdAndName", function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var userIds = rooms[data.roomcode].userIds;
        var opponentId, opponentName;
        if (usernames[0] === data.username) {
            opponentId = userIds[1];
            username = rooms[data.roomcode].usernames[1];
        } else {
            opponentId = userIds[0];
            username = rooms[data.roomcode].usernames[0];
        }
        socket.emit('opponentIdAndName', {idValue: opponentId, username: opponentName});
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
        var usernames = rooms[data.roomcode].usernames;
        var opponentName;
        if (usernames[0] === data.username) {
            rooms[data.roomcode].score1++;
            opponentName = usernames[1];
        } else {
            rooms[data.roomcode].score0++;
            opponentName = usernames[0];
        }
        socket.broadcast.emit('opponentWon', {username: data.username, opponentName: opponentName, roomcode: data.roomcode});
        console.log('player ' + socket.id + ' won the round');
    });
    socket.on('fillOpponentGrid', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var opponentName;
        if (usernames[0] === data.username) opponentName = usernames[1];
        else opponentName = usernames[0];
        socket.broadcast.emit('transferGrid', {roomcode: data.roomcode, opponentName: opponentName, grid: data.grid});
    });
    socket.on('requestScores', function(data) {
        if (!(data.roomcode in rooms) || data.roomcode === null) socket.emit('forceReturn');
        else if (rooms[data.roomcode].usernames.indexOf(data.username) < 0) socket.emit('forceReturn');
        else {
            console.log(data.username + " requested scores, won=" + data.won);
            var usernames = rooms[data.roomcode].usernames;
            if (usernames.indexOf(data.username) === 0) socket.emit('updateScores', {opponentName: usernames[1], roomcode: data.roomcode, leftscore: rooms[data.roomcode].score1, rightscore: rooms[data.roomcode].score0, first: usernames[0]});
            else socket.emit('updateScores', {opponentName: usernames[0], roomcode: data.roomcode, leftscore: rooms[data.roomcode].score0, rightscore: rooms[data.roomcode].score1, first: usernames[0]});
        }
    });
    socket.on('requestNewAnswer', function(data) {
        var answer = answerList[Math.floor(Math.random()*answerList.length)];
        rooms[data.roomcode].answer = answer;
        io.emit('newAnswer', {roomcode: data.roomcode, answer: answer});
    });
    socket.on('outOfGuesses', function(data) {
        var usernames = rooms[data.roomcode].usernames;
        var opponentName;
        if (usernames[0] === data.username) opponentName = usernames[1];
        else opponentName = usernames[0];
        socket.broadcast.emit('noGuesses', {roomcode: data.roomcode, username: data.username, opponentName: opponentName, first: usernames[0]});
    });
    socket.on('tied', function(data) {
        socket.broadcast.emit('tiedGame', {roomcode: data.roomcode, username: data.username, first: rooms[data.roomcode].usernames[0]});
    });
    socket.on('leaveRoom', function(data) {
        if (data.roomcode in rooms) {
            var usernames = rooms[data.roomcode].usernames;
            if (usernames.length === 1) {
                delete rooms[data.roomcode];
                console.log("user " + data.username + " left room; room was deleted");
            } else {
                var opponentName;
                if (usernames[0] === data.username) {
                    opponentName = usernames[1];
                    rooms[data.roomcode].usernames.splice(0, 1);
                    rooms[data.roomcode].userIds.splice(0, 1);
                    rooms[data.roomcode].timers.splice(0, 1);
                    rooms[data.roomcode].heartbeats.splice(0, 1);
                } else {
                    opponentName = usernames[0];
                    rooms[data.roomcode].usernames.splice(1, 1);
                    rooms[data.roomcode].userIds.splice(1, 1);
                    rooms[data.roomcode].timers.splice(1, 1);
                    rooms[data.roomcode].heartbeats.splice(1, 1);
                }
                socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: data.username, opponentName: opponentName});
                console.log("user " + data.username + " left room");
            }
        }
    });
    socket.on('heartbeat', function(data) {
        if (data.roomcode in rooms &&
        rooms[data.roomcode].usernames.indexOf(data.username) > -1) {
            var usernames = rooms[data.roomcode].usernames;
            var index;
            if (usernames[1] === data.username) index = 1;
            else index = 0;
            clearTimeout(rooms[data.roomcode].heartbeats[index]);
            rooms[data.roomcode].heartbeats[index] = setTimeout(function() {
                if (data.roomcode in rooms) {
                    console.log(usernames.length + " in room");
                    if (usernames.length === 1) {
                        delete rooms[data.roomcode];
                        console.log("user " + usernames[index] + " left room; room was deleted");
                    } else {
                        socket.broadcast.emit('opponentDisconnect', {roomcode: data.roomcode, username: data.username});
                        rooms[data.roomcode].usernames.splice(index, 1);
                        rooms[data.roomcode].userIds.splice(index, 1);
                        rooms[data.roomcode].timers.splice(index, 1);
                        rooms[data.roomcode].heartbeats.splice(index, 1);
                        socket.broadcast.emit('userLeft', {roomcode: data.roomcode, username: usernames[index], opponentName: usernames[1 - index]});
                        console.log("user " + usernames[index] + " left room");
                    }
                    socket.emit('forceReturn');
                }
            }, 3000);
        }
    });
    socket.on('disconnect', function() {
        console.log("a user disconnected");
    });
});

const PORT = process.env.PORT || 8080;
http.listen(PORT, function() {
    console.log('listening on ' + PORT);
});

module.exports = http;
