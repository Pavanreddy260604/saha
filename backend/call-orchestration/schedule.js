import "dotenv/config";
import { startScheduler } from "./src/workers/scheduler.js";

console.log("⏰ Scheduler process started");
startScheduler();
