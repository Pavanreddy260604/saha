import { query } from "../db.js";

/**
 * Applies retry policy to a call.
 * 
 * @param {string} callId - The call ID
 * @param {string} failureReason - Outcome label if retries exhausted (e.g., 'dial_failed', 'no_answer', 'retry_exhausted')
 * @returns {Promise<{retried: boolean, failed: boolean, call: object|null}>}
 */
export const applyRetryPolicy = async (callId, failureReason = 'retry_exhausted') => {
    // 🛡 Atomic Update: Increment retry ONLY if under limit
    const retryResult = await query(
        `
    UPDATE calls
    SET status = 'PENDING',
        retry_count = retry_count + 1,
        next_action_at = NOW() + (retry_delay_minutes * interval '1 minute'),
        claimed_at = NULL
    WHERE id = $1
      AND retry_count < max_retries
    RETURNING *
    `,
        [callId]
    );

    if (retryResult.rowCount > 0) {
        return { retried: true, failed: false, call: retryResult.rows[0] };
    }

    // Retries exhausted -> Mark as FAILED
    const failResult = await query(
        `
    UPDATE calls
    SET status = 'FAILED',
        outcome = $2,
        claimed_at = NULL
    WHERE id = $1
    RETURNING *
    `,
        [callId, failureReason]
    );

    return { retried: false, failed: true, call: failResult.rows[0] || null };
};
