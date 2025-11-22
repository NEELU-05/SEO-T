const Parser = {
    findDates: (text) => {
        if (!text) return [];
        try {
            const patterns = [
                /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*[A-Z][a-z]{2}\s+\d{1,2}\b/gi,
                /\b\d{4}-\d{2}-\d{2}\b/g,
                /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
            ];
            let dates = [];
            patterns.forEach(regex => {
                const matches = text.match(regex);
                if (matches) dates = dates.concat(matches);
            });
            return [...new Set(dates.map(d => d.trim()))];
        } catch (e) {
            console.error("Error finding dates:", e);
            return [];
        }
    },

    extractDateBlock: (text, targetDate) => {
        try {
            const lines = text.split(/\r?\n/);
            let startIndex = -1;
            let endIndex = lines.length;

            const lowerTargetDate = targetDate.toLowerCase();
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(lowerTargetDate)) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex === -1) return null;

            const dateRegex = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Date:|20\d{2})/i;
            for (let i = startIndex + 1; i < lines.length; i++) {
                if (dateRegex.test(lines[i].trim())) {
                    endIndex = i;
                    break;
                }
            }

            return lines.slice(startIndex, endIndex).join('\n');
        } catch (e) {
            console.error("Error extracting date block:", e);
            return null;
        }
    },

    parseSubmissions: (block) => {
        try {
            const lines = block.split(/\r?\n/);
            const submissions = [];
            let currentSubmission = null;

            const submissionHeaderRegex = /^(.+?)(?:\s+|:\s*)(\d+)\s*$/;
            const dateLineRegex = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Date:|20\d{2})/i;
            const uiHeaderRegex = /^(?:Tab|Page)\s+\d+$/i;

            lines.forEach(line => {
                const cleanLine = line.trim();
                const isDateLine = dateLineRegex.test(cleanLine);
                const isUiLine = uiHeaderRegex.test(cleanLine);
                const match = (cleanLine && !isDateLine && !isUiLine) ? cleanLine.match(submissionHeaderRegex) : null;

                if (match) {
                    if (currentSubmission) submissions.push(currentSubmission);
                    currentSubmission = { title: line.trim(), content: '' };
                } else {
                    if (currentSubmission) currentSubmission.content += line + '\n';
                }
            });

            if (currentSubmission) submissions.push(currentSubmission);
            return submissions;
        } catch (e) {
            console.error("Error parsing submissions:", e);
            return [];
        }
    },

    extractKeywords: (content) => {
        try {
            const lines = content.split(/\r?\n/);
            let keywords = [];

            lines.forEach(line => {
                const match = line.match(/^Keyword:\s*(.*)/i);
                if (match) {
                    const kwStr = match[1];
                    // IMPROVED: Split by comma or semicolon, normalize spaces
                    const kws = kwStr.split(/[,;]/)
                        .map(k => k.trim().replace(/\s+/g, ' '))
                        .filter(k => k);
                    keywords = keywords.concat(kws);
                }
            });

            return {
                keywords: [...new Set(keywords)],
                cleanContent: content
            };
        } catch (e) {
            console.error("Error extracting keywords:", e);
            return { keywords: [], cleanContent: content };
        }
    }
};

if (typeof window !== 'undefined') window.Parser = Parser;
if (typeof module !== 'undefined') module.exports = Parser;
