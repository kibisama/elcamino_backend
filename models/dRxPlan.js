const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  planID: { type: String, required: true, unique: true },
  planName: String,
  ansiBin: String,
  pcn: String,
});

module.exports = mongoose.model("DRx Plan", planSchema);

/**
 * @typedef {InferSchemaType<typeof planSchema>} DRxPlanSchema
 * @typedef {InferLeanWithVersion<typeof planSchema>} DRxPlanLean
 */
