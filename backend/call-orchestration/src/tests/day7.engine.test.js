import "dotenv/config";
import { jest, describe, test, expect, afterAll } from "@jest/globals";
import { pool } from "../db.js";
import {
    sleep,
    createOutboundCall,
    simulateNoAnswer,
    fetchCall,
    assertNoZombies
} from "./testUtils.js";

jest.setTimeout(60000);

describe("Week 2 Day 7 – Engine Stability (System Test)", () => {

    afterAll(async () => {
        await pool.end();
    });

    test("Multi-bot retries obey rules and never exceed limits", async () => {
        const defaultCall = await createOutboundCall({
            phone: "1111111111",
            bot_type: "default"
        });

        const reminderCall = await createOutboundCall({
            phone: "2222222222",
            bot_type: "reminder"
        });

        const paymentCall = await createOutboundCall({
            phone: "3333333333",
            bot_type: "payment"
        });

        // Let scheduler execute first attempt
        await sleep(7000);

        // First failure
        await simulateNoAnswer(defaultCall.id);
        await simulateNoAnswer(reminderCall.id);
        await simulateNoAnswer(paymentCall.id);

        await sleep(2000);

        const d1 = await fetchCall(defaultCall.id);
        const r1 = await fetchCall(reminderCall.id);
        const p1 = await fetchCall(paymentCall.id);

        expect(d1.retry_count).toBe(1);
        expect(r1.retry_count).toBe(1);
        expect(p1.retry_count).toBe(1);

        expect(d1.retry_count).toBeLessThanOrEqual(d1.max_retries);
        expect(r1.retry_count).toBeLessThanOrEqual(r1.max_retries);
        expect(p1.retry_count).toBeLessThanOrEqual(p1.max_retries);

        // Exhaust payment retries
        for (let i = 0; i < 5; i++) {
            await simulateNoAnswer(paymentCall.id);
            await sleep(1500);
        }

        const pFinal = await fetchCall(paymentCall.id);

        expect(pFinal.status).toBe("FAILED");
        expect(pFinal.retry_count).toBe(pFinal.max_retries);
    });

    test("Terminal calls never mutate", async () => {
        const call = await createOutboundCall({
            phone: "4444444444"
        });

        // Force to terminal COMPLETED state directly
        await pool.query(
            `UPDATE calls SET status = 'COMPLETED', outcome = 'answered' WHERE id = $1`,
            [call.id]
        );

        const before = await fetchCall(call.id);
        expect(before.status).toBe("COMPLETED");

        // Wait and try to mutate via simulateNoAnswer
        await simulateNoAnswer(call.id);
        await sleep(6000);

        const after = await fetchCall(call.id);

        // Terminal state should NOT change
        expect(after.status).toBe("COMPLETED");
        expect(after.retry_count).toBe(before.retry_count);
    });

    test("Stuck CLAIMED calls are always recovered", async () => {
        const call = await createOutboundCall({
            phone: "5555555555"
        });

        await sleep(2000);

        // Force stuck state using parameterized query (safe from SQL injection)
        await pool.query(
            `UPDATE calls
             SET status = 'CLAIMED',
                 claimed_at = NOW() - INTERVAL '5 minutes'
             WHERE id = $1`,
            [call.id]
        );

        await sleep(7000);

        await assertNoZombies();
    });

    test("Global invariants always hold", async () => {
        const { rows } = await pool.query(`
      SELECT *
      FROM calls
      WHERE retry_count > max_retries
    `);

        expect(rows.length).toBe(0);
    });

});
