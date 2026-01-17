/**
 * Normalizes text for consistent processing.
 * @param {string} text 
 * @returns {string}
 */
export const normalize = (text) => {
    if (!text) return "";
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "); // Replace multiple spaces with single space
};
