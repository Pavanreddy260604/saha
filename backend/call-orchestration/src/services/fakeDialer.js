import { query } from "../db.js";

export const fakeDial = async (callId) => {
  console.log(`📞  Executing call ${callId} (FAKE)`);

  const result = await query(
    `
    UPDATE calls
    SET status = 'IN_PROGRESS'
    WHERE id = $1
      AND status = 'CLAIMED'
    `,
    [callId]
  );
  if (result.rowCount === 0) {
    console.log(`⏭ Call ${callId} not claimable for execution`);
    return;
  }


  console.log(`✅ Call ${callId} marked IN_PROGRESS`);
};
