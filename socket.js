const { Server } = require("socket.io");
const pickupManager = require("./utils/pickupManager");

/**
 * @param {import('http').Server} server
 */
module.exports = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });
  const pickupNamespace = io.of("/pickup");
  pickupManager.bindNamespace(pickupNamespace);
  return io;
};
