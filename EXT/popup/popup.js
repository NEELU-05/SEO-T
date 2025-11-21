// popup.js – main UI logic for SEO Keyword Checker extension

document.addEventListener('DOMContentLoaded', () => {
    const targetDateInput = document.getElementById('targetDate');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultsArea = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');

    // Set default date to today's date
    const today = new Date().toISOString().split('T')[0];
    targetDateInput.value = today;

    // Auto-detect Google Doc
    detectGoogleDocs();

    async function detectGoogleDocs() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('docs.google.com/document')) {
            const notice = document.createElement('div');
            notice.className = 'doc-notice';
            notice.innerHTML = `
                <span class="icon">📄</span>
                <span>Google Doc detected</span>
                <span class="status-dot"></span>
            `;
            document.querySelector('.container').insertBefore(notice, document.querySelector('.form-group'));
        }
    }

    // Auto-populate date on load if possible
    (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('docs.google.com/document')) {
            try {
                let response;
                try {
                    response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TEXT' });
                } catch (e) {
                    // Script not ready, try injecting
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scripts/content.js']
                    });
                    response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TEXT' });
                }

                if (response && response.text) {
                    autoDetectDate(response.text);
                }
            } catch (e) {
                console.log('Auto-date failed', e);
            }
        }
    })();

    function autoDetectDate(text) {
        const dates = Analyzer.findDates(text);
        const dateInput = document.getElementById('targetDate');
        const dateList = document.getElementById('dateOptions');
        const dateChips = document.getElementById('dateChips');

        // Clear existing options
        dateList.innerHTML = '';
        dateChips.innerHTML = '';

        if (dates.length > 0) {
            // Populate datalist and chips
            dates.forEach((date) => {
                // Datalist option
                const option = document.createElement('option');
                option.value = date;
                dateList.appendChild(option);

                // Chip
                const chip = document.createElement('div');
                chip.className = 'date-chip';
                chip.textContent = date;
                chip.addEventListener('click', () => {
                    dateInput.value = date;
                    // Highlight active chip
                    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    // Trigger analysis for selected date
                    analyzeBtn.click();
                });
                dateChips.appendChild(chip);
            });

            // Auto-select the first one if input is empty or default
            if (!dateInput.value || dateInput.value === today) {
                dateInput.value = dates[0];
                // Highlight first chip
                if (dateChips.firstChild) {
                    dateChips.firstChild.classList.add('active');
                }

                // Visual feedback
                dateInput.style.borderColor = '#28a745';
                dateInput.style.boxShadow = '0 0 0 2px rgba(40, 167, 69, 0.2)';
                setTimeout(() => {
                    dateInput.style.borderColor = '';
                    dateInput.style.boxShadow = '';
                }, 1500);
            }
        }
    }

    // Auto-detect dates when file is uploaded
    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            try {
                const text = await readFile(fileInput.files[0]);
                autoDetectDate(text);
            } catch (err) {
                console.error('Error reading file for date detection:', err);
            }
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        const targetDate = targetDateInput.value.trim();
        if (!targetDate) {
            showError('Please enter a target date.');
            return;
        }

        let textToAnalyze = '';

        // 1. Check File Input
        if (fileInput.files.length > 0) {
            try {
                textToAnalyze = await readFile(fileInput.files[0]);
            } catch (err) {
                showError('Error reading file: ' + err.message);
                return;
            }
        } else {
            // 2. Check Active Tab (Google Doc)
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                showError('No active tab found.');
                return;
            }

            try {
                // Try to send message
                let response;
                try {
                    response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TEXT' });
                } catch (msgErr) {
                    // If message fails, script might not be injected. Inject it now.
                    console.log('Content script not ready, injecting...', msgErr);
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scripts/content.js']
                    });
                    // Retry message
                    response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TEXT' });
                }

                if (response && response.text && response.text.trim().length > 0) {
                    textToAnalyze = response.text;
                    // Update date options again just in case
                    autoDetectDate(textToAnalyze);
                } else {
                    showError('No text found. Please try selecting all text (Ctrl+A) in the document first.');
                    return;
                }
            } catch (err) {
                console.error(err);
                showError('Could not read document. Please RELOAD the Google Docs tab and try again.');
                return;
            }
        }

        // 3. Process
        const results = Analyzer.process(textToAnalyze, targetDate);

        if (results.length === 0) {
            showError(`No submissions found for date: ${targetDate}`);
        } else {
            displayResults(results);
        }
    });

    function displayResults(results) {
        resultsArea.classList.remove('hidden');
        resultsContent.innerHTML = '';

        // Calculate summary statistics
        let totalKeywords = 0;
        let passingKeywords = 0;
        let warningKeywords = 0;
        let failingKeywords = 0;

        results.forEach((sub) => {
            const div = document.createElement('div');
            div.className = 'submission-block';

            // Build keyword statistics table
            let keywordTableHtml = '';
            if (sub.keywordStats && sub.keywordStats.length > 0) {
                keywordTableHtml = `
                    <div class="keyword-stats">
                        <h5>Keyword Analysis</h5>
                        <table class="keyword-table">
                            <thead>
                                <tr>
                                    <th>Keyword</th>
                                    <th>Correct</th>
                                    <th>Incorrect</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                sub.keywordStats.forEach(stat => {
                    totalKeywords++;
                    if (stat.status === 'PASS') passingKeywords++;
                    else if (stat.status === 'WARNING') warningKeywords++;
                    else if (stat.status === 'FAIL') failingKeywords++;

                    keywordTableHtml += `
                        <tr class="status-${stat.status.toLowerCase()}">
                            <td>${stat.keyword}</td>
                            <td class="correct">${stat.correctMatches}</td>
                            <td class="incorrect">${stat.incorrectMatches}</td>
                            <td>${stat.totalMatches}</td>
                            <td><span class="badge badge-${stat.status.toLowerCase()}">${stat.status}</span></td>
                        </tr>
                    `;
                });

                keywordTableHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            div.innerHTML = `
                <h4>${sub.title}</h4>
                ${keywordTableHtml}
                <div class="preview-box">
                    ${sub.highlightedHtml}
                </div>
            `;

            resultsContent.appendChild(div);
        });

        // Update summary statistics
        document.getElementById('totalKeywords').textContent = totalKeywords;
        document.getElementById('passingKeywords').textContent = passingKeywords;
        document.getElementById('warningKeywords').textContent = warningKeywords;
        document.getElementById('failingKeywords').textContent = failingKeywords;
    }

    function showError(msg) {
        resultsArea.classList.remove('hidden');
        resultsContent.innerHTML = `<p class="fail">${msg}</p>`;
    }

    async function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            if (file.name.endsWith('.docx')) {
                reader.onload = function (event) {
                    const arrayBuffer = event.target.result;
                    if (window.mammoth) {
                        window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                            .then(result => resolve(result.value))
                            .catch(err => reject(err));
                    } else {
                        reject(new Error('Mammoth library not loaded for .docx'));
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = function (event) {
                    resolve(event.target.result);
                };
                reader.readAsText(file);
            }
        });
    }
});
