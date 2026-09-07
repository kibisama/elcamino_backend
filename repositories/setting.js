const E = require("../utils/error");
const Setting = require("../models/setting");

/** @type {Setting.SettingLean} */
let setting;

/**
 * @returns {Promise<Setting.SettingLean>}
 */
exports.get = async () => {
  if (setting) return setting;
  const _setting = await Setting.findOne().lean();
  if (!_setting) throw E.settingNotFound();
  setting = _setting;
  return setting;
};

/**
 * @param {number} __v
 * @param {UpdateSetInput<Setting.SettingSchema>} update
 * @returns {Promise<Setting.SettingLean>}
 */
exports.update = async (__v, update) => {
  const updated = await Setting.findOneAndUpdate(
    { __v },
    { $set: update, $inc: { __v: 1 } },
    {
      runValidators: true,
      returnDocument: "after",
    },
  ).lean();
  if (!updated) throw E.conflict();
  setting = updated;
  return updated;
};
