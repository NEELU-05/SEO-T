# Internal Algorithm Documentation

## Algorithm: Status Determination

```javascript
function determineStatus(stats) {
    if (stats.totalMatches === 0) return 'NONE';
    if (stats.correctMatches > stats.incorrectMatches) return 'PASS';
    if (stats.correctMatches === stats.incorrectMatches) return 'WARNING';
    return 'FAIL';
}
```

**Rationale**:
- **NONE**: No matches found for the keyword – indicates the keyword is missing and should be added.
- **PASS**: More correct (green) matches than incorrect (red) – the keyword is used naturally.
- **WARNING**: Equal correct and incorrect matches – borderline quality, review needed.
- **FAIL**: More incorrect than correct matches – potential keyword stuffing.

## Data Flow Overview

1. User clicks **"Analyze Doc"**.
2. Text is extracted from the Google Doc or uploaded file.
3. `Analyzer.process(text, date)` parses submissions.
4. For each submission:
   - Extract keywords.
   - `highlightContent()` returns `{ highlightedHtml, keywordStats }`.
   - `determineStatus()` is applied to each keyword's stats.
5. Results are passed to `popup.js` to build tables, calculate summary statistics, and update the DOM.

These steps illustrate how the algorithm integrates into the overall extension workflow.
