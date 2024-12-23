const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const pubClient = createClient({
  url: "redis://default:6Xi8qA5SJ39rLRDL8X82v2RxbpVFFkTq@redis-19451.c264.ap-south-1-1.ec2.redns.redis-cloud.com:19451",
});
const subClient = pubClient.duplicate();

(async () => {
  await pubClient.connect();
  await subClient.connect();
  console.log(`Connected to Redis on port ${PORT}`);

  io.adapter(createAdapter(pubClient, subClient));
})();

const players = {};

app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  console.log(`Player connected to ${PORT}: ${socket.id}`);
  console.log(`Total connected users: ${io.sockets.sockets.size}`);
  players[socket.id] = {
    x: Math.random() * 800 + 100,
    y: Math.random() * 600 + 100,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  };

  io.emit("updatePlayers", players);

  socket.on("move", (keys) => {
    const player = players[socket.id];
    if (!player) return;

    const speed = 5;

    if (keys.ArrowUp) player.y -= speed;
    if (keys.ArrowDown) player.y += speed;
    if (keys.ArrowLeft) player.x -= speed;
    if (keys.ArrowRight) player.x += speed;

    player.x = Math.max(20, Math.min(800, player.x));
    player.y = Math.max(20, Math.min(600, player.y));

    io.emit("updatePlayers", players);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected from ${PORT}: ${socket.id}`);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
