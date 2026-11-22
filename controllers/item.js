const item = require("../services/item");

/**
 * @type {RequestHandler}
 */
exports.fillItem = async (req, res) =>
  //@ts-ignore
  res.json(await item.fillItem(req.body));
