import express from "express";
import { query } from "../db.js";

const router = express.Router();

/**
 * POST /webhooks/provider-event
 * Simulates provider callbacks (answered, completed, no_answer)
 */
router.post("/provider-event", async (req, res) => {
  try {
    const { call_id, event } = req.body;

    if (!call_id || !event) {
      return res.status(400).json({
        error: "call_id and event are required"
      });
    }

    // Fetch call
    const result = await query(
      `SELECT * FROM calls WHERE id = $1`,
      [call_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Call not found"
      });
    }

    const call = result.rows[0];

    // ❗ Terminal state protection
    if (call.status === "COMPLETED") {
      return res.status(400).json({
        error: "Call already completed"
      });
    }

    /**
     * EVENT HANDLING
     */

    // 1️⃣ ANSWERED → IN_PROGRESS
    if (event === "answered") {
      const updated = await query(
        `
        UPDATE calls
        SET status = 'IN_PROGRESS'
        WHERE id = $1
        RETURNING *
        `,
        [call_id]
      );

      return res.json({
        message: "Call answered",
        call: updated.rows[0]
      });
    }

    // 2️⃣ COMPLETED → FINAL STATE
    if (event === "completed") {
      const updated = await query(
        `
        UPDATE calls
        SET
          status = 'COMPLETED',
          outcome = 'completed'
        WHERE id = $1
        RETURNING *
        `,
        [call_id]
      );

      return res.json({
        message: "Call completed",
        call: updated.rows[0]
      });
    }

    // 3️⃣ NO ANSWER → RETRY LOGIC
    if (event === "no_answer") {
      // max_retries = 1 (Week 1 rule)
      if (call.retries < 1) {
        const updated = await query(
          `
          UPDATE calls
          SET
            retries = retries + 1,
            status = 'PENDING',
            next_action_at = NOW() + INTERVAL '5 minutes'
          WHERE id = $1
          RETURNING *
          `,
          [call_id]
        );

        return res.json({
          message: "No answer, call rescheduled",
          call: updated.rows[0]
        });
      }

      // Retry exhausted → stop forever
      const updated = await query(
        `
        UPDATE calls
        SET
          status = 'COMPLETED',
          outcome = 'no_answer'
        WHERE id = $1
        RETURNING *
        `,
        [call_id]
      );

      return res.json({
        message: "Retry exhausted, call stopped",
        call: updated.rows[0]
      });
    }

    return res.status(400).json({
      error: "Unknown event type"
    });

  } catch (err) {
    console.error("Provider event error:", err);
    res.status(500).json({
      error: "Provider event handling failed"
    });
  }
});

export default router;
