const Analyzer = {
    process: (text, targetDate) => {
        if (!text) return [];

        // 1. Extract Date Block
        const dateBlock = extractDateBlock(text, targetDate);
        if (!dateBlock) return [];

        // 2. Parse Submissions
        const submissions = parseSubmissions(dateBlock);

        // 3. Analyze each submission
        return submissions.map(sub => {
            const { keywords, cleanContent } = extractKeywords(sub.content);
            const { highlightedHtml, keywordStats } = highlightContent(cleanContent, keywords);

            return {
                title: sub.title,
                originalContent: sub.content,
                keywords: keywords,
                highlightedHtml: highlightedHtml,
                keywordStats: keywordStats
            };
        });
    },

    findDates: (text) => {
        if (!text) return [];

        // Regex for common date formats:
        // 1. "Mon Nov 6" or "Nov 6"
        // 2. "2024-11-06"
        // 3. "11/06/2024"
        const patterns = [
            /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*[A-Z][a-z]{2}\s+\d{1,2}\b/gi, // Mon Nov 6
            /\b\d{4}-\d{2}-\d{2}\b/g, // 2024-11-06
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g // 11/06/2024
        ];

        let dates = [];
        patterns.forEach(regex => {
            const matches = text.match(regex);
            if (matches) {
                dates = dates.concat(matches);
            }
        });

        // Clean up and unique
        return [...new Set(dates.map(d => d.trim()))];
    }
};

function extractDateBlock(text, targetDate) {
    // Split into lines
    const lines = text.split(/\r?\n/);
    let startIndex = -1;
    let endIndex = lines.length;

    // Find start line (Case Insensitive)
    const lowerTargetDate = targetDate.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerTargetDate)) {
            startIndex = i;
            break;
        }
    }

    if (startIndex === -1) return null;

    // Find end line (next date or end of doc)
    const dateRegex = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Date:|20\d{2})/i;

    for (let i = startIndex + 1; i < lines.length; i++) {
        if (dateRegex.test(lines[i].trim())) {
            endIndex = i;
            break;
        }
    }

    return lines.slice(startIndex, endIndex).join('\n');
}

function parseSubmissions(block) {
    // Separator rules: "Something Submissions <number>"
    // Example: "Image Submissions 5"
    // We look for lines matching this pattern to start a new submission.

    const lines = block.split(/\r?\n/);
    const submissions = [];
    let currentSubmission = null;

    // Separator rules: "Something <number>" or "Something Submissions <number>"
    // We look for lines ending with a number to start a new submission.
    // Regex: Start of line, some text, space (or colon), number, optional space, end of line.
    const submissionHeaderRegex = /^(.+?)(?:\s+|:\s*)(\d+)\s*$/;

    // Exclude lines that look like dates (e.g. "Thu Nov 6 - 4 Submissions")
    // to prevent them from being treated as submission headers.
    const dateLineRegex = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Date:|20\d{2})/i;

    // Exclude UI elements like "Tab 1", "Page 1"
    const uiHeaderRegex = /^(?:Tab|Page)\s+\d+$/i;

    lines.forEach(line => {
        const cleanLine = line.trim();

        // Check for header only if line is not empty and NOT a date/UI line
        const isDateLine = dateLineRegex.test(cleanLine);
        const isUiLine = uiHeaderRegex.test(cleanLine);

        const match = (cleanLine && !isDateLine && !isUiLine) ? cleanLine.match(submissionHeaderRegex) : null;

        if (match) {
            // Start new submission
            if (currentSubmission) {
                submissions.push(currentSubmission);
            }
            currentSubmission = {
                title: line.trim(),
                content: ''
            };
        } else {
            if (currentSubmission) {
                currentSubmission.content += line + '\n';
            } else {
                // Content before the first submission header? 
                // Maybe part of the date header or intro. Ignore or add to a "General" block?
                // Plan says: "A submission starts when a line matches..."
                // So we ignore text before the first header.
            }
        }
    });

    if (currentSubmission) {
        submissions.push(currentSubmission);
    }

    return submissions;
}

function extractKeywords(content) {
    // Find line starting with "Keyword:"
    // Extract everything after colon.
    // Remove that line from content? Or keep it? 
    // Plan says "Extract keywords... Store it".
    // Usually we don't highlight the keyword definition line itself, but let's keep it in content for context.

    const lines = content.split(/\r?\n/);
    let keywords = [];

    lines.forEach(line => {
        const match = line.match(/^Keyword:\s*(.*)/i);
        if (match) {
            const kwStr = match[1];
            // Split by comma
            const kws = kwStr.split(',').map(k => k.trim()).filter(k => k);
            keywords = keywords.concat(kws);
        }
    });

    return {
        keywords,
        cleanContent: content // We analyze the whole content block
    };
}

function highlightContent(text, keywords) {
    if (!keywords || keywords.length === 0) {
        return {
            highlightedHtml: escapeHtml(text),
            keywordStats: []
        };
    }

    let processedText = escapeHtml(text);
    const keywordStats = [];

    // Sort keywords by length (longest first to avoid partial matches)
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    sortedKeywords.forEach(keyword => {
        const k = keyword.toLowerCase().trim();
        if (!k) return;

        const stats = {
            keyword: keyword,
            correctMatches: 0,
            incorrectMatches: 0,
            totalMatches: 0,
            status: 'NONE'
        };

        const tokens = k.split(/\s+/);

        if (tokens.length === 1) {
            // Single word - Exact match (Green)
            const regex = new RegExp(`\\b(${escapeRegex(k)})\\b`, 'gi');

            processedText = processedText.replace(regex, (match) => {
                if (match.includes('<span')) return match; // Already highlighted
                stats.correctMatches++;
                return `<span class="highlight-green">${match}</span>`;
            });
        } else {
            // Multi-word - Check for exact and gapped matches
            let pattern = '';
            tokens.forEach((token, index) => {
                if (index > 0) {
                    // Gap pattern: allows 0-2 words between tokens
                    pattern += `(\\W+(?:\\w+\\W+){0,2}?)`;
                }
                pattern += `(${escapeRegex(token)})`;
            });

            const regex = new RegExp(`\\b${pattern}\\b`, 'gi');

            processedText = processedText.replace(regex, (...args) => {
                const match = args[0];
                if (match.includes('<span')) return match; // Already highlighted

                // Check if match is exact or gapped
                let isExact = true;
                // Gaps are at indices 2, 4, 6... (every even index after 1)
                for (let i = 2; i < args.length - 2; i += 2) {
                    const gap = args[i];
                    // If gap contains word characters -> it's gapped
                    if (/\w/.test(gap)) {
                        isExact = false;
                        break;
                    }
                }

                if (isExact) {
                    stats.correctMatches++;
                } else {
                    stats.incorrectMatches++;
                }

                const className = isExact ? 'highlight-green' : 'highlight-red';
                return `<span class="${className}">${match}</span>`;
            });
        }

        stats.totalMatches = stats.correctMatches + stats.incorrectMatches;
        stats.status = determineStatus(stats);
        keywordStats.push(stats);
    });

    return {
        highlightedHtml: processedText,
        keywordStats: keywordStats
    };
}

function determineStatus(stats) {
    if (stats.totalMatches === 0) return 'NONE';
    if (stats.correctMatches > stats.incorrectMatches) return 'PASS';
    if (stats.correctMatches === stats.incorrectMatches) return 'WARNING';
    return 'FAIL';
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (typeof window !== 'undefined') {
    window.Analyzer = Analyzer;
}
if (typeof module !== 'undefined') {
    module.exports = Analyzer;
}
