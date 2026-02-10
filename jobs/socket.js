// backend/socket.js
import { Server as SocketIO } from "socket.io";

let ioInstance = null;

export default function createSocketServer(httpServer) {
  if (ioInstance) return ioInstance;
  ioInstance = new SocketIO(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  ioInstance.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    // optional: if client sends identify with userId, join personal room
    socket.on("identify", (userId) => {
      if (userId) socket.join(userId);
    });
    socket.join("global");
    socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
  });

  return ioInstance;
}
