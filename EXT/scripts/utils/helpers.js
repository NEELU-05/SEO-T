const Helpers = {
    escapeHtml: (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    escapeRegex: (string) => {
        if (!string) return '';
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

if (typeof window !== 'undefined') window.Helpers = Helpers;
if (typeof module !== 'undefined') module.exports = Helpers;
