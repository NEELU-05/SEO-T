# Engineering Documentation

## Technical Details

```javascript
function determineStatus(stats) {
    if (stats.totalMatches === 0) return 'NONE';
    if (stats.correctMatches > stats.incorrectMatches) return 'PASS';
    if (stats.correctMatches === stats.incorrectMatches) return 'WARNING';
    return 'FAIL';
}
```

The above function determines the status of each keyword based on the counts of correct and incorrect matches.

## Data Flow

```
1. User clicks "Analyze Doc"
   ↓
2. Text extracted (Google Docs or file)
   ↓
3. Analyzer.process(text, date)
   ↓
4. For each submission:
   - Extract keywords
   - highlightContent() → {highlightedHtml, keywordStats}
   ↓
5. popup.js displayResults()
   - Build keyword table HTML
   - Calculate summary totals
   - Update DOM
   ↓
6. User sees summary stats and detailed tables.
```

## Technical Changes (v3.0.0)

- **scripts/analyzer.js**: `highlightContent()` now returns `{highlightedHtml, keywordStats}` and tracks correct vs incorrect matches.
- **popup/popup.html**: Added summary statistics grid and space for keyword tables.
- **popup/popup.js**: Enhanced `displayResults()` to build tables, calculate summary, and color‑code rows.
- **popup/popup.css**: New `.summary-stats` grid, `.keyword-table` styling, status‑based row highlighting, increased popup width to 450px.
- **manifest.json**: Version bumped to 3.0.0.

These changes constitute the core engineering work for the keyword quality tracking feature.
