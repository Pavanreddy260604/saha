import "dotenv/config";
import app from "./src/app.js";
import { query } from "./src/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  
    app.listen(PORT, () => {
      console.log(`🚀 Call Orchestration Service is running on port ${PORT}`);
    });
};

startServer();
