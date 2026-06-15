const express = require("express");
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

/* Health Check */

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* Create Product */

app.post("/api/products", async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    const result = await pool.query(
      `
      INSERT INTO products(name, category, price, stock)
      VALUES($1,$2,$3,$4)
      RETURNING id
      `,
      [name, category, price, stock]
    );

    res.status(201).json({
      productId: result.rows[0].id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* Create Order */

app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const { customerId, items } = req.body;

    await client.query("BEGIN");

    let total = 0;

    for (const item of items) {
      total += item.price * item.quantity;
    }

    const orderResult = await client.query(
      `
      INSERT INTO orders(customer_id,total,status)
      VALUES($1,$2,'CREATED')
      RETURNING id
      `,
      [customerId, total]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items
        (order_id,product_id,quantity,price)
        VALUES($1,$2,$3,$4)
        `,
        [
          orderId,
          item.productId,
          item.quantity,
          item.price
        ]
      );
    }

    /* Outbox Event */

    const event = {
      eventType: "OrderCreated",
      orderId,
      customerId,
      items,
      total,
      timestamp: new Date().toISOString()
    };

    await client.query(
      `
      INSERT INTO outbox
      (id,topic,payload)
      VALUES($1,$2,$3)
      `,
      [
        uuidv4(),
        "order-events",
        JSON.stringify(event)
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      orderId
    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  } finally {
    client.release();
  }
});

app.listen(8080, () => {
  console.log("Command Service Running");
});