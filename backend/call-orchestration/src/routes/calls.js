import express from "express";
import { query } from "../db.js";
import { resolveRules } from "../rules/resolveRules.js";

const router = express.Router();

/**
 * POST /api/calls
 * Create call (inbound / outbound)
 */
router.post("/", async (req, res) => {
  try {
    const { phone, direction, bot_type = "default" } = req.body;

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
        next_action_at,
        created_at
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
      [
        phone,
        direction,
        bot_type,
        rules.max_retries,
        rules.retry_delay_minutes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/calls/:id/trigger
 * ✅ Re-queue call for scheduler (DB-safe)
 */
router.post("/:id/trigger", async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await query(
      `
      UPDATE calls
      SET next_action_at = NOW()
      WHERE id = $1
        AND status = 'PENDING'
      RETURNING *
      `,
      [id]
    );

    if (!updated.rows.length) {
      return res.status(400).json({
        error: "Call not triggerable"
      });
    }

    res.json({
      message: "Call queued for execution",
      call: updated.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Trigger failed" });
  }
});

/**
 * GET /api/calls
 */
router.get("/", async (req, res) => {
  const result = await query(
    `SELECT * FROM calls ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

/**
 * PATCH /api/calls/:id
 * Admin override (DB-safe)
 */
router.patch("/:id", async (req, res) => {
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
});

/**
 * POST /api/calls/outbound
 * Delayed outbound call
 */
router.post("/outbound", async (req, res) => {
  const { phone, delay_minutes = 0, bot_type = "default" } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "phone is required" });
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
      next_action_at,
      created_at
    )
    VALUES (
      $1,
      'outbound',
      $2,
      'PENDING',
      0,
      $3,
      $4,
      NOW() + ($5 || ' minutes')::interval,
      NOW()
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
});

export default router;
