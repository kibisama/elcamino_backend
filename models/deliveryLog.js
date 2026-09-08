const mongoose = require("mongoose");
const { DELIVERY_LOG_STATUS } = require("../constants");

const deliveryLogSchema = new mongoose.Schema({
  date: {
    type: String, // MMDDYYYY
    required: true,
    index: true,
  },
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Delivery Station",
    required: true,
  },
  session: {
    type: String,
    required: true,
  },
  dRxes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "DRx Rx" }],
    /**
     * @param {ObjectId[]} v
     */
    validate: (v) => {
      return Array.isArray(v) && v.length > 0;
    },
  },
  due: String,
  status: {
    type: String,
    enum: DELIVERY_LOG_STATUS,
    default: "CREATED",
    index: true,
  },
});

deliveryLogSchema.index({ date: 1, session: 1, station: 1 }, { unique: true });

module.exports = mongoose.model("Delivery Log", deliveryLogSchema);

/**
 * @typedef {InferSchemaType<typeof deliveryLogSchema>} DeliveryLogSchema
 * @typedef {InferLeanWithVersion<typeof deliveryLogSchema>} DeliveryLogLean
 */
