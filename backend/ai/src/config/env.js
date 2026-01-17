import Joi from "joi";

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
    AI_PORT: Joi.number().default(4000),
    DEEPGRAM_API_KEY: Joi.string().required().description("API Key for Deepgram STT"),
    DEEPGRAM_MODEL: Joi.string().default("nova-2"),
    DEEPGRAM_LANGUAGE: Joi.string().default("en-US"),
    LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default("info"),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
    env: envVars.NODE_ENV,
    port: envVars.AI_PORT,
    logLevel: envVars.LOG_LEVEL,
    deepgram: {
        apiKey: envVars.DEEPGRAM_API_KEY,
        model: envVars.DEEPGRAM_MODEL,
        language: envVars.DEEPGRAM_LANGUAGE,
    },
};
