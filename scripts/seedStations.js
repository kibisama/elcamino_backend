const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const connect = require("../config/mongo");
const DeliveryStation = require("../models/deliveryStation");

/**
 * @type {DeliveryStation.DeliveryStationSchema[]}
 */
const stations = [
  {
    displayName: "LH Detox",
    name: "CRI-Help Inc. Lincoln Heights Detox",
    invoiceCode: "CLD",
    address: "3619 N. Mission Rd.",
    city: "Los Angeles",
    state: "CA",
    zip: "90031",
    phone: "(818) 985-8323",
  },
  {
    displayName: "LH Res",
    name: "CRI-Help Inc. Lincoln Heights Residential",
    invoiceCode: "CLR",
    address: "3619 N. Mission Rd.",
    city: "Los Angeles",
    state: "CA",
    zip: "90031",
    phone: "(818) 985-8323",
  },
  {
    displayName: "Pfleger Detox",
    name: "CRI-Help Inc. Pfleger Detox",
    invoiceCode: "CPD",
    address: "11027 Burbank Blvd.",
    city: "North Hollywood",
    state: "CA",
    zip: "91605",
    phone: "(818) 761-1652",
  },
  {
    displayName: "Pfleger Res",
    name: "CRI-Help Inc. Pfleger Residential",
    invoiceCode: "CPR",
    address: "11027 Burbank Blvd.",
    city: "North Hollywood",
    state: "CA",
    zip: "91605",
    phone: "(818) 985-8323",
  },
  {
    displayName: "Socorro Detox",
    name: "CRI-Help Inc. Socorro Detox",
    invoiceCode: "CSD",
    address: "4445 Burns Ave.",
    city: "Los Angeles",
    state: "CA",
    zip: "90029",
    phone: "(818) 985-8323",
  },
  {
    displayName: "Socorro Res",
    name: "CRI-Help Inc. Socorro Residential",
    invoiceCode: "CSR",
    address: "4445 Burns Ave.",
    city: "Los Angeles",
    state: "CA",
    zip: "90029",
    phone: "(818) 985-8323",
  },
  {
    displayName: "Teen Project",
    name: "The Teen Project",
    invoiceCode: "TTP",
    address: "14530 Sylvan St.",
    city: "Van Nuys",
    state: "CA",
    zip: "91411",
    phone: "(818) 582-8839",
  },
];

(async function () {
  try {
    await connect();
    const ex = await DeliveryStation.findOne();
    if (ex) return;
    await DeliveryStation.insertMany(stations);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit();
  }
})();
