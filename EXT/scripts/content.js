chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_TEXT') {
        let text = '';

        // Strategy 1: User Selection
        const selection = window.getSelection().toString();
        if (selection && selection.trim().length > 0) {
            text = selection;
        }

        // Strategy 2: Accessibility Iframe/Div
        if (!text) {
            const accessibilityDiv = document.getElementById('docs-accessibility-iframe');
            if (accessibilityDiv) {
                try {
                    const iframeDoc = accessibilityDiv.contentDocument || accessibilityDiv.contentWindow.document;
                    if (iframeDoc) {
                        text = iframeDoc.body.innerText;
                    }
                } catch (e) {
                    console.log('Could not access iframe content', e);
                }
            }
        }

        // Strategy 3: Kix Editor (Main content area)
        if (!text || text.trim().length < 50) {
            const editor = document.querySelector('.kix-appview-editor');
            if (editor) {
                text = editor.innerText;
            }
        }

        // Strategy 4: Fallback to body but EXCLUDE sidebar
        if (!text || text.trim().length < 50) {
            const bodyClone = document.body.cloneNode(true);
            const uiSelectors = [
                '.docs-navigation-sidebar',
                '.docs-ruler',
                '.docs-toolbar-wrapper',
                '.app-header',
                '#docs-header',
                '.docs-docos-activitybox'
            ];
            uiSelectors.forEach(sel => {
                const els = bodyClone.querySelectorAll(sel);
                els.forEach(el => el.remove());
            });
            text = bodyClone.innerText;
        }

        sendResponse({ text: text });
    }
    return true; // Keep channel open
});
