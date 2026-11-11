const { connect } = require("mongoose");

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) throw new Error();

module.exports = async () => await connect(MONGO_URL, { dbName: "elcamino" });
