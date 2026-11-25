const mongoose = require("mongoose");
const { INVENTORY_EVENT_TYPES } = require("../constants");

const inventoryEventSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      enum: INVENTORY_EVENT_TYPES,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

inventoryEventSchema.index({ itemId: 1, eventType: 1 }, { unique: true });

module.exports = mongoose.model("Inventory Event", inventoryEventSchema);

/**
 * @typedef {InferSchemaType<typeof inventoryEventSchema>} InventoryEventSchema
 * @typedef {InferLeanWithVersion<typeof inventoryEventSchema>} InventoryEventLean
 */
