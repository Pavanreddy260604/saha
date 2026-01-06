import express from 'express';
import callsRouter from "./routes/calls.js";
import webhookRouter from "./routes/webhooks.js";
import providerEventsRouter from "./routes/providerEvents.js"
const app = express();
app.use(express.json());


app.use("/api/calls",callsRouter)
app.use("/webhooks",webhookRouter)
app.use("/webhooks", providerEventsRouter);
app.get("/health",(req, res)=>{
    res.json({status:"ok"});
});
export default app;