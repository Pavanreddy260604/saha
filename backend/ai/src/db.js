// src/db.js
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.AI_DATABASE_URL
});

export const query = (text, params) => pool.query(text, params);
