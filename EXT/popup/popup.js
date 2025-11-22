// popup.js – main UI logic for SEO Keyword Checker extension

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Manager
    const elements = {
        targetDateInput: document.getElementById('targetDate'),
        fileInput: document.getElementById('fileInput'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        resultsArea: document.getElementById('results'),
        resultsContent: document.getElementById('resultsContent'),
        dateInput: document.getElementById('targetDate'),
        dateList: document.getElementById('dateOptions'),
        dateChips: document.getElementById('dateChips'),
        totalKeywordsEl: document.getElementById('totalKeywords'),
        passingKeywordsEl: document.getElementById('passingKeywords'),
        warningKeywordsEl: document.getElementById('warningKeywords'),
        failingKeywordsEl: document.getElementById('failingKeywords'),
        onboardingModal: document.getElementById('onboardingModal'),
        closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
        // Tabs
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        // History
        historyList: document.getElementById('historyList'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        // Settings
        historyLimitInput: document.getElementById('historyLimitInput'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        settingsMsg: document.getElementById('settingsMsg')
    };

    UIManager.init(elements);
    UIManager.checkFirstRun();
    initTabs();
    loadSettings();
    loadHistory();

    let lastResults = [];

    // Set default date to today's date
    const today = new Date().toISOString().split('T')[0];
    elements.targetDateInput.value = today;

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
            // Insert before the tabs
            document.querySelector('.container').insertBefore(notice, document.querySelector('.tabs'));
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
                    UIManager.autoDetectDate(response.text, () => elements.analyzeBtn.click());
                }
            } catch (e) {
                console.log('Auto-date failed', e);
            }
        }
    })();

    // Auto-detect dates when file is uploaded
    elements.fileInput.addEventListener('change', async () => {
        if (elements.fileInput.files.length > 0) {
            try {
                const text = await FileHandler.readFile(elements.fileInput.files[0]);
                UIManager.autoDetectDate(text, () => elements.analyzeBtn.click());
            } catch (err) {
                console.error('Error reading file for date detection:', err);
                UIManager.showError('Error reading file: ' + err.message);
            }
        }
    });

    elements.analyzeBtn.addEventListener('click', async () => {
        const targetDate = elements.targetDateInput.value.trim();
        if (!targetDate) {
            UIManager.showError('Please enter a target date.');
            return;
        }

        let textToAnalyze = '';

        // 1. Check File Input
        if (elements.fileInput.files.length > 0) {
            try {
                textToAnalyze = await FileHandler.readFile(elements.fileInput.files[0]);
            } catch (err) {
                UIManager.showError('Error reading file: ' + err.message);
                return;
            }
        } else {
            // 2. Check Active Tab (Google Doc)
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                UIManager.showError('No active tab found.');
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
                    UIManager.autoDetectDate(textToAnalyze);
                } else {
                    UIManager.showError('No text found. Please try selecting all text (Ctrl+A) in the document first.');
                    return;
                }
            } catch (err) {
                console.error(err);
                UIManager.showError('Could not read document. Please RELOAD the Google Docs tab and try again.');
                return;
            }
        }

        // 3. Process
        try {
            // Show loading state?
            elements.analyzeBtn.textContent = 'Analyzing...';
            elements.analyzeBtn.disabled = true;

            const results = await Analyzer.process(textToAnalyze, targetDate);
            lastResults = results; // Store for export

            elements.analyzeBtn.textContent = 'Analyze Doc';
            elements.analyzeBtn.disabled = false;

            if (results.length === 0) {
                UIManager.showError(`No submissions found for date: ${targetDate}`);
            } else {
                UIManager.displayResults(results);

                // Save to History
                const summary = {
                    total: results.length, // Submissions
                    keywords: results.reduce((acc, sub) => acc + (sub.keywordStats ? sub.keywordStats.length : 0), 0)
                };
                StorageManager.saveToHistory({
                    targetDate,
                    summary: `${summary.total} submissions, ${summary.keywords} keywords`
                });
                loadHistory(); // Refresh history tab
            }
        } catch (e) {
            elements.analyzeBtn.textContent = 'Analyze Doc';
            elements.analyzeBtn.disabled = false;
            UIManager.showError('Analysis failed: ' + e.message);
        }
    });

    // CSV Export
    elements.exportCsvBtn.addEventListener('click', () => {
        const targetDate = elements.targetDateInput.value.trim() || 'report';
        UIManager.exportToCsv(lastResults, targetDate);
    });

    // --- Tab Logic ---
    function initTabs() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate all
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));

                // Activate clicked
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    // --- History Logic ---
    function loadHistory() {
        const history = StorageManager.getHistory();
        elements.historyList.innerHTML = '';

        if (history.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-state">No history yet.</p>';
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-date">${new Date(item.date).toLocaleString()}</div>
                <div class="history-summary">Target: ${item.targetDate}</div>
                <div class="history-details">${item.summary}</div>
            `;
            // Clicking history item could reload it? 
            // For now, just a record.
            elements.historyList.appendChild(div);
        });
    }

    elements.clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history?')) {
            StorageManager.clearHistory();
            loadHistory();
        }
    });

    // --- Settings Logic ---
    function loadSettings() {
        const settings = StorageManager.getSettings();
        elements.historyLimitInput.value = settings.historyLimit;
    }

    elements.saveSettingsBtn.addEventListener('click', () => {
        const limit = parseInt(elements.historyLimitInput.value, 10);
        if (limit > 0) {
            StorageManager.saveSettings({ historyLimit: limit });
            elements.settingsMsg.textContent = 'Settings saved!';
            elements.settingsMsg.style.color = 'green';
            setTimeout(() => elements.settingsMsg.textContent = '', 2000);
        }
    });
});
