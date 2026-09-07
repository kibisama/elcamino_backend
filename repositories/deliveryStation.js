const E = require("../utils/error");
const DeliveryStation = require("../models/deliveryStation");
/**
 * @param {DeliveryStation.CreateDeliveryInput} param
 * @returns {Promise<DeliveryStation.DeliveryStationLean>}
 */
exports.create = async (param) => {
  const station = await DeliveryStation.create(param);
  return station.toObject();
};

/**
 * @param {string} invoiceCode
 * @param {number} __v
 * @param {UpdateSetInput<DeliveryStation.DeliveryStationSchema>} update
 * @returns {Promise<DeliveryStation.DeliveryStationLean>}
 */
exports.update = async (invoiceCode, __v, update) => {
  const deliveryStation = await DeliveryStation.findOneAndUpdate(
    { invoiceCode, __v },
    { $inc: { __v: 1 }, $set: update },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!deliveryStation) throw E.conflict();
  return deliveryStation;
};

/**
 * @param {string} invoiceCode
 * @returns {Promise<DeliveryStation.DeliveryStationLean>}
 */
exports.findByInvoiceCode = async (invoiceCode) => {
  const station = await DeliveryStation.findOne({
    active: true,
    invoiceCode,
  }).lean();
  if (!station) throw E.stationNotFound();
  if (!station.active) throw E.stationNotActive();
  return station;
};

/**
 * @param {string | ObjectId} id
 * @returns {Promise<DeliveryStation.DeliveryStationLean>}
 */
exports.findById = async (id) => {
  const station = await DeliveryStation.findOne({
    active: true,
    _id: id,
  }).lean();
  if (!station) throw E.stationNotFound();
  if (!station.active) throw E.stationNotActive();
  return station;
};

/**
 * @returns {Promise<DeliveryStation.DeliveryStationLean[]>}
 */
exports.getAll = async () => await DeliveryStation.find().lean();

/**
 * @returns {Promise<Pick<DeliveryStation.DeliveryStationLean, "displayName" | "invoiceCode">[]>}
 */
exports.getMenuItems = async () =>
  await DeliveryStation.find(
    { active: true },
    { _id: 0, displayName: 1, invoiceCode: 1 },
    { sort: { displayName: 1 } },
  ).lean();

/**
 * @returns {Promise<Pick<DeliveryStation.DeliveryStationLean, "_id" | "automationPrefixes">[]>}
 */
exports.getAutomationPrefixes = async () =>
  await DeliveryStation.find(
    { active: true, useAutomation: true },
    { automationPrefixes: 1 },
  ).lean();
