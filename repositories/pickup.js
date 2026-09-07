const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const Pickup = require("../models/pickup");
const E = require("../utils/error");
const dayjs = require("dayjs");
const { runInTransaction } = require("../utils/db");

const PNG_ROOT_DIR = process.env.PICKUP_PNG_DIR || "E:\\pickup";

/**
 * @param {string[]} items
 * @param {NonNullable<dayjs.ConfigType>} date
 * @returns {Promise<Pickup.PickupLean[]>}
 */
exports.findEx = async (items, date) => {
  const day = dayjs(date);
  return await Pickup.find({
    deliveryDate: {
      $gte: day.startOf("d").toDate(),
      $lte: day.endOf("d").toDate(),
    },
    rxNumber: { $in: items },
  }).lean();
};

/**
 * @param {NonNullable<dayjs.ConfigType>} date
 * @returns {string}
 */
const getPngDir = (date) => {
  const day = dayjs(date);
  return path.join(PNG_ROOT_DIR, day.format("YYYY"), day.format("MM"));
};
exports.getPngDir = getPngDir;

/**
 * @param {ObjectId | string} id
 * @returns {Promise<string>}
 */
exports.getPngPath = async (id) => {
  const objectId =
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
  const timestamp = objectId.getTimestamp();
  const pngPath = path.join(getPngDir(timestamp), `${objectId.toString()}.png`);
  try {
    await fs.access(pngPath);
    return pngPath;
  } catch (error) {
    //@ts-ignore
    if (error.code === "ENOENT") throw E.pickupNotFound();
    throw error;
  }
};

/**
 * @param {Pickup.CreatePickupInput} param
 * @param {string} canvas
 * @returns {Promise<Pickup.PickupLean>}
 */
exports.create = async (param, canvas) =>
  await runInTransaction(async (session) => {
    const [pickup] = await Pickup.create([param], { session });
    const { _id } = pickup;
    const timestamp = _id.getTimestamp();
    const dir = getPngDir(timestamp);

    await fs.mkdir(dir, { recursive: true });
    const binaryData = Buffer.from(
      canvas.replace(/^data:image\/png;base64,/, ""),
      "base64",
    );
    await fs.writeFile(
      path.join(dir, `${pickup._id.toString()}.png`),
      binaryData,
    );
    return pickup.toObject();
  });

/**
 * @param {string | string[]} rxNumber
 * @returns {Promise<Pickup.PickupLean[]>}
 */
exports.search = async (rxNumber) =>
  await Pickup.find({
    rxNumber: typeof rxNumber === "string" ? rxNumber : { $in: rxNumber },
  })
    .sort({ deliveryDate: -1 })
    .lean();

/**
 * @param {ObjectId | string} id
 * @returns {Promise<Pickup.PickupLean>}
 */
exports.findById = async (id) => {
  const pickup = await Pickup.findById(id).lean();
  if (!pickup) throw E.pickupNotFound();
  return pickup;
};

/**
 * @param {ObjectId | string} id
 * @param {number} version
 * @param {string} notes
 * @returns {Promise<Pickup.PickupLean>}
 */
exports.updateNotes = async (id, version, notes) => {
  const updated = await Pickup.findOneAndUpdate(
    { _id: id, __v: version },
    { $inc: { __v: 1 }, $set: { notes } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!updated) throw E.conflict();
  return updated;
};
