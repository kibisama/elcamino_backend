const mongoose = require("mongoose");
const { ITEM_INPUT_METHODS } = require("../constants");

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
  inputMethod: {
    type: String,
    enum: ITEM_INPUT_METHODS,
    required: true,
  },

  cost: String,

  dateReceived: Date,
  // source: { type: mongoose.Schema.Types.ObjectId, ref: "" },
  // invoiceRef: String,

  dateFilled: { type: Date, index: true },
  dateReversed: Date,
  dateReturned: Date,
});

itemSchema.index({ gtin: 1, sn: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);

/**
 * @typedef {InferSchemaType<typeof itemSchema>} ItemSchema
 * @typedef {InferLeanWithVersion<typeof itemSchema>} ItemLean
 */
