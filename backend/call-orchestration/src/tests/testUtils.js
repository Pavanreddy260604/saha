import axios from "axios";
import { pool, query } from "../db.js";
import { applyRetryPolicy } from "../rules/utils/retryPolicy.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Create an outbound call via the API
 */
export const createOutboundCall = async ({ phone, bot_type = "default", provider = "fake" }) => {
    const res = await axios.post(`${BASE_URL}/api/calls/outbound`, {
        phone,
        bot_type,
        provider
    });
    return res.data.call;
};

/**
 * Simulate a no-answer event for a call.
 * Uses the centralized applyRetryPolicy to properly increment retry_count.
 */
export const simulateNoAnswer = async (callId) => {
    await applyRetryPolicy(callId, 'no_answer');
};

/**
 * Fetch a call by ID
 */
export const fetchCall = async (callId) => {
    const { rows } = await query(
        `SELECT * FROM calls WHERE id = $1`,
        [callId]
    );
    return rows[0];
};

/**
 * Assert no zombie states exist (calls in invalid states)
 */
export const assertNoZombies = async () => {
    const { rows } = await query(`
        SELECT *
        FROM calls
        WHERE status = 'CLAIMED'
          AND claimed_at < NOW() - INTERVAL '2 minutes'
    `);

    if (rows.length > 0) {
        throw new Error(`Found ${rows.length} zombie calls still in CLAIMED state`);
    }
};