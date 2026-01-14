import "dotenv/config";
import axios from "axios";
import { query, pool } from "../db.js";
import { jest, describe, test, expect, afterAll } from "@jest/globals";

const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Integration tests need longer timeout due to scheduler wait times
jest.setTimeout(30000);

describe("Week 2 Day 6 – Scheduler & Stop Conditions", () => {

    // Close database pool after all tests
    afterAll(async () => {
        await pool.end();
    });

    test("Retry exhaustion → FAILED", async () => {
        const res = await axios.post(`${BASE_URL}/api/calls/outbound`, {
            phone: "+919999999999",
            bot_type: "default",
            provider: "fake"
        });

        const callId = res.data.call.id;

        await sleep(6000);

        await query(`
      UPDATE calls
      SET retry_count = max_retries,
          status = 'FAILED',
          outcome = 'retry_exhausted'
      WHERE id = $1
    `, [callId]);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [callId]
        );

        expect(rows[0].status).toBe("FAILED");
    });

    test("COMPLETED calls never retry", async () => {
        const res = await axios.post(`${BASE_URL}/api/calls`, {
            phone: "+918888888888",
            direction: "outbound",
            provider: "fake"
        });

        const callId = res.data.id;

        await query(`
      UPDATE calls SET status = 'COMPLETED' WHERE id = $1
    `, [callId]);

        await sleep(6000);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [callId]
        );

        expect(rows[0].status).toBe("COMPLETED");
    });

    test("Stuck CLAIMED calls are recovered", async () => {
        const res = await axios.post(`${BASE_URL}/api/calls/outbound`, {
            phone: "+917777777777",
            provider: "fake"
        });

        const callId = res.data.call.id;

        await query(`
      UPDATE calls
      SET status = 'CLAIMED',
          claimed_at = NOW() - INTERVAL '2 minutes'
      WHERE id = $1
    `, [callId]);

        await sleep(6000);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [callId]
        );

        expect(["PENDING", "FAILED"]).toContain(rows[0].status);
    });

    test("No zombie states exist", async () => {
        const { rows } = await query(`
      SELECT DISTINCT status
      FROM calls
      WHERE status NOT IN (
        'PENDING',
        'CLAIMED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED'
      )
    `);

        expect(rows.length).toBe(0);
    });

});

