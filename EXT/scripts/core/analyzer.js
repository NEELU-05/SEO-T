const Analyzer = {
    process: async (text, targetDate) => {
        if (!text) return [];
        try {
            // 1. Extract Date Block
            const dateBlock = Parser.extractDateBlock(text, targetDate);
            if (!dateBlock) return [];

            // 2. Parse Submissions
            const submissions = Parser.parseSubmissions(dateBlock);

            // 3. Analyze each submission (Async Chunking)
            const results = [];
            const chunkSize = 5; // Process 5 submissions at a time to avoid UI freeze

            for (let i = 0; i < submissions.length; i += chunkSize) {
                const chunk = submissions.slice(i, i + chunkSize);

                // Process chunk
                const chunkResults = chunk.map(sub => {
                    const { keywords, cleanContent } = Parser.extractKeywords(sub.content);
                    const { highlightedHtml, keywordStats } = highlightContent(cleanContent, keywords);

                    return {
                        title: sub.title,
                        originalContent: sub.content,
                        keywords: keywords,
                        highlightedHtml: highlightedHtml,
                        keywordStats: keywordStats
                    };
                });

                results.push(...chunkResults);

                // Yield to main thread
                if (i + chunkSize < submissions.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            return results;
        } catch (e) {
            console.error("Error in Analyzer.process:", e);
            return [];
        }
    },

    findDates: (text) => Parser.findDates(text)
};

function highlightContent(text, keywords) {
    if (!keywords || keywords.length === 0) {
        return {
            highlightedHtml: Helpers.escapeHtml(text),
            keywordStats: []
        };
    }

    let processedText = Helpers.escapeHtml(text);
    const keywordStats = [];

    // Sort keywords by length (longest first)
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
            const regex = new RegExp(`\\b(${Helpers.escapeRegex(k)})\\b`, 'gi');
            processedText = processedText.replace(regex, (match) => {
                if (match.includes('<span')) return match;
                stats.correctMatches++;
                return `<span class="highlight-green">${match}</span>`;
            });
        } else {
            let pattern = '';
            tokens.forEach((token, index) => {
                if (index > 0) pattern += `(\\W+(?:\\w+\\W+){0,2}?)`;
                pattern += `(${Helpers.escapeRegex(token)})`;
            });

            const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
            processedText = processedText.replace(regex, (...args) => {
                const match = args[0];
                if (match.includes('<span')) return match;

                let isExact = true;
                for (let i = 2; i < args.length - 2; i += 2) {
                    if (/\w/.test(args[i])) {
                        isExact = false;
                        break;
                    }
                }

                if (isExact) stats.correctMatches++;
                else stats.incorrectMatches++;

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

if (typeof window !== 'undefined') window.Analyzer = Analyzer;
if (typeof module !== 'undefined') module.exports = Analyzer;
