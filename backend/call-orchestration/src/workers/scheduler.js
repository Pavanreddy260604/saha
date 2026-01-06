import {query} from "../db.js";
const SCHEDULER_INTERVAL_MS = 5000;
let isRunning = false;

const runScheduler = async () =>{
    if(isRunning){
         console.log("⏭ Scheduler skipped (already running)");
         return;
    }
    isRunning= true;
    console.log("Scheduler tick Started.....")
    try{
        const result = await query(
            `SELECT id,phone
            FROM calls
            WHERE status = 'PENDING'
            AND next_action_at <= NOW()
        ORDER BY next_action_at,created_at
            LIMIT 5`
        );
        if(result.rows.length ===0){
            console.log("No pending calls to process");
          
        }
        for (const call of result.rows){
            const updated = await query(
                `UPDATE calls
                SET status = 'IN_PROGRESS'
                WHERE id = $1
                AND status = 'PENDING'
                RETURNING *`,
                [call.id]
            );
             if (updated.rows.length > 0) {
                console.log("📞 Triggering outbound call:", call.phone);
        }
    }}catch(err){
        console.error("Error in scheduler:", err);
    }
    finally {
    isRunning = false;
    console.log("✅ Scheduler tick finished");
  }
};
export const startScheduler = () =>{
    setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
}