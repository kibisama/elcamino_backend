const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const connect = require("../config/mongo");
const Setting = require("../models/setting");

/**
 * @type {Setting.StoreSchema}
 */
const store = {
  name: "El Camino Pharmacy Inc.",
  street: "10940 Victory Blvd.",
  city: "North Hollywood",
  state: "CA",
  zip: "91606",
  phone: "(818) 763-4334",
  fax: "(818) 763-4610",
  email: "elcaminopharmacy@gmail.com",
  managerLN: "Chang",
  managerFN: "Janice",
};

(async function () {
  try {
    await connect();
    const ex = await Setting.findOne();
    if (ex) return;
    await Setting.create({ store });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit();
  }
})();
