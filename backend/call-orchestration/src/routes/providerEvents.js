import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.post("/provider-event", async (req, res) => {
  try {
    const { call_id, event } = req.body;

    if (!call_id || !event) {
      return res.status(400).json({ error: "call_id and event are required" });
    }

    const result = await query(
      `SELECT * FROM calls WHERE id = $1`,
      [call_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Call not found" });
    }

    const call = result.rows[0];

    // ✅ Full terminal protection
    if (["COMPLETED", "FAILED"].includes(call.status)) {
      return res.status(400).json({ error: "Call is in terminal state" });
    }

    // ANSWERED → IN_PROGRESS
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
      return res.json(updated.rows[0]);
    }

    // COMPLETED → SUCCESS
    if (event === "completed") {
      const updated = await query(
        `
        UPDATE calls
        SET status = 'COMPLETED',
            outcome = 'completed'
        WHERE id = $1
        RETURNING *
        `,
        [call_id]
      );
      return res.json(updated.rows[0]);
    }

    // NO ANSWER → RETRY / FAIL
    if (event === "no_answer") {
      if (call.retry_count < call.max_retries) {
        const updated = await query(
          `
          UPDATE calls
          SET retry_count = retry_count + 1,
              status = 'PENDING',
              next_action_at = NOW()
                + (retry_delay_minutes || ' minutes')::interval
          WHERE id = $1
          RETURNING *
          `,
          [call_id]
        );

        return res.json({
          message: "No answer, retry scheduled",
          call: updated.rows[0]
        });
      }

      // ✅ Retry exhausted → FAILED
      const failed = await query(
        `
        UPDATE calls
        SET status = 'FAILED',
            outcome = 'retry_exhausted'
        WHERE id = $1
        RETURNING *
        `,
        [call_id]
      );

      return res.json({
        message: "Retry exhausted, call failed",
        call: failed.rows[0]
      });
    }

    return res.status(400).json({ error: "Unknown event type" });

  } catch (err) {
    console.error("Provider event error:", err);
    res.status(500).json({ error: "Provider event handling failed" });
  }
});

export default router;
