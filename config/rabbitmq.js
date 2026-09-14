// const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

// const QUEUES = {
//   NEW_RX: "drx_automation",
//   NEW_RX_DLQ: "drx_automation_dlq",
// };
// const EXCHANGES = {
//   DLX: "backend_dlx_ex",
// };
// const ROUTINGS = {
//   DLQ: "backend_dlq",
// };

// const PREFETCH = 1;

// module.exports = new RabbitMQManager();

// // const registeredConsumers = [];

// // function registerConsumer(queueName, businessLogic) {
// //   const consumer = { queueName, businessLogic };
// //   registeredConsumers.push(consumer);
// //   return async () => await startConsumer(consumer);
// // }

// // async function startConsumer(consumer) {
// //   if (!channel) return;
// //   const { queueName, businessLogic } = consumer;
// //   await channel.consume(
// //     queueName,
// //     async (msg) => {
// //       if (!msg) return;
// //       try {
// //         const payload = JSON.parse(msg.content.toString());
// //         await businessLogic(payload);
// //         channel.ack(msg);
// //       } catch (err) {
// //         // TODO: DB에 메시지를 저장
// //         // DB에 저장 실패 했을 경우 nack
// //         channel.ack(msg);
// //       }
// //     },
// //     { noAck: false }
// //   );
// // }

// // async function restartAllConsumers() {
// //   if (registeredConsumers.length === 0) return;
// //   for (const consumer of registeredConsumers) {
// //     try {
// //       await startConsumer(consumer);
// //     } catch (err) {
// //       //
// //     }
// //   }
// // }

// // module.exports = { QUEUES, initRabbitMQ, registerConsumer };
