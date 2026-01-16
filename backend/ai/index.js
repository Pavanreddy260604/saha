// services/ai/index.js
import "dotenv/config";
import app from "./src/app.js";

const PORT = process.env.AI_PORT || 4000;

app.listen(PORT, () => {
    console.log(`🤖 AI service running on port ${PORT}`);
});
