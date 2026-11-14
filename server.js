require("dotenv").config();
const logger = require("./config/logger");

const http = require("http");
const app = require("./app");
const connectMongo = require("./config/mongo");
const rabbit = require("./utils/rabbit");
const io = require("./socket");

const PORT = process.env.PORT || 4334;

async function bootstrap() {
  await connectMongo();
  await rabbit.connect();
  const server = http.createServer(app);
  io(server);
  server.listen(PORT, () =>
    logger.info(`🚀 Server is running on port ${PORT}`),
  );
}

bootstrap();

function shutdown() {
  logger.info("⏳⏳ Graceful shutdown initiated");
  rabbit
    .close()
    .then(() => {
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
