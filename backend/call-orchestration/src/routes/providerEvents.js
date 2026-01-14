import express from "express";
import { query } from "../db.js";
import { applyRetryPolicy } from "../rules/utils/retryPolicy.js";

const router = express.Router();

/**
 * POST /provider-event
 * Exotel provider webhook
 */
router.post("/provider-event", async (req, res) => {
  try {
    const { provider, provider_call_id, event } = req.body;

    if (!provider || !provider_call_id || !event) {
      return res.status(400).json({
        error: "provider, provider_call_id and event are required"
      });
    }

    // 🔎 Find call via provider identity
    const result = await query(
      `
      SELECT *
      FROM calls
      WHERE provider = $1
        AND provider_call_id = $2
      `,
      [provider, provider_call_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Call not found" });
    }

    const call = result.rows[0];

    // 🔒 Terminal protection
    if (["COMPLETED", "FAILED"].includes(call.status)) {
      return res.json({ message: "Ignored terminal event" });
    }

    // 🔁 Normalize provider events → internal state

    switch (event) {
      case "answered":
        if (call.status !== "IN_PROGRESS") {
          await query(
            `
            UPDATE calls
            SET status = 'IN_PROGRESS'
            WHERE id = $1
            `,
            [call.id]
          );
        }
        break;

      case "completed":
        await query(
          `
          UPDATE calls
          SET status = 'COMPLETED',
              outcome = 'completed'
          WHERE id = $1
          `,
          [call.id]
        );
        break;

      case "no_answer":
        // 🛡 Apply centralized retry policy
        await applyRetryPolicy(call.id, 'no_answer');
        break;

      case "failed":
        await query(
          `
          UPDATE calls
          SET status = 'FAILED',
              outcome = 'provider_failed'
          WHERE id = $1
          `,
          [call.id]
        );
        break;

      default:
        return res.status(400).json({ error: "Unknown event type" });
    }

    res.json({ message: "Event processed" });

  } catch (err) {
    console.error("Provider event error:", err);
    res.status(500).json({ error: "Provider event handling failed" });
  }
});

export default router;
