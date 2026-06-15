const express = require("express");
const pool = require("./db");

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* Product Analytics */

app.get("/api/analytics/products/:productId/sales", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM product_sales_view WHERE product_id=$1",
    [req.params.productId]
  );

  res.json(result.rows[0] || {});
});

/* Category Analytics */

app.get("/api/analytics/categories/:category/revenue", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM category_metrics_view WHERE category_name=$1",
    [req.params.category]
  );

  res.json(result.rows[0] || {});
});

/* Customer Analytics */

app.get("/api/analytics/customers/:customerId/lifetime-value", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM customer_ltv_view WHERE customer_id=$1",
    [req.params.customerId]
  );

  res.json(result.rows[0] || {});
});

/* Sync Status */

app.get("/api/analytics/sync-status", async (req, res) => {

  const result = await pool.query(
    "SELECT * FROM sync_status LIMIT 1"
  );

  if (!result.rows.length) {
    return res.json({
      lastProcessedEventTimestamp: null,
      lagSeconds: null
    });
  }

  const ts = result.rows[0].last_processed_event_timestamp;

  const lag =
    ts ?
    Math.floor(
      (Date.now() - new Date(ts).getTime()) / 1000
    )
    : null;

  res.json({
    lastProcessedEventTimestamp: ts,
    lagSeconds: lag
  });
});

app.listen(8081, () => {
  console.log("Query Service Running");
});