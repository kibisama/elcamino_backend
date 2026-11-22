const E = require("../utils/error");
const Item = require("../models/item");

/**
 * @param {import("../services/item").DataMatrixWithDate} dm
 * @returns {Promise<Item.ItemLean>}
 */
exports.fillItem = async ({ gtin, sn, lot, exp }) =>
  await Item.findOneAndUpdate(
    { gtin, sn },
    [
      {
        $set: {
          lot: { $ifNull: ["$lot", lot] },
          exp: { $ifNull: ["$exp", exp] },
          dateFilled: { $ifNull: ["$dateFilled", new Date()] },

          __v: {
            $cond: {
              if: { $eq: [{ $type: "$__v" }, "missing"] },
              then: 0,
              else: {
                $cond: {
                  if: { $eq: [{ $ifNull: ["$dateFilled", null] }, null] },
                  then: { $add: ["$__v", 1] },
                  else: "$__v",
                },
              },
            },
          },
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
      runValidators: true,
    },
  ).lean();
