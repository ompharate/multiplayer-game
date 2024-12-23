const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const app = express();
const server = http.createServer(app);

// Assuming your instance runs on different ports like 3000, 3001, 3002, etc.
const PORT = process.env.PORT || 3000; // Make sure to set different ports for each instance

const io = new Server(server, {
  cors: {
    origin: "*", // Frontend URL
    methods: ["GET", "POST"],
  },
});

// Configure Redis
const pubClient = createClient({
  url: "redis://default:6Xi8qA5SJ39rLRDL8X82v2RxbpVFFkTq@redis-19451.c264.ap-south-1-1.ec2.redns.redis-cloud.com:19451",
});
const subClient = pubClient.duplicate();

// Setup Redis adapter for Socket.IO
(async () => {
  await pubClient.connect();
  await subClient.connect();
  console.log(`Connected to Redis on port ${PORT}`);

  io.adapter(createAdapter(pubClient, subClient));
})();

const players = {};

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log(`Player connected to ${PORT}: ${socket.id}`);

  // Initialize player
  players[socket.id] = {
    x: Math.random() * 800 + 100,
    y: Math.random() * 600 + 100,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  };

  // Broadcast updated players to all clients
  io.emit("updatePlayers", players);

  // Handle player movement
  socket.on("move", (keys) => {
    const player = players[socket.id];
    if (!player) return;

    const speed = 5;

    if (keys.ArrowUp) player.y -= speed;
    if (keys.ArrowDown) player.y += speed;
    if (keys.ArrowLeft) player.x -= speed;
    if (keys.ArrowRight) player.x += speed;

    // Keep the player within bounds
    player.x = Math.max(20, Math.min(800, player.x));
    player.y = Math.max(20, Math.min(600, player.y));

    io.emit("updatePlayers", players);
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected from ${PORT}: ${socket.id}`);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
