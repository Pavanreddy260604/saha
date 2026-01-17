import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_FILE = path.join(__dirname, "test.wav");

ffmpeg.setFfprobePath(ffprobe.path);

ffmpeg.ffprobe(AUDIO_FILE, (err, metadata) => {
    if (err) {
        console.error("Error reading file:", err);
    } else {
        console.log("Audio Metadata:", JSON.stringify(metadata.streams[0], null, 2));
    }
});
