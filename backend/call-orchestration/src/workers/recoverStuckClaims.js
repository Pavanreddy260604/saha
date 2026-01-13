import { query } from "../db.js";
import { applyRetryPolicy } from "../utils/retryPolicy.js";

export const recoverStuckClaims = async () => {
    const { rows: stuckCalls } = await query(`
    SELECT *
    FROM calls
    WHERE status = 'CLAIMED'
      AND claimed_at < NOW() - INTERVAL '90 seconds'
  `);

    for (const call of stuckCalls) {
        // 🛡 Apply centralized retry policy
        const { retried, failed } = await applyRetryPolicy(call.id, 'stuck_timeout');
        if (retried) {
            console.log(`♻️ Recovered stuck call ${call.id} (scheduled for retry)`);
        } else if (failed) {
            console.log(`💀 Stuck call ${call.id} marked FAILED (stuck_timeout)`);
        }
    }
};
