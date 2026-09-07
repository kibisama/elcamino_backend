const delivery = require("../services/delivery");

/**
 * @type {RequestHandler}
 */
exports.upsertRxWithQr = async (req, res) =>
  //@ts-ignore
  res.json(await delivery.upsertRxWithQr(req.body, req.params.invoiceCode));

/**
 * @type {RequestHandler}
 */
exports.cancelDelivery = async (req, res) => {
  //@ts-ignore
  await delivery.cancelDelivery(req.params.id, req.body.version);
  return res.sendStatus(204);
};

/**
 * @type {RequestHandler}
 */
exports.returnDelivery = async (req, res) =>
  //@ts-ignore
  res.json(await delivery.returnDelivery(req.params.id, req.body.version));

/**
 * @type {RequestHandler}
 */
exports.createLog = async (req, res) =>
  //@ts-ignore
  res.json(await delivery.createLog(req.params.invoiceCode, req.body.items));

/**
 * @type {RequestHandler}
 */
exports.getSessions = async (req, res) =>
  //@ts-ignore
  res.json(await delivery.getSessions(req.params.invoiceCode, req.query.date));

/**
 * @type {RequestHandler}
 */
exports.getItemsOnStage = async (req, res) =>
  //@ts-ignore
  res.json(await delivery.findItemsOnStage(req.params.invoiceCode));

/**
 * @type {RequestHandler}
 */
exports.getLogItems = async (req, res) =>
  res.json(
    await delivery.findLogItems(
      //@ts-ignore
      req.params.invoiceCode,
      req.params.date,
      req.params.session,
    ),
  );
