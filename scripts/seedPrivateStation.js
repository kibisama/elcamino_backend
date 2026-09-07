const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const connect = require("../config/mongo");
const DeliveryStation = require("../models/deliveryStation");

const station = {
  displayName: "Private",
  name: "Private Deliveries",
  invoiceCode: "PRI",
  address: "Private Deliveries",
  city: "North Hollywood",
  state: "CA",
  zip: "91606",
  phone: "(818) 763-4334",
};

(async function () {
  try {
    await connect();
    const ex = await DeliveryStation.findOne({
      invoiceCode: station.invoiceCode,
    });
    if (ex) return;
    await DeliveryStation.insertMany([station]);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit();
  }
})();
