// ==========================================
// DRx
// ==========================================

exports.DRX_RX_STATUS = /** @type {const} */ ([
  "DC-FILEONLY",
  "DISCONTINUED",
  "FILEONLY",
  "FO-TRANSFERRED",
  "FUTURE BILL",
  "RENEWED",
  "TRANSFERRED",
  "TYPED",
]);
exports.DRX_RX_STATUSFIN = /** @type {const} */ ([
  "BILLED",
  "CASH",
  "NOT BILLED",
  "REJECTED",
  "REVERSED",
]);
exports.DRX_DRUG_RX_OTC = /** @type {const} */ (["OTC", "RX"]);
exports.DRX_BRAND_OR_GENERIC = /** @type {const} */ ([
  "Brand",
  "Generic",
  "N/A",
]);
exports.DRX_DRUG_DEA = /** @type {const} */ (["0", "1", "2", "3", "4", "5"]);

/**
 * @typedef {exports.DRX_RX_STATUS[number]} RxStatus
 * @typedef {exports.DRX_RX_STATUSFIN[number]} RxStatusFin
 * @typedef {exports.DRX_DRUG_RX_OTC[number]} DrugRxOTC
 * @typedef {exports.DRX_BRAND_OR_GENERIC[number]} BrandOrGeneric
 * @typedef {exports.DRX_DRUG_DEA[number]} DrugDEA
 */

// ==========================================
// Item
// ==========================================

exports.ITEM_INPUT_METHODS = /** @type {const} */ (["SCAN", "DSCSA", "EDIT"]);
