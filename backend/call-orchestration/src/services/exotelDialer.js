import axios from "axios";
import { query } from "../db.js";

export const dialViaExotel = async (call) => {
  const {
    EXOTEL_API_KEY,
    EXOTEL_API_TOKEN,
    EXOTEL_ACCOUNT_SID,
    EXOTEL_SUBDOMAIN,
    EXOTEL_CALLER_ID,
    EXOTEL_APP_ID
  } = process.env;

  if (
    !EXOTEL_API_KEY ||
    !EXOTEL_API_TOKEN ||
    !EXOTEL_ACCOUNT_SID ||
    !EXOTEL_CALLER_ID ||
    !EXOTEL_APP_ID
  ) {
    throw new Error("Exotel environment variables not configured");
  }

  // Build Exotel Voice Applet URL
  const appletUrl =
    `http://my.exotel.com/${EXOTEL_ACCOUNT_SID}/exoml/start_voice/${EXOTEL_APP_ID}`;

  // Exotel Calls API endpoint
  const url =
    `https://${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls/connect.json`;

  // IMPORTANT: Exotel expects form-urlencoded data
  const payload = new URLSearchParams({
    From: call.phone,              // CUSTOMER NUMBER
    CallerId: EXOTEL_CALLER_ID,    // YOUR EXOPHONE
    Url: appletUrl,
    CallType: "trans",
    TimeLimit: "600",
    TimeOut: "30"
  });

  let response;
  try {
    response = await axios.post(url, payload, {
      auth: {
        username: EXOTEL_API_KEY,     // API KEY
        password: EXOTEL_API_TOKEN   // API TOKEN
      },
      timeout: 15000
    });
  } catch (err) {
    // Provider call itself failed (network/auth/etc.)
    console.error("Exotel Error Details:", err.response?.data || err.message);
    throw new Error(`Exotel dial failed: ${err.message}`);
  }

  const providerCallId = response?.data?.Call?.Sid;
  if (!providerCallId) {
    throw new Error("Invalid Exotel response: missing CallSid");
  }

  // 🔒 Store provider reference ONLY
  await query(
    `
    UPDATE calls
    SET provider = 'exotel',
        provider_call_id = $2
    WHERE id = $1
    `,
    [call.id, providerCallId]
  );
};
