const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message || "Assertion failed"}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// --- Tests ---

test("Parser.findDates should find dates", () => {
    const text = "Here is a date: Nov 6 and another 2024-11-07";
    const dates = Parser.findDates(text);
    assert(dates.includes("Nov 6"), "Should find 'Nov 6'");
    assert(dates.includes("2024-11-07"), "Should find '2024-11-07'");
});

test("Parser.extractKeywords should handle commas and semicolons", () => {
    const content = "Keyword: apple, banana; cherry  date";
    const result = Parser.extractKeywords(content);
    const kws = result.keywords;
    assert(kws.includes("apple"), "Should find 'apple'");
    assert(kws.includes("banana"), "Should find 'banana'");
    assert(kws.includes("cherry date"), "Should find 'cherry date' (normalized spaces)");
});

test("Analyzer.process should return empty array for empty text", () => {
    const results = Analyzer.process("", "Nov 6");
    assertEqual(results, [], "Should return empty array");
});

test("Helpers.escapeHtml should escape characters", () => {
    const html = "<div>Test</div>";
    const escaped = Helpers.escapeHtml(html);
    assertEqual(escaped, "&lt;div&gt;Test&lt;/div&gt;", "Should escape HTML");
});

// --- Runner ---

window.onload = () => {
    const resultsDiv = document.getElementById('results');
    let passed = 0;
    let failed = 0;

    tests.forEach(t => {
        const div = document.createElement('div');
        div.className = 'test-case';
        try {
            t.fn();
            div.innerHTML = `<span class="pass">✔ PASS</span>: ${t.name}`;
            passed++;
        } catch (e) {
            div.innerHTML = `<span class="fail">✘ FAIL</span>: ${t.name} - ${e.message}`;
            failed++;
            console.error(e);
        }
        resultsDiv.appendChild(div);
    });

    const summary = document.createElement('h3');
    summary.textContent = `Total: ${tests.length}, Passed: ${passed}, Failed: ${failed}`;
    resultsDiv.prepend(summary);
};
