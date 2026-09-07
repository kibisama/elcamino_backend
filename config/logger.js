const winston = require("winston");
const path = require("path");
const fs = require("fs");

const timestamp = winston.format.timestamp({
  format: () =>
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
});

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormat = winston.format.combine(
  timestamp,
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`,
  ),
);

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

module.exports = logger;
