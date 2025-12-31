import "dotenv/config";
import app from "./src/app.js";
import { query } from "./src/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log("Testing database connection...");

    const res = await query(
      "INSERT INTO calls (phone, direction) VALUES ($1, $2) RETURNING *",
      ["+1234567890", "outbound"]
    );

    console.log("✅ Test DB Insert successful:", res.rows[0]);

    app.listen(PORT, () => {
      console.log(`🚀 Call Orchestration Service is running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1); // stop app if DB fails
  }
};

startServer();
