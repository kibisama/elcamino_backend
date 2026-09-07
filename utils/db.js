const mongoose = require("mongoose");

/**
 * @template T
 * @param {function(ClientSession): Promise<T>} fn
 * @returns {Promise<T>}
 */
exports.runInTransaction = async (fn) => {
  /** @type {ClientSession | undefined} */
  let session;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(async () => await fn(session));
  } finally {
    if (session) session.endSession();
  }
};
