const mongoose = require("mongoose");

const deliveryStationSchema = new mongoose.Schema({
  displayName: { type: String, required: true, unique: true },
  invoiceCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minLength: 3,
    maxLength: 3,
    immutable: true,
  },
  active: { type: Boolean, default: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  phone: { type: String, required: true },
  useAutomation: {
    type: Boolean,
    default: false,
  },
  automationPrefixes: {
    type: [{ type: String, uppercase: true }],
    /**
     * @param {string[]} prefixes
     * @returns {Promise<boolean>}
     */
    validate: async function (prefixes) {
      if (!Array.isArray(prefixes)) return false;
      if (prefixes.length === 0) return true;
      const sortedPrefixes = [...prefixes].sort();
      for (let i = 0; i < sortedPrefixes.length - 1; i++) {
        if (sortedPrefixes[i + 1].startsWith(sortedPrefixes[i])) return false;
      }
      const subPrefixes = [];
      const regexQueries = [];
      for (const prefix of prefixes) {
        for (let i = 1; i < prefix.length; i++)
          subPrefixes.push(prefix.substring(0, i));
        regexQueries.push(new RegExp(`^${prefix}`));
      }
      const DeliveryStation = this.constructor;
      const conflict = await DeliveryStation.findOne({
        _id: { $ne: this._id },
        $or: [
          { automationPrefixes: { $in: subPrefixes } },
          { automationPrefixes: { $in: regexQueries } },
        ],
      })
        .hint({ automationPrefixes: 1 })
        .lean();
      if (conflict) return false;
      return true;
    },
  },
});

module.exports = mongoose.model("Delivery Station", deliveryStationSchema);

/**
 * @typedef {InferSchemaType<typeof deliveryStationSchema>} DeliveryStationSchema
 * @typedef {CreateInput<DeliveryStationSchema, "active" | "useAutomation" | "automationPrefixes">} CreateDeliveryInput
 * @typedef {InferLeanWithVersion<typeof deliveryStationSchema>} DeliveryStationLean
 */
