import express from "express";
import { query } from "../db.js";

const router = express.Router();

/**
 * POST /api/calls
 * Create orchestration record
 */
router.post("/", async (req, res) => {
  try {
    const { phone, direction } = req.body;

    if (!phone || !direction) {
      return res.status(400).json({
        error: "phone and direction are required"
      });
    }

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
      VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())
      RETURNING *
      `,
      [phone, direction]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create call" });
  }
});

/**
 * GET /api/calls
 * Fetch all orchestration records
 */
router.get("/", async (_req, res) => {
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
 * Mutate orchestration state
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, outcome, next_action_at } = req.body;

    const existing = await query(
      `SELECT * FROM calls WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Call not found" });
    }

    const call = existing.rows[0];

    // ❗ Final state protection
    if (call.status === "COMPLETED") {
      return res.status(400).json({
        error: "Completed calls cannot be modified"
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
    res.status(500).json({ error: "Failed to update call" });
  }
});

export default router;
