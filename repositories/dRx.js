const { isObjectIdOrHexString } = require("mongoose");
const dayjs = require("dayjs");
const E = require("../utils/error");
const DRxRx = require("../models/dRxRx");
const DRxPatient = require("../models/dRxPatient");
const DRxPlan = require("../models/dRxPlan");
const cache = require("../utils/cache");
const { runInTransaction } = require("../utils/db");

/**
 * Returns an empty array if not found.
 * @param {string[]} rxNumbers
 * @returns {Promise<Pick<DRxRx.DRxRxLean, "patient" | "rxNumber" | "drugName" | "doctorName" | "rxDate">[]>}
 */
exports.findRxsForPickup = async (rxNumbers) =>
  await DRxRx.aggregate([
    { $match: { rxNumber: { $in: rxNumbers } } },
    {
      $group: {
        _id: "$rxNumber",
        latestDoc: {
          $top: { sortBy: { rxDate: -1 }, output: "$$ROOT" },
        },
      },
    },
    {
      $project: {
        _id: 0,
        rxNumber: "$_id",
        patient: "$latestDoc.patient",
        drugName: "$latestDoc.drugName",
        doctorName: "$latestDoc.doctorName",
        rxDate: "$latestDoc.rxDate",
      },
    },
  ]);

/**
 * @param {string} patientID
 * @returns {string}
 */
const getPatientIDKey = (patientID) => `patientID:${patientID}`;
/**
 * @param {string} id
 * @returns {string}
 */
const getPatientObjectIdKey = (id) => `_id:${id}`;
/**
 * @param {string} planID
 * @returns {string}
 */
const getPlanIDKey = (planID) => `planID:${planID}`;
/**
 * @param {string} id
 * @returns {string}
 */
const getPlanObjectIdKey = (id) => `_id:${id}`;

/**
 * @param {DRxPatient.DRxPatientLean} patient
 */
const setPatientCache = (patient) => {
  cache.setPatient(getPatientObjectIdKey(patient._id.toString()), patient);
  cache.setPatient(getPatientIDKey(patient.patientID), patient);
};

/**
 * @param {DRxPlan.DRxPlanLean} plan
 */
const setPlanCache = (plan) => {
  cache.setPlan(getPlanObjectIdKey(plan._id.toString()), plan);
  cache.setPlan(getPlanIDKey(plan.planID), plan);
};

/**
 * @param {DRxPatient.DRxPatientLean} patient
 */
const delPatientCache = (patient) => {
  cache.delPatient(getPatientObjectIdKey(patient._id.toString()));
  cache.delPatient(getPatientIDKey(patient.patientID));
};

/**
 * @param {DRxPlan.DRxPlanLean} plan
 */
const delPlanCache = (plan) => {
  cache.delPlan(getPlanObjectIdKey(plan._id.toString()));
  cache.delPlan(getPlanIDKey(plan.planID));
};

/**
 * @param {string} patientID
 * @returns {Promise<DRxPatient.DRxPatientLean | null>}
 */
exports.findPatientByPatientID = async (patientID) => {
  const cached = cache.getPatient(getPatientIDKey(patientID));
  if (cached) return cached;
  const patient = await DRxPatient.findOne({ patientID }).lean();
  if (!patient) return null;
  setPatientCache(patient);
  return patient;
};

/**
 * @param {string} id
 * @returns {Promise<DRxPatient.DRxPatientLean>}
 */
exports.findPatientById = async (id) => {
  const cached = cache.getPatient(getPatientObjectIdKey(id));
  if (cached) return cached;
  const patient = await DRxPatient.findById(id).lean();
  if (!patient) throw E.patientNotFound();
  setPatientCache(patient);
  return patient;
};

/**
 * @param {string[]} ids
 * @returns {Promise<DRxPatient.DRxPatientLean[]>}
 */
exports.findPatientsByIds = async (ids) => {
  /** @type {Record<string, DRxPatient.DRxPatientLean>} */
  const patientMap = {};
  /** @type {string[]} */
  const _missingIds = [];
  ids.forEach((id) => {
    const cached = cache.getPatient(getPatientObjectIdKey(id));
    if (cached) return (patientMap[id] = cached);
    _missingIds.push(id);
  });
  if (_missingIds.length > 0) {
    const missingIds = [...new Set(_missingIds)];
    const missingPatients = await DRxPatient.find({
      _id: { $in: missingIds },
    }).lean();
    if (missingIds.length !== missingPatients.length) throw E.patientNotFound();
    missingPatients.forEach((patient) => {
      setPatientCache(patient);
      patientMap[patient._id.toString()] = patient;
    });
  }
  return ids.map((id) => patientMap[id]);
};

/**
 * @param {string} planID
 * @returns {Promise<DRxPlan.DRxPlanLean | null>}
 */
exports.findPlanByPlanID = async (planID) => {
  const cached = cache.getPlan(getPlanIDKey(planID));
  if (cached) return cached;
  const plan = await DRxPlan.findOne({ planID }).lean();
  if (!plan) return null;
  setPlanCache(plan);
  return plan;
};
/**
 * @param {string} id
 * @returns {Promise<DRxPlan.DRxPlanLean>}
 */
exports.findPlanById = async (id) => {
  const cached = cache.getPlan(getPlanObjectIdKey(id));
  if (cached) return cached;
  const plan = await DRxPlan.findById(id).lean();
  if (!plan) throw E.planNotFound();
  setPlanCache(plan);
  return plan;
};

/**
 * @param {string[]} ids
 * @returns {Promise<DRxPlan.DRxPlanLean[]>}
 */
exports.findPlansByIds = async (ids) => {
  /** @type {Record<string, DRxPlan.DRxPlanLean>} */
  const planMap = {};
  /** @type {string[]} */
  const _missingIds = [];
  ids.forEach((id) => {
    const cached = cache.getPlan(getPlanObjectIdKey(id));
    if (cached) return (planMap[id] = cached);
    _missingIds.push(id);
  });
  if (_missingIds.length) {
    const missingIds = [...new Set(_missingIds)];
    const missingPlans = await DRxPlan.find({
      _id: { $in: missingIds },
    }).lean();
    if (missingIds.length !== missingPlans.length) throw E.planNotFound();
    missingPlans.forEach((plan) => {
      setPlanCache(plan);
      planMap[plan._id.toString()] = plan;
    });
  }
  return ids.map((id) => planMap[id]);
};

/**
 * @param {string} rxID
 * @returns {Promise<DRxRx.DRxRxLean | null>}
 */
exports.findRxByRxID = async (rxID) => await DRxRx.findOne({ rxID }).lean();

/**
 * @param {string} rxNumber
 * @returns {Promise<DRxRx.DRxRxLean | null>}
 */
exports.findRxByRxNumber = async (rxNumber) =>
  await DRxRx.findOne({ rxNumber }).lean();

/**
 * @param {string[]} ids
 * @returns {Promise<DRxRx.DRxRxLean[]>}
 */
exports.findRxsByIds = async (ids) => {
  const _ids = [...new Set(ids)];
  const rxs = await DRxRx.find({ _id: { $in: _ids } }).lean();
  if (rxs.length !== _ids.length) throw E.rxNotFound();
  /** @type {Record<string, DRxRx.DRxRxLean>} */
  const map = {};
  rxs.forEach((rx) => (map[rx._id.toString()] = rx));
  return ids.map((id) => map[id]);
};

/**
 * @param {string | ObjectId} patientId
 * @returns {Promise<DRxRx.DRxRxLean[]>}
 */
exports.findRxsByPatientId = async (patientId) =>
  await DRxRx.find({ patient: patientId }).lean();

/**
 * @param {ObjectId | string} deliveryStationId
 * @param {NonNullable<dayjs.ConfigType>} [date]
 * @param {ObjectId | string} [deliveryLogId]
 * @returns {Promise<DRxRx.DRxRxLean[]>}
 */
exports.findRxsForDelivery = async (deliveryStationId, date, deliveryLogId) => {
  const day = dayjs(date);
  /** @type {import("mongoose").QueryFilter<DRxRx.DRxRxLean>} */
  const query = {
    deliveryStation: deliveryStationId,
    deliveryDate: {
      $gte: day.startOf("d").toDate(),
      $lte: day.endOf("d").toDate(),
    },
  };
  if (deliveryLogId) query.deliveryLog = deliveryLogId;
  const rxs = await DRxRx.find(query).lean();
  if (!rxs.length) throw E.rxNotFound();
  return rxs;
};

/**
 * @param {ObjectId | string} deliveryStationId
 * @returns {Promise<DRxRx.DRxRxLean[]>}
 */
exports.findRxsOnStage = async (deliveryStationId) =>
  await DRxRx.find({
    deliveryStation: deliveryStationId,
    deliveryLog: { $exists: false },
  }).lean();

/**
 * @template T
 * @param {import("mongoose").Model<T>} model
 * @param {Record<string, *>} query
 * @param {Record<string, *>} update
 * @param {import("mongoose").ClientSession} [session]
 * @returns {Promise<*>}
 */
const _upsertPatientOrPlan = (model, query, update, session) => {
  const { __v, ..._update } = update;
  const isOptimistic = Number.isInteger(__v);
  const _query = isOptimistic ? { ...query, __v } : query;
  const pipeline = [{ $set: { ..._update } }];
  if (isOptimistic)
    pipeline[0].$set.__v = {
      $add: [{ $ifNull: ["$__v", -1] }, 1],
    };
  try {
    return model
      .findOneAndUpdate(_query, pipeline, {
        returnDocument: "after",
        runValidators: true,
        upsert: true,
        session,
      })
      .lean();
  } catch (error) {
    //@ts-ignore
    if (error.code === 11000) throw E.conflict();
    throw error;
  }
};

/**
 * @param {Parameters<DRxRx["create"]>[0]} dRxRxParam
 * @param {UpdateSetInput<DRxRx.DRxRxSchema>} $set
 * @param {import("mongoose").ClientSession} [session]
 * @returns {Promise<DRxRx.DRxRxLean>}
 */
const _upsertRx = async (dRxRxParam, $set, session) => {
  try {
    return await DRxRx.findOneAndUpdate(
      { rxID: dRxRxParam.rxID, deliveryLog: null },
      { $set },
      {
        returnDocument: "after",
        runValidators: true,
        upsert: true,
        session,
      },
    ).lean();
  } catch (error) {
    //@ts-ignore
    if (error.code === 11000) throw E.rxAlreadyDelivered();
    throw error;
  }
};

/**
 * @param {Parameters<DRxRx["create"]>[0]} dRxRxParam
 * @param {DRxPatient.DRxPatientLean | ObjectId | string} dRxPatientParam
 * @param {DRxPlan.DRxPlanLean | ObjectId | string} [dRxPlanParam]
 * @returns {Promise<DRxRx.DRxRxLean>}
 */
exports.upsertRx = async (dRxRxParam, dRxPatientParam, dRxPlanParam) => {
  const isPatientId = isObjectIdOrHexString(dRxPatientParam);
  const isPlanMissing = dRxPlanParam == null;
  const isPlanId = !isPlanMissing && isObjectIdOrHexString(dRxPlanParam);

  // Fast path:
  // If patient is already an ObjectId and plan is either missing or already an ObjectId,
  // we can directly upsert the Rx document.
  if (isPatientId && (isPlanMissing || isPlanId)) {
    /** @type {Record<string, any>} */
    const $set = {
      ...dRxRxParam,
      patient: /** @type {ObjectId | string} */ (dRxPatientParam),
    };
    if (!isPlanMissing) {
      $set.plan = /** @type {ObjectId | string} */ (dRxPlanParam);
    }
    return await _upsertRx(dRxRxParam, $set);
  }

  // Slow path:
  // Create missing patient and/or plan in a transaction, then upsert Rx in the same session.
  const { upsertedPatient, upsertedPlan, rx } = await runInTransaction(
    async (session) => {
      let upsertedPatient, upsertedPlan;
      /** @type {Array<Promise<*> | null>} */
      if (!isPatientId) {
        const _dRxPatientParam = /** @type {DRxPatient.DRxPatientLean} */ (
          dRxPatientParam
        );
        upsertedPatient = await _upsertPatientOrPlan(
          DRxPatient,
          { patientID: _dRxPatientParam.patientID },
          _dRxPatientParam,
          session,
        );
      }
      if (!isPlanMissing && !isPlanId) {
        const _dRxPlanParam = /** @type {DRxPlan.DRxPlanLean} */ (dRxPlanParam);
        upsertedPlan = await _upsertPatientOrPlan(
          DRxPlan,
          { planID: _dRxPlanParam.planID },
          _dRxPlanParam,
          session,
        );
      }

      /** @type {Record<string, any>} */
      const $set = {
        ...dRxRxParam,
        patient: isPatientId ? dRxPatientParam : upsertedPatient._id,
      };
      if (!isPlanMissing)
        $set.plan = isPlanId ? dRxPlanParam : upsertedPlan._id;
      const rx = await _upsertRx(dRxRxParam, $set, session);
      return { upsertedPatient, upsertedPlan, rx };
    },
  );
  if (upsertedPatient) delPatientCache(upsertedPatient);
  if (upsertedPlan) delPlanCache(upsertedPlan);
  return rx;
};

/**
 * @param {ObjectId | string} dRxRxId
 * @param {number} version
 * @param {ObjectId | string | undefined} [deliveryStationId]
 * @returns {Promise<string | undefined>}
 */
exports.setDelivery = async (dRxRxId, version, deliveryStationId) => {
  const rx = await DRxRx.findOne({ _id: dRxRxId, __v: version });
  if (!rx) throw E.conflict();
  if (rx.deliveryLog) throw E.rxAlreadyDelivered();
  const exStationId = rx.deliveryStation?.toString();
  if (deliveryStationId) {
    await rx.updateOne({
      $set: { deliveryStation: deliveryStationId, deliveryDate: new Date() },
    });
  } else if (exStationId) {
    await rx.updateOne({ $unset: { deliveryStation: 1, deliveryDate: 1 } });
  }
  return exStationId;
};

/**
 * @param {ObjectId | string} dRxRxId
 * @param {number} version
 * @returns {Promise<DRxRx.DRxRxLean>}
 */
exports.returnDelivery = async (dRxRxId, version) => {
  const updated = await DRxRx.findOneAndUpdate(
    {
      _id: dRxRxId,
      __v: version,
      deliveryLog: { $exists: true, $ne: null },
    },
    [
      {
        $set: {
          logHistory: {
            $concatArrays: [{ $ifNull: ["$logHistory", []] }, ["$deliveryLog"]],
          },
          returnDates: {
            $concatArrays: [{ $ifNull: ["$returnDates", []] }, [new Date()]],
          },
          __v: { $add: ["$__v", 1] },
        },
      },
      { $unset: ["deliveryLog", "deliveryStation", "deliveryDate"] },
    ],
    { updatePipeline: true, returnDocument: "after", runValidators: true },
  ).lean();
  if (!updated) throw E.conflict();
  return updated;
};

/**
 * @param {string} [last]
 * @param {string} [first]
 * @returns {Promise<DRxPatient.DRxPatientLean[]>}
 */
exports.searchPatient = async (last, first) => {
  const query = {};
  if (last) query.patientLastName = { $regex: `^${last}`, $options: "i" };
  if (first) query.patientFirstName = { $regex: `^${first}`, $options: "i" };

  return await DRxPatient.find(query).lean();
};
