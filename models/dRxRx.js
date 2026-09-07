const mongoose = require("mongoose");
const { DRX_RX_STATUS, DRX_RX_STATUSFIN } = require("../constants");

const digitalRxSchema = new mongoose.Schema(
  {
    rxID: { type: String, required: true, unique: true },
    createdDate: Date,
    createdBy: String,
    rxNumber: { type: String, required: true },
    fillNo: String,
    rxDateWritten: Date,
    effectiveDate: Date,
    nextFillDate: Date,
    rxDate: { type: Date, required: true },
    deliveredDate: Date,
    daw: String,
    sig: String,
    qtyWritten: String,
    refills: String,
    rxQty: String,
    qtyRemaining: String,
    daysSupply: String,
    rxOrigCode: String,
    rxNotes: String,
    rxStatus: { type: String, enum: DRX_RX_STATUS },
    rxStatusFin: { type: String, enum: DRX_RX_STATUSFIN },
    /* Patient Info */
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DRx Patient",
      required: true,
      index: true,
    },
    /* Doctor Info */
    doctorName: { type: String, uppercase: true, trim: true },
    doctorNPI: String,
    doctorDEA: String,
    /* Drug Info */
    drugName: String,
    drugNDC: String, // CMS
    drugDEA: String,
    drugRxOTC: String,
    bG: String,
    genericFor: String,
    /* Payment Info */
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "DRx Plan" },
    totalPaid: String,
    patPay: String,
    insPaid: String,
    dispFeePaid: String,
    insuredID: String,
    cardNumber: String,
    groupNumber: String,
    /* Delivery */
    deliveryStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery Station",
      index: true,
    },
    deliveryDate: { type: Date, index: true },
    deliveryLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery Log",
      index: true,
    },
    returnDates: [Date],
    logHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Delivery Log" }],
  },
  { timestamps: true },
);

digitalRxSchema.index(
  { rxNumber: 1, rxDate: -1 },
  {
    partialFilterExpression: {
      rxNumber: { $exists: true },
      rxDate: { $exists: true },
    },
  },
);

module.exports = mongoose.model("DRx Rx", digitalRxSchema);

/**
 * @typedef {InferSchemaType<typeof digitalRxSchema>} DRxRxSchema
 * @typedef {InferLeanWithVersion<typeof digitalRxSchema>} DRxRxLean
 * @typedef {Omit<DRxRxLean, "patient" | "plan" | "deliveryStation" | "deliveryLog"> & {
 *   patient: import("./dRxPatient").DRxPatientLean;
 *   plan: import("./dRxPlan").DRxPlanLean | null | undefined;
 *   deliveryStation: import("./deliveryStation").DeliveryStationLean | null | undefined;
 *   deliveryLog: import("./deliveryLog").DeliveryLogLean | null | undefined;
 * }} PopulatedDrxRxLean
 * @typedef {Omit<DRxRxSchema, "rxDate" | "patient" | "plan" | "createdAt" | "updatedAt" |
 * "deliveryStation" | "deliveryDate" | "deliveryLog" | "returnDates" | "logHistory"> &
 * Partial<{ rxDate: string, deliveryStation: string, deliveryDate: string, deliveryLog: string }> &
 * Partial<Pick<DRxRxSchema, "returnDates" | "logHistory">> &
 * import("./dRxPatient").DRxPatientSchema &
 * Partial<import("./dRxPlan").DRxPlanSchema>} DRxDto
 */
