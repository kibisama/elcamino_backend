require("dotenv").config();
const logger = require("./config/logger");

const http = require("http");
const app = require("./app");
const connectMongo = require("./config/mongo");
const io = require("./socket");

const PORT = process.env.PORT || 4334;

async function bootstrap() {
  await connectMongo();
  const server = http.createServer(app);
  io(server);
  server.listen(PORT, () =>
    logger.info(`🚀 Server is running on port ${PORT}`)
  );
}

bootstrap();
