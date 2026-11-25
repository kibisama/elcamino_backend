const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  gtin: {
    type: String,
    required: true,
    minLength: 14,
    maxLength: 14,
    index: true,
  },
  lot: { type: String, required: true },
  sn: { type: String, required: true },
  exp: { type: Date, required: true },
});

itemSchema.index({ gtin: 1, sn: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);

/**
 * @typedef {InferSchemaType<typeof itemSchema>} ItemSchema
 * @typedef {InferLeanWithVersion<typeof itemSchema>} ItemLean
 */
