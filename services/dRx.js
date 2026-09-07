const E = require("../utils/error");
const { dRxRepo } = require("../repositories");

/**
 * @typedef {import("../models/dRxPatient").DRxPatientLean} DRxPatientLean
 * @typedef {import("../models/dRxPlan").DRxPlanLean} DRxPlanLean
 * @typedef {import("../models/dRxRx").DRxRxLean} DRxRxLean
 * @typedef {import("../models/dRxRx").DRxDto} DRxDto
 * @typedef {Object} ParataBridgePatientData
 * @property {string} patientID
 * @property {string} patientFirstName
 * @property {string} patientLastName
 * @property {string} patientDOB
 * @property {string} patientStreet
 * @property {string} patientCity
 * @property {string} patientState
 * @property {string} patientZip
 * @property {string} patientPhone
 * @typedef {Object} ParataBridgeData
 * @property {string} rxID
 * @property {string} rxNumber
 * @property {string} rxDate
 * @property {string} sig
 * @property {string} refills
 * @property {string} rxQty
 * @property {string} daysSupply
 * @property {import("../constants").DRX_RX_STATUSFIN[number]} rxStatusFin
 * @property {ParataBridgePatientData} patient
 * @property {string} doctorName
 * @property {string} doctorDEA
 * @property {string} drugName
 * @property {string} drugNDC
 * @typedef {Object} PatientOption
 * @property {string} id
 * @property {string} fullName
 * @property {string} [dob]
 */

// prettier-ignore
const PATIENT_FIELDS = /** @type {const} */ ([
  "patientFirstName", "patientLastName", "patientDOB", "patientSex",
  "patientStreet", "patientCity", "patientState", "patientZip",
  "patientPhone", "patientSSN", "patNotes"
]);
const PLAN_FIELDS = /** @type {const} */ (["planName", "ansiBin", "pcn"]);

/**
 * @param {DRxPatientLean} patient
 * @returns {PatientOption}
 */
const toPatientOption = (patient) => ({
  id: patient._id.toString(),
  fullName: `${patient.patientLastName},${patient.patientFirstName}`,
  dob: patient.patientDOB || "unknown",
});

/**
 * @param {readonly string[]} keys
 * @param {*} original
 * @param {*} target
 * @returns {boolean}
 */
const _isEqual = (keys, original, target) => {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (target[key] === undefined) continue;
    if (original[key] && target[key] !== original[key]) return false;
  }
  return true;
};

/**
 * @param {DRxDto} dto
 */
const validateDto = (dto) => {
  switch (true) {
    case !dto.patientID:
    case dto.deliveryStation && !(dto.deliveredDate instanceof Date):
      throw E.invalidParam();
  }
};

/**
 * @param {DRxDto} dto
 * @returns {Partial<import("../models/dRxPatient").DRxPatientSchema>}
 */
const dtoToPatient = (dto) => {
  /** @type {Record<string, *>} */
  const patient = { patientID: dto.patientID };
  PATIENT_FIELDS.forEach(
    (field) => dto[field] && (patient[field] = dto[field]),
  );
  return patient;
};

/**
 * @param {DRxDto} dto
 * @returns {Partial<import("../models/dRxPlan").DRxPlanSchema>}
 */
const dtoToPlan = (dto) => {
  /** @type {Record<string, *>} */
  const plan = { planID: dto.planID };
  PLAN_FIELDS.forEach((field) => dto[field] && (plan[field] = dto[field]));
  return plan;
};

/**
 * @param {DRxDto} dto
 * @returns {Promise<DRxRxLean>}
 */
const upsertRx = async (dto) => {
  validateDto(dto);

  const { patientID, planID } = dto;
  /** @type {Promise<*>[]} */
  const promises = [dRxRepo.findPatientByPatientID(patientID)];
  planID && promises.push(dRxRepo.findPlanByPlanID(planID));

  const [exPatient, exPlan] = await Promise.all(promises);
  let patient, plan;
  if (exPatient && _isEqual(PATIENT_FIELDS, exPatient, dto)) {
    patient = exPatient._id;
  } else {
    patient = dtoToPatient(dto);
  }
  if (exPlan && _isEqual(PLAN_FIELDS, exPlan, dto)) {
    plan = exPlan._id;
  } else if (planID) {
    plan = dtoToPlan(dto);
  }
  return await dRxRepo.upsertRx(dto, patient, plan);
};
exports.upsertRx = upsertRx;

/**
 * @param {ParataBridgeData} payload
 * @returns {Promise<DRxRxLean>}
 */
exports.upsertRxWithParata = async (payload) => {
  const { patient, ..._payload } = payload;
  return await upsertRx(Object.assign(_payload, patient));
};

/**
 * @param {string} query
 * @returns {Promise<PatientOption[]>}
 */
exports.searchPatients = async (query) => {
  const [last, first] = query.split(",").map((v) => v.trim());
  if (!(last || first)) throw E.badRequest();
  const patients = await dRxRepo.searchPatient(last, first);
  return patients.map((patient) => toPatientOption(patient));
};
