import { fakeDial } from "./fakeDialer.js";
import { dialViaExotel } from "./exotelDialer.js";

export const dial = async (call) => {
    // Default to 'fake' if provider is null/undefined to be safe, 
    // or strictly follow existing data. User said "DEFAULT 'fake'".
    const provider = call.provider || 'fake';

    switch (provider) {
        case "fake":
            return fakeDial(call.id);

        case "exotel":
            return dialViaExotel(call);

        case "twilio":
            throw new Error("Twilio not enabled yet");

        default:
            console.warn(`Unknown provider '${call.provider}', falling back to fake`);
            return fakeDial(call.id);
    }
};
