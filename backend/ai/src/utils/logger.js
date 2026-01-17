import winston from "winston";
import { config } from "../config/env.js";

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});

export const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        timestamp(),
        config.env === "production" ? json() : combine(colorize(), logFormat)
    ),
    transports: [
        new winston.transports.Console(),
        // Add file transports here if needed for production
    ],
});
