import "dotenv/config";
import app from "./src/app.js";
import { createServer } from "http";
import { setupWebSocket } from "./src/websocket.js";

const PORT = process.env.AI_PORT || 4000;
const server = createServer(app);

// Initialize WebSocket
setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`🤖 AI service running on port ${PORT}`);
});

