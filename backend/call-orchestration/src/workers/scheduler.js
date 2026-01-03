import {query} from "../db.js";
const SCHEDULER_INTERVAL_MS = 5000;

const runScheduler = async () =>{
    try{
        console.log("Scheduler trick.....")
        const result = await query(
            `SELECT id,phone
            FROM calls
            WHERE status = 'PENDING'
            AND next_action_at <= NOW()
            LIMIT 5`
        );
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
};
export const startScheduler = () =>{
    setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
}