const { connect } = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error();
}

module.exports = async () => await connect(MONGO_URI, { dbName: "elcamino" });
