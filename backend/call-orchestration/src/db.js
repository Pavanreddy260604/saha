import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
  console.log("🔄 Attempting to reconnect...");
  attemptReconnect();
});

// Reconnection logic
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 3000;

const attemptReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("❌ Max reconnection attempts reached. Exiting.");
    process.exit(1);
  }

  reconnectAttempts++;
  console.log(`🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

  setTimeout(() => {
    pool.connect()
      .then(client => {
        console.log("✅ Reconnected to PostgreSQL");
        reconnectAttempts = 0; // Reset on success
        client.release();
      })
      .catch(err => {
        console.error("❌ Reconnect failed:", err.message);
        attemptReconnect();
      });
  }, RECONNECT_DELAY_MS);
};

export const query = (text, params) => {
  return pool.query(text, params);
};

// Force immediate connection attempt on startup
pool.connect()
  .then(client => {
    client.release();
  })
  .catch(err => {
    console.error("❌ Initial DB connection failed:", err.message);
    attemptReconnect();
  });
