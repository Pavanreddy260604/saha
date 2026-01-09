import express from "express";
import { query } from "../db.js";

const router = express.Router();

/**
 * POST /inbound
 * Exotel inbound webhook
 */
router.post("/inbound", async (req, res) => {
  try {
    const {
      CallSid,          // Exotel call SID
      From,             // Caller number
      CallStatus        // initiated | answered | completed
    } = req.body;

    if (!CallSid || !From || !CallStatus) {
      return res.status(400).json({
        error: "CallSid, From and CallStatus are required"
      });
    }

    // Normalize statuses
    if (CallStatus === "initiated") {
      // Idempotent insert
      const existing = await query(
        `
        SELECT id
        FROM calls
        WHERE provider = 'exotel'
          AND provider_call_id = $1
        `,
        [CallSid]
      );

      if (existing.rows.length) {
        return res.json({ message: "Inbound call already recorded" });
      }

      const result = await query(
        `
        INSERT INTO calls (
          phone,
          direction,
          status,
          retry_count,
          provider,
          provider_call_id,
          created_at,
          next_action_at
        )
        VALUES (
          $1,
          'inbound',
          'PENDING',
          0,
          'exotel',
          $2,
          NOW(),
          NOW()
        )
        RETURNING *
        `,
        [From, CallSid]
      );

      return res.json({
        message: "Inbound call initiated",
        call: result.rows[0]
      });
    }

    if (CallStatus === "answered") {
      await query(
        `
        UPDATE calls
        SET status = 'IN_PROGRESS'
        WHERE provider = 'exotel'
          AND provider_call_id = $1
        `,
        [CallSid]
      );

      return res.json({ message: "Inbound call answered" });
    }

    if (CallStatus === "completed") {
      await query(
        `
        UPDATE calls
        SET status = 'COMPLETED',
            outcome = 'inbound_completed'
        WHERE provider = 'exotel'
          AND provider_call_id = $1
        `,
        [CallSid]
      );

      return res.json({ message: "Inbound call completed" });
    }

    return res.status(400).json({ error: "Unhandled CallStatus" });

  } catch (err) {
    console.error("Inbound webhook error:", err);
    res.status(500).json({ error: "Inbound webhook handling failed" });
  }
});

export default router;
