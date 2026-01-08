import express from "express";
import { query } from "../db.js";
import {resolveRules} from "../rules/resolveRules.js"

const router = express.Router();

/**
 * POST /api/calls
 * Create generic call (inbound / outbound)
 */
router.post("/", async (req, res) => {
  try {
    const { phone, direction , bot_type = "default" } = req.body;

    if (!phone || !direction) {
      return res.status(400).json({
        error: "phone and direction are required"
      });
    }
     const rules = resolveRules(bot_type);

    const result = await query(
      `
      INSERT INTO calls (
        phone,
        direction,
        bot_type,
        status,
        retry_count,
        max_retries,
        retry_delay_minutes,
        created_at,
        next_action_at
      )
      VALUES (
  $1,
  $2,
  $3,
  'PENDING',
  0,
  $4,
  $5,
  NOW(),
  NOW()
)

      RETURNING *
      `,
      [phone, direction,bot_type,rules.max_retries,rules.retry_delay_minutes]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/calls/:id/trigger
 * Manual execution trigger (atomic)
 */
router.post("/:id/trigger", async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await query(
      `
      UPDATE calls
      SET status = 'CLAIMED'
      WHERE id = $1
        AND status = 'PENDING'
      RETURNING *
      `,
      [id]
    );

    if (updated.rows.length === 0) {
      return res.status(400).json({
        error: "Call not triggerable"
      });
    }

    const { fakeDial } = await import("../services/fakeDialer.js");
    await fakeDial(id);

    res.json({ message: "Call triggered", call: updated.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Trigger failed" });
  }
});

/**
 * GET /api/calls
 * Fetch all calls
 */
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM calls ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calls" });
  }
});

/**
 * PATCH /api/calls/:id
 * Admin / dev override
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, outcome, next_action_at } = req.body;

    const existing = await query(
      `SELECT * FROM calls WHERE id = $1`,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: "Call not found" });
    }

    const call = existing.rows[0];

    // terminal protection
    if (["COMPLETED", "FAILED"].includes(call.status)) {
      return res.status(400).json({
        error: "Terminal calls cannot be modified"
      });
    }

    const result = await query(
      `
      UPDATE calls
      SET
        status = COALESCE($2, status),
        outcome = COALESCE($3, outcome),
        next_action_at = COALESCE($4, next_action_at)
      WHERE id = $1
      RETURNING *
      `,
      [id, status, outcome, next_action_at]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update call" });
  }
});

/**
 * POST /api/calls/outbound
 * Create delayed outbound call
 */
router.post("/outbound", async (req, res) => {
  try {
    const { phone, delay_minutes = 0, bot_type = "default" } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: "phone is required"
      });
    }

    // 🔥 APPLY RULES HERE
    const rules = resolveRules(bot_type);

    const result = await query(
      `
      INSERT INTO calls (
        phone,
        direction,
        bot_type,
        status,
        retry_count,
        max_retries,
        retry_delay_minutes,
        created_at,
        next_action_at
      )
      VALUES (
        $1,
        'outbound',
        $2,
        'PENDING',
        0,
        $3,
        $4,
        NOW(),
        NOW() + ($5 || ' minutes')::interval
      )
      RETURNING *
      `,
      [
        phone,
        bot_type,
        rules.max_retries,
        rules.retry_delay_minutes,
        delay_minutes
      ]
    );

    res.status(201).json({
      message: "Outbound call scheduled",
      call: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
