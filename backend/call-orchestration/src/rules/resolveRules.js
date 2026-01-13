import { BOT_RULES } from "./botRules.js";
export const resolveRules = (botType) => {
    const rules = BOT_RULES[botType];

    if (!rules) {
        throw new Error(`no rules defined for botType: ${botType}`)
    }
    return rules;
};