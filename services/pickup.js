const dayjs = require("dayjs");
const { pickupRepo, dRxRepo } = require("../repositories");
const manager = require("../utils/pickupManager");
const E = require("../utils/error");

/**
 * @typedef {Pick<import("../models/dRxRx").DRxRxLean, "rxNumber" | "drugName" | "doctorName" | "rxDate"> &
 * { patient: string }} PickupRxInfo
 */

/**
 * @returns {Promise<void>}
 */
exports.createPickup = async () => {
  const data = manager.getData();
  const { state, items, date, canvas, relation, notes } = data;

  if (state !== "pre-submit" || items.length === 0 || !canvas) {
    throw E.badRequest();
  }

  const deliveryDate = date ? new Date(date) : new Date();

  const exPickup = await pickupRepo.findEx(items, deliveryDate);
  if (exPickup.length > 0) {
    manager.emitError();

    const itemsSet = new Set(items);
    const duplicateSet = new Set();
    exPickup.forEach((doc) => {
      doc.rxNumber.forEach((number) => {
        if (itemsSet.has(number)) duplicateSet.add(number);
      });
    });
    throw E.conflict(
      `Following item(s) are already recorded as delivered: ${Array.from(
        duplicateSet,
      ).join(", ")}`,
    );
  }

  await pickupRepo.create(
    { rxNumber: items, relation, notes, deliveryDate },
    canvas,
  );

  manager.emitSuccess();
  manager.reset();
};

/**
 * @param {import("../models/pickup").PickupRelation} relation
 * @returns {"Self" | "Family/Friend" | "Guardian/Caregiver" | "Other"}
 */
const translateRelation = (relation) => {
  switch (relation) {
    case "self":
      return "Self";
    case "ff":
      return "Family/Friend";
    case "gc":
      return "Guardian/Caregiver";
    case "other":
      return "Other";
  }
};

exports.getPngPath = pickupRepo.getPngPath;

/**
 * @typedef {Object} PickupItem
 * @property {string} id
 * @property {string} pickupId
 * @property {number} version
 * @property {string} rxNumber
 * @property {Date} deliveryDate
 * @property {ReturnType<typeof translateRelation>} relation
 * @property {string} notes
 * @property {string} [patientName]
 * @property {string} [drugName]
 */

/**
 * @param {import("../models/pickup").PickupLean} pickup
 * @param {Map<string, PickupRxInfo>} [rxMap]
 * @returns {PickupItem[]}
 */
const mapPickupItems = (pickup, rxMap) => {
  /** @type {PickupItem[]} */
  const items = [];
  const pickupId = pickup._id.toString();
  const version = pickup.__v;
  const relation = translateRelation(pickup.relation);
  const { deliveryDate, notes } = pickup;
  pickup.rxNumber.forEach((v, i) => {
    /** @type {PickupItem} */
    const item = {
      id: pickupId + "_" + i.toString(),
      pickupId,
      version,
      rxNumber: v,
      deliveryDate,
      relation,
      notes,
    };
    const rx = rxMap?.get(v);
    if (rx) {
      const { patient, drugName } = rx;
      if (patient) item.patientName = patient;
      if (drugName) item.drugName = drugName;
    }
    items.push(item);
  });
  return items;
};

/**
 * @param {string[]} rxNumbers
 * @returns {Promise<Map<string, PickupRxInfo>>}
 */
const buildRxMap = async (rxNumbers) => {
  const rxs = await dRxRepo.findRxsForPickup(rxNumbers);
  if (rxs.length === 0) return new Map();
  const patientIds = [...new Set(rxs.map((rx) => rx.patient.toString()))];
  const patients = await dRxRepo.findPatientsByIds(patientIds);
  const patientMap = new Map(
    patients.map((patient) => [
      patient._id.toString(),
      `${patient.patientLastName}, ${patient.patientFirstName}`,
    ]),
  );
  const rxMap = new Map();
  rxs.forEach((rx) => {
    const patient = patientMap.get(rx.patient.toString());
    rxMap.set(rx.rxNumber, { ...rx, patient });
  });
  return rxMap;
};

/**
 * @param {string} [rxNumber]
 * @param {string} [patientId]
 * @returns {Promise<PickupItem[]>}
 */
exports.search = async (rxNumber, patientId) => {
  if (!(rxNumber || patientId)) throw E.badRequest();
  /** @type {import("../models/pickup").PickupLean[]} */
  let pickups = [];
  if (rxNumber) {
    pickups = await pickupRepo.search(rxNumber);
  } else if (patientId) {
    const rxs = await dRxRepo.findRxsByPatientId(patientId);
    if (!rxs.length) return [];
    const rxNumberSet = new Set();
    rxs.forEach((rx) => rxNumberSet.add(rx.rxNumber));
    pickups = await pickupRepo.search([...rxNumberSet]);
  }

  const rxNumbers = new Set();
  pickups.forEach((pickup) => {
    pickup.rxNumber.forEach((v) => rxNumbers.add(v));
  });
  /** @type {Awaited<ReturnType<typeof buildRxMap>> | undefined} */
  const rxMap = await buildRxMap([...rxNumbers]);
  return pickups.flatMap((pickup) => mapPickupItems(pickup, rxMap));
};

// /**
//  * @param {ObjectId | string} id
//  * @param {number} version
//  * @param {string} notes
//  * @returns
//  */
// exports.updateNotes = async (id, version, notes) =>
//   await pickupRepo.updateNotes(id, version, notes);
