const { settingRepo } = require("../repositories");

/**
 * @typedef {Promise<import("../models/setting").SettingLean>} SettingLean
 */

/**
 * @returns {Promise<SettingLean>}
 */
exports.getSetting = async () => await settingRepo.get();

/**
 * @param {import("../zod/index").UpdateSettingInput} input
 * @returns {Promise<SettingLean>}
 */
exports.updateSetting = async ({ version, data }) =>
  await settingRepo.update(version, data);
