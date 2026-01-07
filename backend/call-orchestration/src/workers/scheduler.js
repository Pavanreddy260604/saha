import { query } from "../db.js";
import { fakeDial } from "../services/fakeDialer.js";

const SCHEDULER_INTERVAL_MS = 5000;
let isRunning = false;

const runScheduler = async () => {
  if (isRunning) {
    console.log("⏭ Scheduler skipped (already running)");
    return;
  }

  isRunning = true;
  console.log("⏰ Scheduler tick started");

  try {
    // 1️⃣ Select only ELIGIBLE pending calls
    const result = await query(
      `
      SELECT id
      FROM calls
      WHERE status = 'PENDING'
        AND next_action_at <= NOW()
      ORDER BY next_action_at, created_at
      LIMIT 5
      `
    );

    if (result.rows.length === 0) {
      console.log("ℹ️ No eligible calls");
      return;
    }

    // 2️⃣ Process each call independently
    for (const row of result.rows) {
      const callId = row.id;

      // 3️⃣ ATOMIC CLAIM
      const claimResult = await query(
        `
        UPDATE calls
        SET status = 'CLAIMED'
        WHERE id = $1
          AND status = 'PENDING'
        RETURNING id
        `,
        [callId]
      );

      // ❗ CRITICAL FIX: Only proceed if claim succeeded
      if (claimResult.rows.length === 0) {
        console.log(`⏭ Call ${callId} already claimed, skipping`);
        continue;
      }

      console.log(`📞 Call ${callId} successfully CLAIMED`);

      // 4️⃣ Execute call
      await fakeDial(callId);
    }

  } catch (err) {
    console.error("❌ Scheduler error:", err);
  } finally {
    isRunning = false;
    console.log("✅ Scheduler tick finished");
  }
};

// Entry point
export const startScheduler = () => {
  console.log("⏰ Scheduler process started");
  setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
};
