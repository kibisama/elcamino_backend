const { getSetting, updateSetting } = require("../services/setting");

/**
 * @type {RequestHandler}
 */
exports.get = async (req, res) => res.json(await getSetting());

/**
 * @type {RequestHandler}
 */
exports.update = async (req, res) => res.json(await updateSetting(req.body));
