const NodeCache = require("node-cache");

/**
 * @typedef {import("../models/deliveryStation").DeliveryStationLean} DeliveryStationLean
 * @typedef {import("../services/station").DisplayMenuItem} DisplayMenuItem
 * @typedef {import("../services/station").DeliveryStationPrefixes} DeliveryStationPrefixes
 * @typedef {import("../models/dRxPatient").DRxPatientLean} DRxPatientLean
 * @typedef {import("../models/dRxPlan").DRxPlanLean} DRxPlanLean
 * @typedef {import("../services/delivery").DeliveryItem} DeliveryItem
 */

class CacheManager {
  constructor() {
    /** @type {Map<string, DeliveryStationLean>} */
    this.stations = new Map();

    /** @type {DisplayMenuItem[] | null} */
    this.menuItems = null;

    /** @type {DeliveryStationPrefixes[] | null} */
    this.stationPrefixes = null;

    /** @type {import("node-cache")} */
    this.patients = new NodeCache({
      stdTTL: 60 * 60 * 8,
      maxKeys: 2000,
      useClones: false,
    });
    /** @type {Map<string, DRxPlanLean>} */
    this.plans = new Map();

    /**
     * dRxRx._id, DeliveryItem
     * @type {import("node-cache")}
     */
    this.items = new NodeCache({
      stdTTL: 60 * 60 * 24,
      maxKeys: 5000,
      useClones: false,
    });
    /**
     * deliveryStation._id, dRxRx._id[]
     * @type {Map<string, string[]>}
     */
    this.onStage = new Map();
    /**
     * deliveryStation.invoiceCode:deliveryLog.date, deliveryLog.session[]
     * @type {Map<string, string[]>}
     */
    this.sessions = new Map();
    /**
     * deliveryStation.invoiceCode:deliveryLog.date:deliveryLog.session, dRxRx._id[]
     * @type {Map<string, string[]>}
     */
    this.logs = new Map();
  }

  /**
   * @param {string} key
   * @returns {DeliveryStationLean | undefined}
   */
  getStation(key) {
    return this.stations.get(key);
  }
  /**
   * @param {string} key
   * @param {DeliveryStationLean} station
   */
  setStation(key, station) {
    this.stations.set(key, station);
  }
  /**
   * @param {string} key
   */
  delStation(key) {
    this.stations.delete(key);
  }

  /**
   * @returns {DisplayMenuItem[] | null}
   */
  getDisplayNames() {
    return this.menuItems;
  }
  /**
   * @returns {DeliveryStationPrefixes[] | null}
   */
  getPrefixes() {
    return this.stationPrefixes;
  }

  /**
   * @param {DisplayMenuItem[]} menuItems
   */
  setDisplayMenuItems(menuItems) {
    this.menuItems = menuItems;
  }
  /**
   * @param {DeliveryStationPrefixes[]} prefixes
   */
  setPrefixes(prefixes) {
    this.stationPrefixes = prefixes;
  }

  delDisplayMenuItems() {
    this.menuItems = null;
  }
  delPrefixes() {
    this.stationPrefixes = null;
  }

  /**
   * @param {string} key
   * @returns {DRxPatientLean | undefined}
   */
  getPatient(key) {
    return this.patients.get(key);
  }
  /**
   * @param {string} key
   * @param {DRxPatientLean} patient
   */
  setPatient(key, patient) {
    this.patients.set(key, patient);
  }
  /**
   * @param {string} key
   */
  delPatient(key) {
    this.patients.del(key);
  }

  /**
   * @param {string} key
   * @returns {DRxPlanLean | undefined}
   */
  getPlan(key) {
    return this.plans.get(key);
  }
  /**
   * @param {string} key
   * @param {DRxPlanLean} plan
   */
  setPlan(key, plan) {
    this.plans.set(key, plan);
  }
  /**
   * @param {string} key
   */
  delPlan(key) {
    this.plans.delete(key);
  }

  /**
   * @param {string} dRxRxId
   * @returns {DeliveryItem | undefined}
   */
  getItem(dRxRxId) {
    return this.items.get(dRxRxId);
  }
  /**
   * @param {string} dRxRxId
   * @param {DeliveryItem} item
   */
  setItem(dRxRxId, item) {
    this.items.set(dRxRxId, item);
  }
  /**
   * @param {string} dRxRxId
   */
  delItem(dRxRxId) {
    this.items.del(dRxRxId);
  }
  flushItems() {
    this.items.flushAll();
  }

  /**
   * @param {string} deliveryStationId
   * @returns {string[] | undefined}
   */
  getStage(deliveryStationId) {
    return this.onStage.get(deliveryStationId);
  }
  /**
   * @param {string} deliveryStationId
   * @param {string[]} dRxRxIds
   */
  setStage(deliveryStationId, dRxRxIds) {
    this.onStage.set(deliveryStationId, dRxRxIds);
  }
  /**
   * @param {string} deliveryStationId
   */
  delStage(deliveryStationId) {
    this.onStage.delete(deliveryStationId);
  }
  clearStages() {
    this.onStage.clear();
  }

  /**
   * @param {string} key
   * @returns {string[] | undefined}
   */
  getSessions(key) {
    return this.sessions.get(key);
  }
  /**
   * @param {string} key
   * @param {string[]} sessions
   */
  setSessions(key, sessions) {
    this.sessions.set(key, sessions);
  }
  /**
   * @param {string} key
   */
  delSessions(key) {
    this.sessions.delete(key);
  }

  /**
   * @param {string} key
   * @returns {string[] | undefined}
   */
  getLog(key) {
    return this.logs.get(key);
  }
  /**
   * @param {string} key
   * @param {string[]} dRxRxIds
   */
  setLog(key, dRxRxIds) {
    this.logs.set(key, dRxRxIds);
  }
  clearLogs() {
    this.logs.clear();
  }
}

module.exports = new CacheManager();
