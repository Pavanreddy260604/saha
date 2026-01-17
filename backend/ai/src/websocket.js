import { WebSocketServer } from "ws";
import { logger } from "./utils/logger.js";
import { SessionManager } from "./services/sessionManager.js";

/**
 * Initializes WebSocket server for handling audio streams.
 * @param {import("http").Server} server 
 */
export const setupWebSocket = (server) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
        logger.info(`Incoming WebSocket connection from ${req.socket.remoteAddress}`);

        ws.isAlive = true;
        ws.on("pong", () => { ws.isAlive = true; });

        const session = new SessionManager(ws);

        ws.on("message", (data) => {
            try {
                // If message is binary, assume audio chunk
                if (Buffer.isBuffer(data)) {
                    session.handleAudio(data);
                } else {
                    // Handle control messages if any
                    logger.debug("Received non-binary message", { msg: data.toString() });
                }
            } catch (err) {
                logger.error("Error processing message", { error: err.message });
            }
        });

        ws.on("close", (code, reason) => {
            logger.info(`WebSocket closed`, { code, reason: reason.toString() });
            session.close();
        });

        ws.on("error", (err) => {
            logger.error("WebSocket transport error", { error: err.message });
            session.close();
        });
    });

    // Heartbeat interval to detect broken connections
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });

    logger.info("WebSocket server initialized");
    return wss;
};
