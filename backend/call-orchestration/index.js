import "dotenv/config";
import app from "./src/app.js";
import { query } from "./src/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await query('SELECT 1');
    console.log("✅ DB Connected");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Call Orchestration Service is running on port ${PORT}`);
  });
};

startServer();
