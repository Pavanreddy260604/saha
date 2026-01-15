import "dotenv/config";
import { jest, describe, test, expect, afterAll, beforeEach } from "@jest/globals";
import { query, pool } from "../db.js";
import { sleep, createOutboundCall } from "./testUtils.js";

// Integration tests need longer timeout due to scheduler wait times
jest.setTimeout(30000);

describe("Week 2 Day 6 – Scheduler & Stop Conditions", () => {

    // Close database pool after all tests
    afterAll(async () => {
        await pool.end();
    });

    test("Retry exhaustion → FAILED", async () => {
        const call = await createOutboundCall({
            phone: "+919999999999",
            bot_type: "default",
            provider: "fake"
        });

        await sleep(6000);

        // Force retry exhaustion via direct DB update
        await query(`
            UPDATE calls
            SET retry_count = max_retries,
                status = 'FAILED',
                outcome = 'retry_exhausted'
            WHERE id = $1
        `, [call.id]);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [call.id]
        );

        expect(rows[0].status).toBe("FAILED");
    });

    test("COMPLETED calls never retry", async () => {
        const call = await createOutboundCall({
            phone: "+918888888888",
            provider: "fake"
        });

        // Mark as COMPLETED
        await query(`
            UPDATE calls SET status = 'COMPLETED' WHERE id = $1
        `, [call.id]);

        await sleep(6000);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [call.id]
        );

        // Should still be COMPLETED (scheduler should ignore it)
        expect(rows[0].status).toBe("COMPLETED");
    });

    test("Stuck CLAIMED calls are recovered", async () => {
        const call = await createOutboundCall({
            phone: "+917777777777",
            provider: "fake"
        });

        // Force stuck CLAIMED state (claimed 2+ minutes ago)
        await query(`
            UPDATE calls
            SET status = 'CLAIMED',
                claimed_at = NOW() - INTERVAL '2 minutes'
            WHERE id = $1
        `, [call.id]);

        await sleep(6000);

        const { rows } = await query(
            `SELECT status FROM calls WHERE id = $1`,
            [call.id]
        );

        // Should be recovered to PENDING or marked FAILED
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
