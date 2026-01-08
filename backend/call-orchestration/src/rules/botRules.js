export const BOT_RULES = {
    default:{
        max_retries:1,
        retry_delay_minutes:5
    },
    reminder:{
        max_retries:1,
        retry_delay_minutes:10
    },
    payment:{
        max_retries:3,
        retry_delay_minutes:15
    }
};