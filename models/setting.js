const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    fax: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    managerLN: {
      type: String,
      required: true,
    },
    managerFN: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const settingSchema = new mongoose.Schema({
  store: { type: storeSchema, required: true },
});

module.exports = mongoose.model("Setting", settingSchema);

/**
 * @typedef {InferSchemaType<typeof storeSchema>} StoreSchema
 * @typedef {InferSchemaType<typeof settingSchema>} SettingSchema
 * @typedef {InferLeanWithVersion<typeof settingSchema>} SettingLean
 */
