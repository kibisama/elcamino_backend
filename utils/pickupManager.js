const dayjs = require("dayjs");
const E = require("./error");

/**
 * @typedef {Object} PickupData
 * @property {"standby" | "pre-submit"} state
 * @property {import("../models/pickup").PickupRelation} relation
 * @property {string | null} canvas
 * @property {string} notes
 * @property {string[]} items
 * @property {string | null} date
 *
 * @typedef {Object} PickupItemsData
 * @property {"push" | "pull"} action
 * @property {string} item
 */

class PickupManager {
  constructor() {
    /** @type {SocketNamespace | null} */
    this.io = null;

    /** @type {NodeJS.Timeout | null} */
    this.timeout = null;

    this.#initData();
  }

  #initData() {
    /** @type {PickupData} */
    this.data = {
      state: "standby",
      relation: "self",
      canvas: null,
      notes: "",
      items: [],
      date: null,
    };
  }

  /**
   * @param {SocketNamespace} namespace
   */
  bindNamespace(namespace) {
    this.io = namespace;

    if (this.timeout) {
      clearInterval(this.timeout);
      this.timeout = null;
    }
    this.timeout = setInterval(() => this.emitTime(), 1000);

    this.io.on("connect", (socket) => {
      this.#emitAll(socket);
      this.emitTime(socket);

      const keys = /** @type {(keyof PickupData)[]} */ (Object.keys(this.data));
      keys.forEach((key) =>
        socket.on(key, (value) => {
          this.#update(key, value);
          this.#emit(key, socket);
        }),
      );
      socket.on("clear_canvas", this.#clearCanvas.bind(this));
      socket.on("reset", this.reset.bind(this));
      socket.on("refresh", this.#emitAll.bind(this));
    });
  }

  /**
   * @returns {PickupData}
   */
  getData() {
    return structuredClone(this.data);
  }

  reset() {
    this.#throwMissingNamespace();
    this.#initData();
    this.#emitAll();
  }

  emitError() {
    this.#throwMissingNamespace();
    this.io.emit("state", "error");
    this.data.state = "standby";
  }

  emitSuccess() {
    this.#throwMissingNamespace();
    this.io.emit("state", "success");
  }

  /**
   * @param {Socket} [socket]
   */
  emitTime(socket) {
    const _this = socket || this.io;
    if (_this) {
      _this.emit("time", dayjs().format("dddd, M/DD/YYYY hh:mm A"));
    }
  }

  /**
   * @template {keyof PickupData} K
   * @param {K} key
   * @param {any} value
   */
  #update(key, value) {
    if (key in this.data) {
      if (key === "items") {
        /** @type {PickupItemsData} */
        const { action, item } = value;
        if (action === "push") {
          if (item && !this.data.items.includes(item)) {
            this.data.items.push(item);
          }
        } else if (action === "pull") {
          const index = this.data.items.indexOf(item);
          if (index > -1) {
            this.data.items.splice(index, 1);
          }
        }
      } else {
        this.data[key] = value;
      }
    }
  }

  /**
   * @template {keyof PickupData} K
   * @param {K} key
   * @param {Socket} socket
   */
  #emit(key, socket) {
    if (key in this.data) {
      if (key === "canvas") {
        socket.broadcast.emit("canvas", this.data.canvas);
      } else {
        this.io.emit(key, this.data[key]);
      }
    }
  }

  #clearCanvas() {
    this.data.canvas = null;
    this.io.emit("canvas", this.data.canvas);
  }

  /**
   * @param {Socket} [socket]
   */
  #emitAll(socket) {
    const _this = socket || this.io;
    for (const key in this.data) {
      _this.emit(key, this.data[key]);
    }
  }

  #throwMissingNamespace() {
    if (!this.io)
      throw E.missingNamespace(
        "You should not call methods before binding a namespace.",
      );
  }
}

module.exports = new PickupManager();
