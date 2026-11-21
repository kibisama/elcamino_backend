const E = require("../utils/error");
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/customParseFormat"));
const { upsertRx } = require("./dRx");
const { getStationByCode, getStationById } = require("./station");
const { deliveryLogRepo, dRxRepo } = require("../repositories");
const cache = require("../utils/cache");
const rabbit = require("../utils/rabbit");
const { routings } = rabbit;

// const DAYJS_RX_DATE_FORMATS = ["M/D/YYYY h:mm:ss A", "M/D/YYYY"];
const DAYJS_LOG_DATE_FORMAT = "MMDDYYYY";
const DAYJS_LOG_SESSION_FORMAT = "h:m:ss A";

const QR_DELIMITER = "|";
// prettier-ignore
const QR_DATA_FIELDS = /** @type {const} */ ([
  "rxID", "rxNumber", "rxDate", "patientID",
  "patientLastName", "patientFirstName", "drugName", "doctorName",
  "rxQty", "refills", "planID", "patPay"
]);

/**
 * @param {string} dRxRxId
 * @param {string | undefined} [exStationId]
 * @param {string | undefined} [newStationId]
 */
const delItemOnStageCache = (dRxRxId, exStationId, newStationId) => {
  cache.delItem(dRxRxId);
  if (exStationId) cache.delStage(exStationId);
  if (newStationId) cache.delStage(newStationId);
};

/**
 * @param {string} stationId
 * @param {DeliveryItem[]} items
 */
const delLogItemsCache = (stationId, items) => {
  cache.delStage(stationId);
  items.forEach((item) => cache.delItem(item.id));
};

/**
 * @param {string} dRxRxId
 * @param {string} invoiceCode
 */
const pubDeliveryItem = async (dRxRxId, invoiceCode) => {
  const item = await findDeliveryItem(dRxRxId);
  await rabbit.publish(
    /** @type {DeliveryItemPublish} */
    ({ ...item, invoiceCode, updatedAt: new Date() }),
    { routingKey: routings.DELIVERY_ITEM },
  );
};

/**
 * @param {string} dRxRxId
 */
const pubDeliveryCancel = async (dRxRxId) => {
  const item = await findDeliveryItem(dRxRxId);
  await rabbit.publish(
    /** @type {DeliveryItemPublish} */
    ({ ...item, updatedAt: new Date() }),
    { routingKey: routings.DELIVERY_CANCEL },
  );
};

/**
 * @param {string} dRxRxId
 */
const pubDeliveryReturn = async (dRxRxId) => {
  const item = await findDeliveryItem(dRxRxId);
  await rabbit.publish(
    /** @type {DeliveryItemPublish} */
    ({ ...item, updatedAt: new Date() }),
    { routingKey: routings.DELIVERY_RETURN },
  );
};

/**
 * @param {string} invoiceCode
 * @param {Date} publishedAt
 * @param {DeliveryItem[]} items
 */
const pubLogDelivery = async (invoiceCode, publishedAt, items) => {
  await rabbit.publish(
    /** @type {DeliveryLogPublish} */
    ({ invoiceCode, publishedAt, items }),
    { routingKey: routings.DELIVERY_LOG },
  );
};

/**
 * @typedef {import("../models/dRxPatient").DRxPatientLean} DRxPatientLean
 * @typedef {import("../models/dRxPlan").DRxPlanLean} DRxPlanLean
 * @typedef {import("../models/dRxRx").DRxRxLean} DRxRxLean
 * @typedef {import("../models/deliveryLog").DeliveryLogLean} DeliveryLogLean
 * @typedef {import("../zod").CreateDeliveryLogInput["items"]} InputItems
 *
 * @typedef {{ [K in typeof QR_DATA_FIELDS[number]]: NonNullable<import("./dRx").DRxDto[K]> }} DRxQrData
 *
 * @typedef {Object} DeliveryItem
 * @property {number} version
 * @property {string} id
 * @property {Date | undefined} time
 * @property {Date} rxDate
 * @property {string} rxNumber
 * @property {string} patient
 * @property {string} drugName
 * @property {string} doctorName
 * @property {string} rxQty
 * @property {string} plan
 * @property {string} patPay
 * @property {string} refills
 * @property {string} patientID
 * @property {string} patientFirstName
 * @property {string} patientLastName
 * @property {string} patientDOB
 *
 * @typedef {DeliveryItem & {
 * invoiceCode?: string,
 * updatedAt: Date
 * }} DeliveryItemPublish
 * @typedef {Object} DeliveryLogPublish
 * @property {string} invoiceCode
 * @property {string | Date} publishedAt
 * @property {DeliveryItem[]} items
 *
 * @typedef {Object} DeliveryLogItem
 * @property {number} version
 * @property {string} id
 * @property {string} logId
 * @property {string} rxID
 * @property {Date} rxDate
 * @property {string} rxNumber
 * @property {string} patient
 * @property {string} drugName
 * @property {string} rxQty
 * @property {string} plan
 * @property {string} patPay
 * @property {Date | null} returnDate
 *
 * @typedef {Object} DeliveryLog
 * @property {number} version
 * @property {string} id
 * @property {string} stationDisplayName
 * @property {Date} date
 * @property {string} session
 * @property {number} count
 * @property {string} due
 * @property {import("../constants").DeliveryLogStatus} status
 */

/**
 * @param {string} invoiceCode
 * @returns {Promise<string>}
 */
const getActiveStationIdByCode = async (invoiceCode) => {
  const station = await getStationByCode(invoiceCode);
  if (!station.active) throw E.stationNotActive();
  return station._id.toString();
};

/**
 * @param {string} dRxRxId
 * @returns {Promise<DeliveryItem>}
 */
const findDeliveryItem = async (dRxRxId) => {
  let item = cache.getItem(dRxRxId);
  if (!item) {
    const rx = await dRxRepo.findRxById(dRxRxId);
    if (!rx) throw E.rxNotFound();
    const patient = await dRxRepo.findPatientById(rx.patient.toString());
    let plan;
    if (rx.plan) plan = await dRxRepo.findPlanById(rx.plan.toString());
    item = mapDeliveryItem(rx, patient, plan);
    cache.setItem(dRxRxId, item);
  }
  return item;
};

/**
 * @param {string[]} dRxRxIds
 * @returns {Promise<DeliveryItem[]>}
 */
const findDeliveryItems = async (dRxRxIds) => {
  /** @type {Record<string, DeliveryItem>} */
  const itemMap = {};
  /** @type {string[]} */
  const missingIds = [];
  dRxRxIds.forEach((id) => {
    const cached = cache.getItem(id);
    if (cached) return (itemMap[id] = cached);
    missingIds.push(id);
  });
  if (missingIds.length) {
    const rxs = await dRxRepo.findRxsByIds(missingIds);
    const patientSet = new Set();
    const planSet = new Set();
    rxs.forEach((rx) => {
      patientSet.add(rx.patient.toString());
      if (rx.plan) planSet.add(rx.plan.toString());
    });

    /** @type {[Promise<DRxPatientLean[]>, Promise<DRxPlanLean[]> | null]} */
    const promises = [dRxRepo.findPatientsByIds([...patientSet]), null];
    if (planSet.size) promises[1] = dRxRepo.findPlansByIds([...planSet]);
    const [patients, plans] = await Promise.all(promises);
    const patientMap = new Map(
      patients.map((patient) => [patient._id.toString(), patient]),
    );
    const planMap = plans
      ? new Map(plans.map((plan) => [plan._id.toString(), plan]))
      : null;

    const items = rxs.map((rx) =>
      mapDeliveryItem(
        rx,
        //@ts-ignore
        patientMap.get(rx.patient.toString()),
        rx.plan && planMap?.get(rx.plan.toString()),
      ),
    );

    items.forEach((item) => {
      itemMap[item.id] = item;
      cache.setItem(item.id, item);
    });
  }
  return dRxRxIds.map((id) => itemMap[id]);
};

/**
 * @param {string} stationId
 * @returns {Promise<string[]>}
 */
const findDRxRxIdsOnStage = async (stationId) => {
  const cached = cache.getStage(stationId);
  if (cached) return cached;
  const onStage = await dRxRepo.findRxsOnStage(stationId);
  const dRxRxIds = onStage.map((rx) => rx._id.toString());
  cache.setStage(stationId, dRxRxIds);
  return dRxRxIds;
};

/**
 * @param {string} invoiceCode
 * @returns {Promise<DeliveryItem[]>}
 */
exports.findItemsOnStage = async (invoiceCode) => {
  const stationId = await getActiveStationIdByCode(invoiceCode);
  const dRxRxIds = await findDRxRxIdsOnStage(stationId);
  return await findDeliveryItems(dRxRxIds);
};

/**
 * @param {string | ObjectId} logId
 * @returns {Promise<DeliveryLogItem[]>}
 */
exports.findLogItems = async (logId) => {
  const log = await deliveryLogRepo.findDeliveryLogById(logId);
  const dRxRxIds = log.dRxes.map((id) => id.toString());
  const rxs = await dRxRepo.findRxsByIds(dRxRxIds);
  const patientSet = new Set();
  const planSet = new Set();
  rxs.forEach((rx) => {
    patientSet.add(rx.patient.toString());
    if (rx.plan) planSet.add(rx.plan.toString());
  });

  /** @type {[Promise<DRxPatientLean[]>, Promise<DRxPlanLean[]> | null]} */
  const promises = [dRxRepo.findPatientsByIds([...patientSet]), null];
  if (planSet.size) promises[1] = dRxRepo.findPlansByIds([...planSet]);
  const [patients, plans] = await Promise.all(promises);
  const patientMap = new Map(
    patients.map((patient) => [patient._id.toString(), patient]),
  );
  const planMap = plans
    ? new Map(plans.map((plan) => [plan._id.toString(), plan]))
    : null;

  return rxs.map((rx) =>
    mapDeliveryLogItem(
      rx,
      log._id.toString(),
      //@ts-ignore
      patientMap.get(rx.patient.toString()),
      rx.plan && planMap?.get(rx.plan.toString()),
    ),
  );
};

/**
 * @param {string} [invoiceCode]
 * @param {NonNullable<dayjs.ConfigType>} [date]
 * @param {string} [rxNumber]
 * @returns {Promise<DeliveryLog[]>}
 */
exports.searchLogs = async (invoiceCode, date, rxNumber) => {
  if (!(invoiceCode || date || rxNumber)) throw E.badRequest();
  /** @type {DeliveryLogLean[]} */
  let logs = [];
  /** @type {import("./station").DeliveryStationLean | undefined} */
  let station;
  if (rxNumber) {
    const [rx] = await dRxRepo.findRxsByRxNumber(rxNumber);
    if (!rx) return [];
    logs = await deliveryLogRepo.searchByDRxRxId(rx._id.toString());
  } else {
    station = invoiceCode ? await getStationByCode(invoiceCode) : undefined;
    logs = await deliveryLogRepo.findDeliveryLogs(
      station ? station._id : undefined,
      date ? dayjs(date).format(DAYJS_LOG_DATE_FORMAT) : undefined,
    );
  }
  /** @type {Record<string, string>} */
  let displayNameMap;
  if (!station) {
    displayNameMap = {};
    for (let i = 0; i < logs.length; i++) {
      const logStationId = logs[i].station.toString();
      if (displayNameMap[logStationId] == null) {
        const station = await getStationById(logStationId);
        displayNameMap[logStationId] = station.displayName;
      }
    }
  }
  return logs.map((log) =>
    mapDeliveryLog(
      log,
      station ? station.displayName : displayNameMap[log.station.toString()],
    ),
  );
};

/**
 * @param {DeliveryLogLean} log
 * @param {string} stationDisplayName
 * @returns {DeliveryLog}
 */
const mapDeliveryLog = (log, stationDisplayName) => ({
  id: log._id.toString(),
  version: log.__v,
  stationDisplayName: stationDisplayName,
  date: dayjs(log.date, DAYJS_LOG_DATE_FORMAT).toDate(),
  session: log.session,
  count: log.dRxes.length,
  due: log.due ?? "",
  status: log.status,
});

/**
 * @param {DRxRxLean} rx
 * @param {string} logId
 * @param {DRxPatientLean} patient
 * @param {DRxPlanLean} [plan]
 * @returns {DeliveryLogItem}
 */
const mapDeliveryLogItem = (rx, logId, patient, plan) => {
  let returnDate = null;
  if (rx.logHistory) {
    for (let i = 0; i < rx.logHistory.length; i++) {
      if (rx.logHistory[i].toString() === logId) {
        returnDate = /** @type {Date} */ (rx.returnDates[i]);
        break;
      }
    }
  }
  return {
    id: rx._id.toString(),
    version: rx.__v,
    logId,
    rxID: rx.rxID,
    rxDate: rx.rxDate,
    rxNumber: rx.rxNumber,
    patient: `${patient.patientLastName}, ${patient.patientFirstName}`,
    drugName: rx.drugName ?? "",
    rxQty: rx.rxQty ?? "",
    plan: plan ? (plan.planName ?? plan.planID) : "",
    patPay: rx.patPay ?? "",
    returnDate,
  };
};

/**
 * @param {DRxRxLean} rx
 * @param {DRxPatientLean} patient
 * @param {DRxPlanLean} [plan]
 * @returns {DeliveryItem}
 */
const mapDeliveryItem = (rx, patient, plan) => ({
  id: rx._id.toString(),
  version: rx.__v,
  time: rx.deliveryDate ?? undefined,
  rxDate: rx.rxDate,
  rxNumber: rx.rxNumber ?? "",
  patient: `${patient.patientLastName}, ${patient.patientFirstName}`,
  drugName: rx.drugName ?? "",
  doctorName: rx.doctorName ?? "",
  rxQty: rx.rxQty ?? "",
  plan: plan ? (plan.planName ?? plan.planID) : "",
  patPay: rx.patPay ?? "",
  refills: rx.refills ?? "",
  patientID: patient.patientID,
  patientFirstName: patient.patientFirstName,
  patientLastName: patient.patientLastName,
  patientDOB: patient.patientDOB ?? "",
});

/**
 * @param {string} qr
 * @returns {DRxQrData}
 */
const decodeQr = (qr) => {
  const splited = qr.split(QR_DELIMITER);
  if (splited.length !== 12) throw E.badRequest();
  const qrData = /** @type {DRxQrData} */ (
    Object.fromEntries(
      QR_DATA_FIELDS.map((field, i) => [
        field,
        field === "rxDate" ? new Date(splited[i]) : splited[i],
      ]),
    )
  );
  for (let i = 0; i < QR_DATA_FIELDS.length; i++) {
    const key = QR_DATA_FIELDS[i];
    if (!qrData[key] && key !== "planID" && key !== "patPay")
      throw E.invalidParam();
  }
  return qrData;
};

/**
 * @param {string} qr
 * @param {string} invoiceCode
 * @returns {Promise<DRxRxLean>}
 */
exports.upsertRxWithQr = async (qr, invoiceCode) => {
  /** @type {import("./dRx").DRxDto} */
  const qrData = decodeQr(qr);
  const stationId = await getActiveStationIdByCode(invoiceCode);
  qrData.deliveryStation = stationId;
  qrData.deliveryDate = new Date();
  let exRx = await dRxRepo.findRxByRxID(qrData.rxID);

  const rx = await upsertRx(qrData);

  const id = rx._id.toString();

  delItemOnStageCache(id, exRx?.deliveryStation?.toString(), stationId);

  pubDeliveryItem(id, invoiceCode).catch(() => {});

  return rx;
};

/**
 * @param {string} dRxRxId
 * @param {number} version
 * @param {string} [invoiceCode]
 * @returns {Promise<void>}
 */
const setDelivery = async (dRxRxId, version, invoiceCode) => {
  let stationId;
  if (invoiceCode) stationId = await getActiveStationIdByCode(invoiceCode);
  const exStationId = await dRxRepo.setDelivery(dRxRxId, version, stationId);

  delItemOnStageCache(dRxRxId, exStationId, stationId);

  invoiceCode
    ? pubDeliveryItem(dRxRxId, invoiceCode).catch(() => {})
    : pubDeliveryCancel(dRxRxId).catch(() => {});
};

// exports.setDeliveries = async () => {};

/**
 * @param {string} dRxRxId
 * @param {number} version
 * @returns {Promise<void>}
 */
exports.cancelDelivery = async (dRxRxId, version) =>
  await setDelivery(dRxRxId, version);

/**
 * @param {string} dRxRxId
 * @param {number} version
 * @returns {Promise<DRxRxLean>}
 */
exports.returnDelivery = async (dRxRxId, version) => {
  const rx = await dRxRepo.returnDelivery(dRxRxId, version);

  cache.delItem(dRxRxId);

  pubDeliveryReturn(dRxRxId).catch(() => {});

  return rx;
};

/**
 * @param {string} stationId
 * @param {InputItems} items
 * @returns {Promise<DeliveryItem[]>}
 */
const validateStageItems = async (stationId, items) => {
  const realDRxRxIds = await findDRxRxIdsOnStage(stationId);
  if (!realDRxRxIds.length || items.length !== realDRxRxIds.length)
    throw E.badRequest();
  const realItems = await findDeliveryItems(realDRxRxIds);
  const realItemMap = new Map(
    realDRxRxIds.map((id, index) => [id, realItems[index]]),
  );
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const realItem = realItemMap.get(item.id);

    if (!realItem) throw E.badRequest();
    if (item.version !== realItem.version) throw E.conflict();
  }
  return realItems;
};

/**
 * @param {string} invoiceCode
 * @param {InputItems} items
 * @returns {Promise<DeliveryLogLean>}
 */
exports.createLog = async (invoiceCode, items) => {
  const stationId = await getActiveStationIdByCode(invoiceCode);
  const realItems = await validateStageItems(stationId, items);
  const day = dayjs();
  const date = day.format(DAYJS_LOG_DATE_FORMAT);
  const session = day.format(DAYJS_LOG_SESSION_FORMAT);
  let log;
  try {
    log = await deliveryLogRepo.createDeliveryLog(
      stationId,
      date,
      session,
      realItems.map((item) => ({ _id: item.id, __v: item.version })),
    );
  } catch (error) {
    //@ts-ignore
    if (error.code === "CONFLICT") {
      delLogItemsCache(stationId, realItems);
    }
    throw error;
  }
  delLogItemsCache(stationId, realItems);

  pubLogDelivery(invoiceCode, day.toDate(), realItems).catch(() => {});
  return log;
};
