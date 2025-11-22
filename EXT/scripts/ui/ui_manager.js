const UIManager = {
    elements: {},

    init: (elements) => {
        UIManager.elements = elements;
    },

    displayResults: (results) => {
        const { resultsArea, resultsContent, totalKeywordsEl, passingKeywordsEl, warningKeywordsEl, failingKeywordsEl, exportCsvBtn } = UIManager.elements;

        resultsArea.classList.remove('hidden');
        resultsContent.innerHTML = '';

        let totalKeywords = 0;
        let passingKeywords = 0;
        let warningKeywords = 0;
        let failingKeywords = 0;

        results.forEach((sub) => {
            const div = document.createElement('div');
            div.className = 'submission-block';

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

                keywordTableHtml += `</tbody></table></div>`;
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

        if (totalKeywordsEl) totalKeywordsEl.textContent = totalKeywords;
        if (passingKeywordsEl) passingKeywordsEl.textContent = passingKeywords;
        if (warningKeywordsEl) warningKeywordsEl.textContent = warningKeywords;
        if (failingKeywordsEl) failingKeywordsEl.textContent = failingKeywords;

        // Enable Export Button
        if (exportCsvBtn) {
            exportCsvBtn.disabled = false;
        }
    },

    showError: (msg) => {
        const { resultsArea, resultsContent } = UIManager.elements;
        resultsArea.classList.remove('hidden');
        resultsContent.innerHTML = `<p class="fail">${msg}</p>`;
    },

    autoDetectDate: (text, analyzeCallback) => {
        const dates = Parser.findDates(text); // Use Parser directly
        const { dateInput, dateList, dateChips } = UIManager.elements;

        dateList.innerHTML = '';
        dateChips.innerHTML = '';

        if (dates.length > 0) {
            dates.forEach((date) => {
                const option = document.createElement('option');
                option.value = date;
                dateList.appendChild(option);

                const chip = document.createElement('div');
                chip.className = 'date-chip';
                chip.textContent = date;
                chip.addEventListener('click', () => {
                    dateInput.value = date;
                    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    if (analyzeCallback) analyzeCallback();
                });
                dateChips.appendChild(chip);
            });

            const today = new Date().toISOString().split('T')[0];
            if (!dateInput.value || dateInput.value === today) {
                dateInput.value = dates[0];
                if (dateChips.firstChild) dateChips.firstChild.classList.add('active');

                dateInput.style.borderColor = '#28a745';
                dateInput.style.boxShadow = '0 0 0 2px rgba(40, 167, 69, 0.2)';
                setTimeout(() => {
                    dateInput.style.borderColor = '';
                    dateInput.style.boxShadow = '';
                }, 1500);
            }
        }
    },

    // --- New Features ---

    checkFirstRun: () => {
        const { onboardingModal, closeOnboardingBtn } = UIManager.elements;
        const hasSeenOnboarding = localStorage.getItem('seoChecker_onboarding_v3');

        if (!hasSeenOnboarding && onboardingModal) {
            onboardingModal.classList.remove('hidden');

            closeOnboardingBtn.addEventListener('click', () => {
                onboardingModal.classList.add('hidden');
                localStorage.setItem('seoChecker_onboarding_v3', 'true');
            });

            // Also close on X click
            const closeX = onboardingModal.querySelector('.close-modal');
            if (closeX) {
                closeX.addEventListener('click', () => {
                    onboardingModal.classList.add('hidden');
                    localStorage.setItem('seoChecker_onboarding_v3', 'true');
                });
            }
        }
    },

    exportToCsv: (results, date) => {
        if (!results || results.length === 0) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Submission Title,Keyword,Correct Matches,Incorrect Matches,Total Matches,Status,Date\n";

        results.forEach(sub => {
            if (sub.keywordStats) {
                sub.keywordStats.forEach(stat => {
                    const row = [
                        `"${sub.title.replace(/"/g, '""')}"`, // Escape quotes
                        `"${stat.keyword.replace(/"/g, '""')}"`,
                        stat.correctMatches,
                        stat.incorrectMatches,
                        stat.totalMatches,
                        stat.status,
                        date
                    ].join(",");
                    csvContent += row + "\n";
                });
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `seo_report_${date.replace(/[^a-z0-9]/gi, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

if (typeof window !== 'undefined') window.UIManager = UIManager;
