import { DeepgramService } from "./deepgram.js";
import { logger } from "../utils/logger.js";
import { WebSocket } from "ws";

export class SessionManager {
    constructor(ws) {
        this.ws = ws;
        this.id = Date.now().toString(36); // Simple ID, usage uuid in prod if needed
        this.deepgram = new DeepgramService();
        this.isReady = false;

        this._initialize();
    }

    _initialize() {
        logger.info(`Initializing session ${this.id}`);

        // Subscribe to Deepgram events
        this.deepgram.on("open", () => {
            this.isReady = true;
            this._sendToClient({ type: "status", status: "listening" });
        });

        this.deepgram.on("transcript", (data) => {
            logger.info(`Transcript [${this.id}]: ${data.isFinal ? "FINAL" : "PARTIAL"} - ${data.text}`);
            this._sendToClient({
                type: "transcript",
                data
            });
        });

        this.deepgram.on("error", (err) => {
            logger.error(`Deepgram error in session ${this.id}`, { error: err });
            this._sendToClient({ type: "error", message: "Transcription error" });
        });

        this.deepgram.on("close", () => {
            logger.info(`Deepgram session ${this.id} closed`);
            this.close();
        });

        // Start Deepgram
        try {
            this.deepgram.start();
        } catch (error) {
            logger.error(`Failed to start Deepgram for session ${this.id}`);
            this.close();
        }
    }

    handleAudio(data) {
        if (this.deepgram) {
            // DEBUG: Trace data flow
            // logger.debug(`Sending ${data.length} bytes to Deepgram`);
            this.deepgram.sendAudio(data);
        }
    }

    _sendToClient(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    close() {
        logger.info(`Closing session ${this.id}`);
        this.isReady = false;

        if (this.deepgram) {
            this.deepgram.removeAllListeners();
            this.deepgram.stop();
        }

        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
}
