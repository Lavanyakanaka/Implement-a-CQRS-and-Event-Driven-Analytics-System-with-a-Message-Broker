const amqp = require("amqplib");
const { Pool } = require("pg");

const pool = new Pool({
  host: "read-db",
  user: "user",
  password: "password",
  database: "read_db",
  port: 5432
});

async function connectRabbit() {
  while (true) {
    try {
      const connection =
        await amqp.connect("amqp://guest:guest@rabbitmq:5672");

      console.log("Connected to RabbitMQ");
      return connection;
    } catch (err) {
      console.log("RabbitMQ not ready, retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function start() {
  const connection = await connectRabbit();

  const channel = await connection.createChannel();

  await channel.assertQueue("order-events");

  channel.consume("order-events", async (msg) => {
    const event = JSON.parse(msg.content.toString());

    console.log("Received:", event);

    channel.ack(msg);
  });
}

start();