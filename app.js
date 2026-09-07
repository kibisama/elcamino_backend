const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");

const app = express();
app.use(cors({ origin: "*" }));
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());

app.use("/health", (req, res) => res.sendStatus(200));
app.use("/api", require("./routes"));

// app.use((req, res, next) => {
//   const error = new Error(`${req.method} ${req.url} A router does not exist.`);
//   error.status = 404;
//   next(error);
// });
// const logger = require("./logger");

// app.use((err, req, res, next) => {
//   logger.log({
//     level: "error",
//     message: err.message,
//     stack: err.stack,
//     timestamp: new Date().toString(),
//     req_ip: req.ip,
//   });
//   res.sendStatus(err.status || 500);
// });

module.exports = app;
