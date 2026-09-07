const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

/**
 * @param {string} exp
 * @returns {Date}
 */
const expToDate = (exp) => dayjs(exp, "YYMMDD").toDate();

/**
 * @typedef {Object} DataMatrix
 * @property {string} gtin
 * @property {string} lot
 * @property {string} sn
 * @property {string} exp
 */
