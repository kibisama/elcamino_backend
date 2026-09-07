const E = require("../utils/error");
const DeliveryLog = require("../models/deliveryLog");
const DRxRx = require("../models/dRxRx");
const { runInTransaction } = require("../utils/db");

/**
 * @param {ObjectId | string} deliveryStationId
 * @param {string} date
 * @param {string} session
 * @returns {Promise<DeliveryLog.DeliveryLogLean>}
 */
exports.findDeliveryLog = async (deliveryStationId, date, session) => {
  const log = await DeliveryLog.findOne({
    station: deliveryStationId,
    date,
    session,
  }).lean();
  if (!log) throw E.deliveryLogNotFound();
  return log;
};

/**
 * Returns an empty array if not found.
 * @param {ObjectId | string} deliveryStationId
 * @param {string} [date]
 * @returns {Promise<DeliveryLog.DeliveryLogLean[]>}
 */
exports.findDeliveryLogs = async (deliveryStationId, date) => {
  /** @type {Record<string, *>} */
  const query = { station: deliveryStationId };
  if (date) query.date = date;
  const logs = await DeliveryLog.find(query).lean();
  return logs;
};

/**
 * @param {string} deliveryStationId
 * @param {string} date
 * @param {string} session
 * @param {Array<Pick<DRxRx.DRxRxLean, "__v"> & { _id: string | ObjectId }>} items
 * @returns {Promise<DeliveryLog.DeliveryLogLean>}
 */
exports.createDeliveryLog = async (deliveryStationId, date, session, items) => {
  const param = {
    date,
    session,
    station: deliveryStationId,
    dRxes: items.map((item) => item._id),
  };
  return await runInTransaction(async (session) => {
    const rxs = await DRxRx.find(
      { $or: items.map((item) => ({ _id: item._id, version: item.__v })) },
      { patPay: 1 },
      { session },
    ).lean();
    if (rxs.length !== items.length) throw E.conflict();
    let due = 0;
    rxs.forEach((rx) => {
      due += rx.patPay ? Number(rx.patPay) : 0;
    });
    //@ts-ignore
    param.due = due.toFixed(2);
    const [log] = await DeliveryLog.create([param], { session });
    const updatedRxs = await DRxRx.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: {
            _id: item._id,
            __v: item.__v,
          },
          update: {
            $set: { deliveryLog: log._id },
            $inc: { version: 1 },
          },
        },
      })),
      { session },
    );
    if (updatedRxs.modifiedCount !== items.length) throw E.conflict();
    return log.toObject();
  });
};
