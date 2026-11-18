const mongoose = require("mongoose");

const rabbitOutboxSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    exchange: {
      type: String,
      required: true,
    },
    routingKey: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    options: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PUBLISHED", "FAILED"],
      default: "PENDING",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

rabbitOutboxSchema.index({ status: 1, createdAt: 1 });
rabbitOutboxSchema.index({ status: 1, lockedAt: 1 });
rabbitOutboxSchema.index(
  { publishedAt: 1 },
  {
    expireAfterSeconds: 604800,
    partialFilterExpression: { status: "PUBLISHED" },
  },
);
module.exports = mongoose.model("RabbitOutbox", rabbitOutboxSchema);

/**
 * @typedef {InferSchemaType<typeof rabbitOutboxSchema>} RabbitOutboxSchema
 * @typedef {CreateInput<RabbitOutboxSchema, "options" | "status" | "retryCount" |
 * "publishedAt">} CreateRabbitOutboxInput
 * @typedef {InferLeanWithVersion<typeof rabbitOutboxSchema>} RabbitOutboxLean
 */
