import express from 'express';
import { query } from "../db.js";

const router = express.Router();

router.post("/inbound", async (req, res) => {
  try {
    const { from, event } = req.body;

    if (!from || !event) {
      return res.status(400).json({
        error: "from and event are required"
      });
    }

    if (event === "call.started") {
      const result = await query(
        `
        INSERT INTO calls (
          phone,
          direction,
          status,
          retries,
          created_at,
          next_action_at
        )
        VALUES ($1, 'inbound', 'IN_PROGRESS', 0, NOW(), NOW())
        RETURNING *
        `,
        [from]
      );

      return res.json({
        message: "Inbound call started",
        call: result.rows[0]
      });
    }

    if (event === "call.ended") {
      const result = await query(
        `
        UPDATE calls
        SET
          status = 'COMPLETED',
          outcome = 'inbound_completed'
        WHERE id = (
          SELECT id FROM calls
          WHERE phone = $1
            AND direction = 'inbound'
            AND status = 'IN_PROGRESS'
          ORDER BY created_at DESC
          LIMIT 1
        )
        RETURNING *
        `,
        [from]
      );

      return res.json({
        message: "Inbound call completed",
        call: result.rows[0] || null
      });
    }

    return res.status(400).json({
      error: "Unknown event type"
    });

  } catch (err) {
    console.error("Inbound webhook error:", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

export default router;
