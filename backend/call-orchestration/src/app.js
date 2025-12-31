import express from 'express';
import callsRouter from "./routes/calls.js";


const app = express();
app.use(express.json());
app.use("/api/calls",callsRouter)
app.get("/health",(req, res)=>{
    res.json({status:"ok"});
});
export default app;