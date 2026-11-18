const RabbitOutbox = require("../models/rabbitOutbox");

/**
 * @param {RabbitOutbox.CreateRabbitOutboxInput} input
 * @param {ClientSession} [session]
 * @returns {Promise<RabbitOutbox.RabbitOutboxLean>}
 */
exports.create = async (input, session) => {
  const [doc] = await RabbitOutbox.create([input], session ? { session } : {});
  return doc.toObject();
};

/**
 * @returns {Promise<RabbitOutbox.RabbitOutboxLean | null>}
 */
exports.claimOne = async () =>
  await RabbitOutbox.findOneAndUpdate(
    { status: "PENDING" },
    { $set: { status: "PROCESSING" } },
    { returnDocument: "after" },
  ).lean();

exports.recoverStale = async () => {
  await RabbitOutbox.updateMany(
    { status: "PROCESSING" },
    { $set: { status: "PENDING" } },
  );
};

//   /**
//    * 발행 성공 처리
//    */
//   async markPublished(id, lockToken) {
//     return OutboxMessage.updateOne(
//       {
//         _id: id,
//         status: "PROCESSING",
//         lockToken,
//       },
//       {
//         $set: {
//           status: "PUBLISHED",
//           publishedAt: new Date(),
//           lockedAt: null,
//           lockToken: null,
//           lastError: null,
//         },
//       },
//     );
//   }

//   /**
//    * 발행 실패 처리
//    */
//   async markFailed(
//     id,
//     lockToken,
//     retryCount,
//     maxRetries,
//     error,
//   ) {
//     const exhausted = retryCount >= maxRetries;

//     const delay = Math.min(
//       1000 * Math.pow(2, retryCount),
//       300000,
//     );

//     return OutboxMessage.updateOne(
//       {
//         _id: id,
//         status: "PROCESSING",
//         lockToken,
//       },
//       {
//         $set: {
//           status: exhausted ? "DEAD" : "PENDING",
//           retryCount,

//           nextAttemptAt: new Date(
//             Date.now() + Math.random() * delay,
//           ),

//           lastError: String(error?.message || error),
//           lockedAt: null,
//           lockToken: null,
//         },
//       },
//     );
//   }
