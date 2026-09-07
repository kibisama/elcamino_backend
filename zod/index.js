const z = require("zod");
const {
  Types: {
    ObjectId: { isValid },
  },
} = require("mongoose");
const E = require("../utils/error");

/**
 * @param {import("zod").ZodType} schema
 * @returns {RequestHandler}
 */
exports.validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(E.badRequest());
  req.body = result.data;
  next();
};

const zObjectId = z.string().refine((v) => isValid(v));

exports.updateSettingSchema = z.object({
  version: z.number(),
  data: z.object({
    store: z.object({
      name: z.string().min(1),
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      phone: z.string().min(1),
      fax: z.string().min(1),
      email: z.string().min(1),
      managerLN: z.string().min(1),
      managerFN: z.string().min(1),
    }),
  }),
});

const BASE_STATION_SCHEMA = z.object({
  displayName: z.string().min(1),
  active: z.boolean(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  phone: z.string().min(1),
  useAutomation: z.boolean(),
  automationPrefixes: z.array(z.string()),
});

exports.createStationSchema = BASE_STATION_SCHEMA.extend({
  invoiceCode: z.string().min(3).max(3).toUpperCase(),
});

exports.updateStationSchema = z.object({
  version: z.number(),
  data: BASE_STATION_SCHEMA,
});

exports.cancelDeliverySchema = z.object({
  version: z.number(),
});

exports.createDeliveryLogSchema = z.object({
  items: z
    .array(
      z.object({
        id: zObjectId,
        version: z.number(),
      }),
    )
    .min(1),
});

/**
 * @typedef {z.infer<exports.updateSettingSchema>} UpdateSettingInput
 * @typedef {z.infer<exports.createStationSchema>} CreateStationInput
 * @typedef {z.infer<exports.updateStationSchema>} UpdateStationInput
 * @typedef {z.infer<exports.createDeliveryLogSchema>} CreateDeliveryLogInput
 */
