const pickup = require("../services/pickup");

/**
 * @type {RequestHandler}
 */
exports.post = async (req, res) => {
  await pickup.createPickup();
  return res.sendStatus(204);
};

/**
 * @type {RequestHandler}
 */
exports.png = async (req, res) => {
  const { _id } = req.params;
  // @ts-ignore
  const path = await pickup.getPngPath(_id);
  return res.sendFile(path);
};

/**
 * @type {RequestHandler}
 */
exports.search = async (req, res) => {
  const { rxNumber, patientId } = req.query;
  // @ts-ignore
  return res.json(await pickup.search(rxNumber, patientId));
};
