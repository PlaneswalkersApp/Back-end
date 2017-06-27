const app = require('http').createServer();
const io = require('socket.io')(app);
const fs = require('fs');
const SerialPort = require('serialport');

const arduino = new SerialPort('/dev/cu.usbmodem1411', {
  baudRate: 9600,
  parser: SerialPort.parsers.readline("\r\n")
});

app.listen(3000);

const planes = {}

io.on('connection', socket => {
  socket.on('joinPlane', data => {
    socket.join(data.planeId);

    if (io.sockets.adapter.sids[socket.id][data.planeId]) {
      createRoom(data.planeId);
      addPlayerToPlane(data.planeId, data.playerId, socket.id, data.playerNickname, data.leader);

      socket.emit('joinedPlane', {
        joined: true,
        initialPlaneData: planes[data.planeId]
      });

      socket.broadcast.in(data.planeId).emit('player', {
        id: data.playerId,
        socketId: socket.id,
        nickname: data.playerNickname,
        leader: data.playerLeader
      });
    }
  });

  socket.on('start', data => {
    socket.broadcast.in(data.planeId).emit('start', data.initialLifeTotal);
  });

  socket.on('playerLifeChange', data => {
    socket.broadcast.in(data.planeId).emit('playerLifeChange', {
      playerId: data.playerId,
      lifeChange: data.lifeChange
    });
  });

  socket.on('reset', data => {
    socket.broadcast.in(data.planeId).emit('reset', data);
  });
});

arduino.on('data', id => {
  io.sockets.emit('cardPlayed', id);
});

function createRoom(planeId) {
  if (!planes[planeId]) {
    planes[planeId] = {
      players: []
    }
  }
}

function addPlayerToPlane(planeId, playerId, socketId, playerNickname, playerLeader) {
  planes[planeId].players.push({
    playerId,
    socketId,
    nickname: playerNickname,
    leader: playerLeader
  });
}
