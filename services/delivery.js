const E = require("../utils/error");
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/customParseFormat"));
const { upsertRx } = require("./dRx");
const { getStationByCode, getStationById } = require("./station");
const { deliveryLogRepo, dRxRepo } = require("../repositories");
const cache = require("../utils/cache");

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
 * @param {string} invoiceCode
 * @param {string} date
 * @returns {string}
 */
const getSessionKey = (invoiceCode, date) => `${invoiceCode}:${date}`;

/**
 * @param {string} invoiceCode
 * @param {string} date
 * @param {string} session
 * @returns {string}
 */
const getLogKey = (invoiceCode, date, session) =>
  `${invoiceCode}:${date}:${session}`;

/**
 * @param {string} dRxRxId
 * @param {string | undefined} [exStationId]
 * @param {string | undefined} [newStationId]
 * @returns {Promise<void>}
 */
const delItemOnStageCache = async (dRxRxId, exStationId, newStationId) => {
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
 * @typedef {import("../models/dRxPatient").DRxPatientLean} DRxPatientLean
 * @typedef {import("../models/dRxPlan").DRxPlanLean} DRxPlanLean
 * @typedef {import("../models/dRxRx").DRxRxLean} DRxRxLean
 * @typedef {import("../models/deliveryLog").DeliveryLogLean} DeliveryLogLean
 * @typedef {import("../zod").CreateDeliveryLogInput["items"]} InputItems
 *
 * @typedef {{ [K in typeof QR_DATA_FIELDS[number]]: NonNullable<import("./dRx").DRxDto[K]> }} DRxQrData
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
 * @property {string} logId
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
 * @param {NonNullable<dayjs.ConfigType>} date
 * @returns {Promise<string[]>}
 */
const getSessions = async (invoiceCode, date) => {
  const dateString = dayjs(date).format(DAYJS_LOG_DATE_FORMAT);
  const key = getSessionKey(invoiceCode, dateString);
  const cached = cache.getSessions(key);
  if (cached) return cached;
  const station = await getStationByCode(invoiceCode);
  const logs = await deliveryLogRepo.findDeliveryLogs(station._id, dateString);
  const sessions = logs.map((log) => log.session);
  cache.setSessions(key, sessions);
  return sessions;
};
exports.getSessions = getSessions;

/**
 * @param {string} invoiceCode
 * @param {NonNullable<dayjs.ConfigType>} date
 * @param {string} session
 * @returns {Promise<string[]>}
 */
const findLogDRxRxIds = async (invoiceCode, date, session) => {
  const dateString = dayjs(date).format(DAYJS_LOG_DATE_FORMAT);
  const key = getLogKey(invoiceCode, dateString, session);
  const cached = cache.getLog(key);
  if (cached) return cached;
  const station = await getStationByCode(invoiceCode);
  const log = await deliveryLogRepo.findDeliveryLog(
    station._id,
    dateString,
    session,
  );
  const dRxRxIds = log.dRxes.map((rx) => rx._id.toString());
  cache.setLog(key, dRxRxIds);
  return dRxRxIds;
};

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
 * @param {string} invoiceCode
 * @param {NonNullable<dayjs.ConfigType>} date
 * @param {string} session
 * @returns {Promise<DeliveryItem[]>}
 */
exports.findLogItems = async (invoiceCode, date, session) => {
  const dRxRxIds = await findLogDRxRxIds(invoiceCode, date, session);
  return await findDeliveryItems(dRxRxIds);
};

/**
 * @param {string} [invoiceCode]
 * @param {NonNullable<dayjs.ConfigType>} [date]
 * @returns {Promise<DeliveryLog[]>}
 */
exports.searchLogs = async (invoiceCode, date) => {
  if (!(invoiceCode || date)) throw E.badRequest();
  const station = invoiceCode ? await getStationByCode(invoiceCode) : undefined;
  const logs = await deliveryLogRepo.findDeliveryLogs(
    station ? station._id : undefined,
    date ? dayjs(date).format(DAYJS_LOG_DATE_FORMAT) : undefined,
  );
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
  logId: rx.deliveryLog ? rx.deliveryLog.toString() : "",
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
  qrData.deliveredDate = new Date();
  let exRx = await dRxRepo.findRxByRxID(qrData.rxID);

  const rx = await upsertRx(qrData);
  delItemOnStageCache(
    rx._id.toString(),
    exRx?.deliveryStation?.toString(),
    stationId,
  );

  // publish mq
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

  // publish mq
};

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

  // publish mq

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
  cache.delSessions(getSessionKey(invoiceCode, date));

  //publish mq
  return log;
};
