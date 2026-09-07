const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== path.basename(__filename) &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    router.use("/" + file.slice(0, -3), require(path.join(__dirname, file)));
  });

module.exports = router;
