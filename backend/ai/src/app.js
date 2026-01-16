import express from "express";
import processRouter from "./routes/progress.js";

const app = express();

app.use(express.json());

app.use("/ai/process", processRouter);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

export default app;