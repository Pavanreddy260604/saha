import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;
console.log(process.env.DATABASE_URL)

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
 
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
  process.exit(1);
});

export const query = (text, params) => {
  return pool.query(text, params);
};
