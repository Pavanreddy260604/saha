import WebSocket from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.argv[2] || 4000;
const WS_URL = `ws://localhost:${PORT}`;
const AUDIO_FILE = path.join(__dirname, "test.wav");

if (!fs.existsSync(AUDIO_FILE)) {
    console.error("❌ Please place a 'test.wav' file in this directory to run the test.");
    console.log("You can download a sample file from: https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav (convert to wav if needed)");
    process.exit(1);
}

const ws = new WebSocket(WS_URL);

ws.on("open", async () => {
    console.log("✅ Connected to WebSocket");

    const CHUNK_SIZE = 3200; // ~200ms of audio at 8000Hz Linear16
    const fileStream = fs.createReadStream(AUDIO_FILE, { start: 44, highWaterMark: CHUNK_SIZE });

    console.log("🎙️  Streaming audio...");

    for await (const chunk of fileStream) {
        ws.send(chunk);
        // CRITICAL: Wait 200ms to simulate real-time speaking. 
        // Without this, we flood Deepgram and it drops the connection.
        await new Promise(r => setTimeout(r, 200));
        process.stdout.write(".");
    }

    console.log("\n📤 Finished sending audio");
    setTimeout(() => ws.close(), 10000);
});

ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.type === "transcript") {
        const { text, isFinal } = msg.data;
        console.log(`${isFinal ? "🏁 [FINAL]" : "📝 [PARTIAL]"} ${text}`);
    }
});

ws.on("close", () => {
    console.log("❌ Disconnected");
});

ws.on("error", (err) => {
    console.error("⚠️ Error:", err);
});
