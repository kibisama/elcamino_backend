const amqp = require("amqplib");

class RabbitMQManager {
  constructor() {
    /** @type {amqp.ChannelModel | null} */
    this.connection = null;

    /** @type {amqp.ConfirmChannel | null} */
    this.channel = null;

    this.isConnecting = false;
  }

  async connect() {
    if (this.connection) return this.connection;
    if (this.isConnecting) return;

    this.isConnecting = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);

      this.connection.on("error", (error) => {
        console.error(error);
        this.#reconnect();
      });
      this.connection.on("close", (error) => {
        if (error) {
          console.error(error);
          this.#reconnect();
        }
      });
      this.channel = await this.connection.createConfirmChannel();

      await this.#init();

      await this.channel.prefetch(PREFETCH);

      this.isConnecting = false;

      // for (let i = 0; i < this.onConnect.length; i++) this.onConnect[i]();

      return this.connection;
    } catch (error) {
      console.error(error);
      this.isConnecting = false;
      this.#reconnect();
    }
  }

  async #reconnect() {
    if (this.isConnecting) return;

    this.isConnecting = true;
    if (this.channel) this.channel.removeAllListeners();
    if (this.connection) this.connection.removeAllListeners();
    this.channel = null;
    this.connection = null;

    setTimeout(() => {
      this.isConnecting = false;
      this.connect();
    }, 5000);
  }

  async #init() {
    if (!this.channel) return;
    await this.channel.assertExchange(EXCHANGES.DLX, "direct", {
      durable: true,
    });
    for (const queue in QUEUES) {
      if (queue.endsWith("_DLQ")) {
        await this.channel.assertQueue(QUEUES[queue], { durable: true });
        await this.channel.bindQueue(
          QUEUES[queue],
          EXCHANGES.DLX,
          ROUTINGS.DLQ,
        );
      } else {
        await this.channel.assertQueue(QUEUES[queue], {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": EXCHANGES.DLX,
            "x-dead-letter-routing-key": ROUTINGS.DLQ,
          },
        });
      }
    }
  }
}
