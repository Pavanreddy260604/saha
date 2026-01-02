import { query } from "../db.js";

export const fakeDial = async (callId) => {
  console.log(`📞 Dialing call ${callId} (FAKE)`);

  await query(
    `
    UPDATE calls
    SET status = 'IN_PROGRESS'
    WHERE id = $1
      AND status = 'PENDING'
    `,
    [callId]
  );

  console.log(`✅ Call ${callId} marked IN_PROGRESS`);
};
