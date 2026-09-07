class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} [message]
   */
  constructor(code, message) {
    super(message);
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  // ==========================================
  // Delivery Log
  // ==========================================
  /**
   * @param {string} [message]
   */
  deliveryLogNotFound(message) {
    return new AppError("DELIVERY_LOG_NOT_FOUND", message);
  },
  // ==========================================
  // Delivery Station
  // ==========================================
  /**
   * @param {string} [message]
   */
  stationNotFound(message) {
    return new AppError("STATION_NOT_FOUND", message);
  },
  /**
   * @param {string} [message]
   */
  stationNotActive(message) {
    return new AppError("STATION_NOT_ACTIVE", message);
  },

  // ==========================================
  // Patient
  // ==========================================
  /**
   * @param {string} [message]
   */
  patientNotFound(message) {
    return new AppError("PATIENT_NOT_FOUND", message);
  },

  // ==========================================
  // Pickup
  // ==========================================
  /**
   * @param {string} [message]
   */
  pickupNotFound(message) {
    return new AppError("PICKUP_NOT_FOUND", message);
  },

  // ==========================================
  // Plan
  // ==========================================
  /**
   * @param {string} [message]
   */
  planNotFound(message) {
    return new AppError("PLAN_NOT_FOUND", message);
  },

  // ==========================================
  // Rx
  // ==========================================
  /**
   * @param {string} [message]
   */
  rxNotFound(message) {
    return new AppError("RX_NOT_FOUND", message);
  },

  // ==========================================
  // Setting
  // ==========================================
  /**
   * @param {string} [message]
   */
  settingNotFound(message) {
    return new AppError("SETTING_NOT_FOUND", message);
  },

  /**
   * @param {string} [message]
   */
  invalidParam(message) {
    return new AppError("INVALID_PARAM", message);
  },
  /**
   * @param {string} [message]
   */
  notFound(message) {
    return new AppError("NOT_FOUND", message);
  },
  /**
   * @param {string} [message]
   */
  badRequest(message) {
    return new AppError("BAD_REQUEST", message);
  },
  /**
   * @param {string} [message]
   */
  conflict(message) {
    return new AppError("CONFLICT", message);
  },
  /**
   * @param {string} [message]
   */
  missingNamespace(message) {
    return new AppError("MISSING_NAMESPACE", message);
  },
  /**
   * @param {string} [message]
   */
  forbidden(message) {
    return new AppError("FORBIDDEN", message);
  },
  /**
   * @param {string} [message]
   */
  internalServerError(message) {
    return new AppError("INTERNAL_SERVER_ERROR", message);
  },
  /**
   * @param {string} [message]
   */
  rxAlreadyDelivered(message) {
    return new AppError("RX_ALREADY_DELIVERED", message);
  },
};
