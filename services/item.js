const E = require("../utils/error");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const { itemRepo } = require("../repositories");
const rabbit = require("../utils/rabbit");
const { routings } = rabbit;

/**
 * @param {string} exp
 * @returns {Date}
 */
const expToDate = (exp) => dayjs(exp, "YYMMDD").toDate();

/**
 * @param {DataMatrix} dm
 * @returns {DataMatrixWithDate}
 */
const dmToDmWithDate = ({ gtin, lot, sn, exp }) => ({
  gtin,
  lot,
  sn,
  exp: expToDate(exp),
});

/**
 * @param {string} exp
 */
const validateExp = (exp) => {
  const expDate = expToDate(exp);
  if (dayjs().isAfter(expDate)) throw E.itemExpired();
};

/**
 * @typedef {Object} DataMatrix
 * @property {string} gtin
 * @property {string} lot
 * @property {string} sn
 * @property {string} exp
 *
 * @typedef {Omit<DataMatrix, "exp"> & {
 * exp: Date
 * }} DataMatrixWithDate
 */

/**
 * @param {DataMatrix} dm
 * @returns {Promise<import("../models/item").ItemLean>}
 */
exports.fillItem = async (dm) => {
  const dmWithDate = dmToDmWithDate(dm);
  const item = await itemRepo.fillItem(dmWithDate);

  rabbit.publish(item, { routingKey: routings.ITEM_FILLED }).catch(() => {});

  validateExp(dm.exp);
  return item;
};
