const mongoose = require("mongoose");

const outboxMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true, // 컨슈머 Inbox 중복 체크용 고유 ID
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
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PUBLISHED", "DEAD"],
      default: "PENDING",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lockedAt: {
      type: Date,
      default: null, // 워커 크래시 시 좀비 락(Stale Lock) 복구용
    },
    lastError: {
      type: String,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

outboxMessageSchema.index({ status: 1, createdAt: 1 });
outboxMessageSchema.index({ status: 1, lockedAt: 1 });
outboxMessageSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("OutboxMessage", outboxMessageSchema);
