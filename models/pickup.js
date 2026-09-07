const mongoose = require("mongoose");

const relation = /** @type {const} */ (["self", "ff", "gc", "other"]);

const pickupSchema = new mongoose.Schema({
  rxNumber: {
    type: [String],
    index: true,
    validate: [
      {
        /**
         * @param {string[]} v
         */
        validator: (v) => v.length > 0,
        message: "Must contain at least one rxNumber.",
      },
      {
        /**
         * @param {string[]} v
         */
        validator: (v) => v.length === new Set(v).size,
        message: "Duplicate rxNumbers are not allowed.",
      },
    ],
  },
  relation: {
    type: String,
    enum: relation,
    required: true,
  },
  notes: { type: String, default: "" },
  deliveryDate: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("Pickup", pickupSchema);

/**
 * @typedef {typeof relation[number]} PickupRelation
 * @typedef {InferSchemaType<typeof pickupSchema>} PickupSchema
 * @typedef {CreateInput<PickupSchema, "notes">} CreatePickupInput
 * @typedef {InferLeanWithVersion<typeof pickupSchema>} PickupLean
 */
