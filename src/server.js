const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(__dirname + "/public"));

// Simpan lokasi DAN ALAMAT driver & penumpang
let driverLocation = null;
let penumpangLocation = null;

let drivers = {}; // { driverId: socketId }
let orders = [];  // { orderId, passengerId, driverId, ... }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Kirim lokasi terakhir ke client baru yang baru connect
  socket.emit("locations", { 
    driver: driverLocation, 
    penumpang: penumpangLocation 
  });

  // Register driver
  socket.on('registerDriver', (driverId) => {
    drivers[driverId] = socket.id;
  });

  // Order created by passenger
  socket.on('createOrder', (order) => {
    orders.push(order);
    // Notify driver
    if (drivers[order.driverId]) {
      io.to(drivers[order.driverId]).emit('newOrder', order);
    }
  });

  // Driver accepts order
  socket.on('acceptOrder', (orderId, driverId) => {
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = 'accepted';
      // Notify passenger
      io.to(order.passengerSocketId).emit('orderAccepted', order);
    }
  });

  // Chat message
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  // Update lokasi driver/penumpang DENGAN ALAMAT
  socket.on("update location", (data) => {
    const { role, pos, address } = data; // Terima alamat juga
    
    if (role === "driver") {
      driverLocation = { 
        lat: pos.lat, 
        lng: pos.lng,
        address: address || "" // Simpan alamat
      };
      console.log("Driver update:", address || `${pos.lat}, ${pos.lng}`);
    }
    
    if (role === "penumpang") {
      penumpangLocation = { 
        lat: pos.lat, 
        lng: pos.lng,
        address: address || "" // Simpan alamat
      };
      console.log("Penumpang update:", address || `${pos.lat}, ${pos.lng}`);
    }

    // Broadcast ke SEMUA client (termasuk yang update)
    io.emit("locations", { 
      driver: driverLocation, 
      penumpang: penumpangLocation 
    });
  });

  // Save passenger socket id for chat
  socket.on('registerPassenger', (passengerId) => {
    socket.passengerId = passengerId;
    // Optionally save mapping for chat
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Socket.io server aktif!');
});

server.listen(3000, () => {
  console.log("Server running di http://localhost:3000");
});