const station = require("../services/station");

/**
 * @type {RequestHandler}
 */
exports.createStation = async (req, res) =>
  res.json(await station.createStation(req.body));

/**
 * @type {RequestHandler}
 */
exports.findStation = async (req, res) =>
  //@ts-ignore
  res.json(await station.getStationByCode(req.params.invoiceCode));

/**
 * @type {RequestHandler}
 */
exports.getAllStations = async (req, res) =>
  res.json(await station.getAllStations());

/**
 * @type {RequestHandler}
 */
exports.getMenuItems = async (req, res) =>
  res.json(await station.getMenuItems());

/**
 * @type {RequestHandler}
 */
exports.updateStation = async (req, res) =>
  //@ts-ignore
  res.json(await station.updateStation(req.params.invoiceCode, req.body));
