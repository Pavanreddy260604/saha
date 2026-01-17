import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import EventEmitter from "events";
import { normalize } from "../utils/text.js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class DeepgramService extends EventEmitter {
    constructor() {
        super();
        this.client = createClient(config.deepgram.apiKey);
        this.connection = null;
        this.keepAliveInterval = null;
    }

    /**
     * Start a live transcription session
     */
    start() {
        try {
            this.connection = this.client.listen.live({
                model: config.deepgram.model,
                language: config.deepgram.language,
                smart_format: true,
                interim_results: true,
                utterance_end_ms: 1000,
                vad_events: true,
                encoding: "linear16",
                sample_rate: 8000,
            });

            this._setupEventHandlers();

            // Start KeepAlive mechanism to prevent timeouts during long silences
            this.keepAliveInterval = setInterval(() => {
                if (this.connection && this.connection.getReadyState() === 1) {
                    this.connection.keepAlive();
                }
            }, 5000);

            logger.info("Deepgram session initialization started");
            return this.connection;

        } catch (error) {
            logger.error("Failed to initialize Deepgram session", { error: error.message });
            this.emit("error", error);
            throw error;
        }
    }

    _setupEventHandlers() {
        this.connection.on(LiveTranscriptionEvents.Open, () => {
            logger.info("Deepgram Live Connection Opened");
            this.emit("open");
        });

        this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
            logger.info("Deepgram Metadata received", { request_id: data.request_id });
        });

        this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
            logger.info("Deepgram Speech Started");
        });

        this.connection.on(LiveTranscriptionEvents.Warning, (warning) => {
            logger.warn("Deepgram Warning", { warning });
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
            logger.info("Deepgram Live Connection Closed");
            this._cleanup();
            this.emit("close");
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
            const alternative = data.channel?.alternatives?.[0];
            if (!alternative) return;

            const text = alternative.transcript;

            // Log empty transcripts only at debug level
            if (!text && data.is_final) {
                logger.debug("Received empty final transcript");
            }

            if (!text) return;

            const isFinal = data.is_final;
            const normalizedText = normalize(text);

            if (normalizedText) {
                this.emit("transcript", {
                    text: normalizedText,
                    original: text,
                    isFinal,
                    confidence: alternative.confidence
                });
            }
        });

        this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
            logger.debug("Deepgram UtteranceEnd detected");
            this.emit("utteranceEnd");
        });

        this.connection.on(LiveTranscriptionEvents.Error, (err) => {
            logger.error("Deepgram Live Error", { error: err });
            this.emit("error", err);
        });
    }

    /**
     * Send audio data to Deepgram
     * @param {Buffer} data 
     */
    sendAudio(data) {
        if (this.connection && this.connection.getReadyState() === 1) {
            this.connection.send(data);
        }
    }

    _cleanup() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        this.connection = null;
    }

    /**
     * Stop the transcription session
     */
    stop() {
        if (this.connection) {
            logger.info("Stopping Deepgram session...");
            this.connection.finish(); // Graceful close
            this._cleanup();
        }
    }
}
