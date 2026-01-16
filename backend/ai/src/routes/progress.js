// src/routes/process.js
import express from "express";
import { query } from "../db.js";
import { randomUUID } from "crypto";

const router = express.Router();

router.post("/", async (req, res) => {
    const { call_id, bot_type } = req.body;

    if (!call_id || !bot_type) {
        return res.status(400).json({ error: "call_id and bot_type required" });
    }

    const sessionId = randomUUID();

    await query(
        `INSERT INTO ai_sessions (id, call_id, bot_type)
     VALUES ($1, $2, $3)`,
        [sessionId, call_id, bot_type]
    );

    // 🚫 No AI logic yet
    res.json({
        intent: "UNKNOWN",
        outcome: "NO_ACTION"
    });
});

export default router;
