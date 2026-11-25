const mongoose = require("mongoose");
const { PACKAGE_IDENTIFIER_TYPES } = require("../constants");

const packageIdentifierSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: PACKAGE_IDENTIFIER_TYPES,
      required: true,
    },

    value: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

packageIdentifierSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model("Package Identifier", packageIdentifierSchema);

/**
 * @typedef {InferSchemaType<typeof packageIdentifierSchema>} PackageIdentifierSchema
 * @typedef {InferLeanWithVersion<typeof packageIdentifierSchema>} PackageIdentifierLean
 */
