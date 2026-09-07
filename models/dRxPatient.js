const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  patientID: { type: String, required: true, unique: true },
  patientFirstName: { type: String, required: true, trim: true },
  patientLastName: { type: String, required: true, trim: true },
  patientDOB: String,
  patientSex: String,
  patientStreet: String,
  patientCity: String,
  patientState: String,
  patientZip: String,
  patientPhone: String,
  patientSSN: String,
  patNotes: String,
});

module.exports = mongoose.model("DRx Patient", patientSchema);

/**
 * @typedef {InferSchemaType<typeof patientSchema>} DRxPatientSchema
 * @typedef {InferLeanWithVersion<typeof patientSchema>} DRxPatientLean
 */
