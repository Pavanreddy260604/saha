import { query } from "../db.js";
import { dial } from "../services/dialer.js";
import { applyRetryPolicy } from "../rules/utils/retryPolicy.js";

import { recoverStuckClaims } from "./recoverStuckClaims.js";

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
    // 🛡 Recover stuck claims first
    await recoverStuckClaims();

    const result = await query(
      `
      SELECT *
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

    for (const call of result.rows) {
      const claimResult = await query(
        `
       UPDATE calls
SET status = 'CLAIMED',
    claimed_at = NOW()
WHERE id = $1
  AND status = 'PENDING'
RETURNING *

        `,
        [call.id]
      );

      if (claimResult.rows.length === 0) {
        continue;
      }

      const claimedCall = claimResult.rows[0];
      console.log(`📞 Call ${claimedCall.id} CLAIMED`);

      try {
        // 🔥 Attempt provider call via dispatcher
        await dial(claimedCall);

      } catch (err) {
        console.error(`❌ Dial failed for call ${claimedCall.id}`, err.message);

        // 🛡 Apply centralized retry policy
        const { retried, failed } = await applyRetryPolicy(claimedCall.id, 'dial_failed');
        if (retried) {
          console.log(`🔁 Call ${claimedCall.id} scheduled for retry`);
        } else if (failed) {
          console.log(`💀 Call ${claimedCall.id} marked FAILED (dial_failed)`);
        }
      }
    }

  } catch (err) {
    console.error("❌ Scheduler error:", err);
  } finally {
    isRunning = false;
    console.log("✅ Scheduler tick finished");
  }
};

export const startScheduler = () => {
  console.log("⏰ Scheduler process started");
  setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
};
