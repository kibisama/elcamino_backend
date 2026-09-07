const dRx = require("../services/dRx");

/**
 * @type {RequestHandler}
 */
exports.searchPatients = async (req, res) =>
  //@ts-ignore
  res.json(await dRx.searchPatients(req.query.q));
