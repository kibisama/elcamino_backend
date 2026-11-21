const E = require("../utils/error");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const { itemRepo } = require("../repositories");

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
 */
exports.fillItem = async (dm) => {
  const item = await itemRepo.fillItem();
  validateExp(dm.exp);
};
