const { Pool } = require("pg");

const pool = new Pool({
  host: "read-db",
  user: "user",
  password: "password",
  database: "read_db",
  port: 5432,
});

module.exports = pool;