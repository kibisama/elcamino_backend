const E = require("../utils/error");
const { deliveryStationRepo } = require("../repositories");
const cache = require("../utils/cache");

/**
 * @typedef {import("../models/deliveryStation").DeliveryStationLean} DeliveryStationLean
 * @typedef {Pick<DeliveryStationLean, "displayName" | "invoiceCode">} DisplayMenuItem
 * @typedef {Object} DeliveryStationPrefixes
 * @property {string} id
 * @property {string[]} prefixes
 */

/**
 * @param {string} id
 * @returns {string}
 */
const getIdKey = (id) => `id:${id}`;

/**
 * @param {string} code
 * @returns {string}
 */
const getCodeKey = (code) => `code:${code.toUpperCase()}`;

/**
 * @param {DeliveryStationLean} station
 */
const setCache = (station) => {
  cache.setStation(getIdKey(station._id.toString()), station);
  cache.setStation(getCodeKey(station.invoiceCode), station);
};

/**
 * @param {DeliveryStationLean} station
 */
const delCache = (station) => {
  cache.delStation(getIdKey(station._id.toString()));
  cache.delStation(getCodeKey(station.invoiceCode));
  cache.delDisplayMenuItems();
  cache.delPrefixes();
  cache.delStage(station._id.toString());
};

/**
 * @param {import("../zod/index").CreateStationInput} input
 * @returns {Promise<DeliveryStationLean>}
 */
exports.createStation = async (input) => {
  const station = await deliveryStationRepo.create(input);
  station.active && setCache(station);
  return station;
};

/**
 * @param {string} invoiceCode
 * @param {import("../zod/index").UpdateStationInput} input
 * @returns {Promise<DeliveryStationLean>}
 */
exports.updateStation = async (invoiceCode, { version, data }) => {
  const station = await deliveryStationRepo.update(invoiceCode, version, data);
  delCache(station);
  return station;
};

/**
 * @param {string} invoiceCode
 * @returns {Promise<DeliveryStationLean>}
 */
exports.getStationByCode = async (invoiceCode) => {
  const cached = cache.getStation(getCodeKey(invoiceCode));
  if (cached) return cached;
  const station = await deliveryStationRepo.findByInvoiceCode(invoiceCode);
  setCache(station);
  return station;
};

/**
 * @param {string} id
 * @returns {Promise<DeliveryStationLean>}
 */
exports.getStationById = async (id) => {
  const cached = cache.getStation(getIdKey(id));
  if (cached) return cached;
  const station = await deliveryStationRepo.findById(id);
  setCache(station);
  return station;
};

/**
 * @returns {Promise<DeliveryStationLean[]>}
 */
exports.getAllStations = async () => await deliveryStationRepo.getAll();

exports.getMenuItems = async () => {
  const cached = cache.getDisplayNames();
  if (cached) return cached;
  const menuItems = await deliveryStationRepo.getMenuItems();
  cache.setDisplayMenuItems(menuItems);
  return menuItems;
};

/**
 * @returns {Promise<DeliveryStationPrefixes[]>}
 */
exports.getAutomationPrefixes = async () => {
  const cached = cache.getPrefixes();
  if (cached) return cached;
  const stations = await deliveryStationRepo.getAutomationPrefixes();
  const prefixes = stations.map((station) => ({
    id: station._id.toString(),
    prefixes: station.automationPrefixes,
  }));
  cache.setPrefixes(prefixes);
  return prefixes;
};
