chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_TEXT') {
        let text = '';

        // Strategy 1: User Selection (Try this first)
        const selection = window.getSelection().toString();
        if (selection && selection.length > 0) {
            text = selection;
        }

        // Strategy 2: Google Docs specific (Accessibility Iframe - Best for full text)
        if (!text || text.trim().length === 0) {
            const accessibilityDiv = document.querySelector('.docs-texteventtarget-iframe');
            if (accessibilityDiv) {
                // Try to get content from the iframe's body
                try {
                    const iframeDoc = accessibilityDiv.contentDocument || accessibilityDiv.contentWindow.document;
                    if (iframeDoc) {
                        text = iframeDoc.body.innerText;
                    }
                } catch (e) {
                    // Cross-origin restriction might block this, but usually same-origin in Docs
                    console.log('Could not access iframe content', e);
                }

                // Fallback: innerText of the div itself (sometimes works)
                if (!text) {
                    text = accessibilityDiv.innerText;
                }
            }
        }

        // Strategy 3: Kix Editor (Main content area) - Filter out sidebar
        if (!text || text.trim().length < 50) {
            const editor = document.querySelector('.kix-appview-editor');
            if (editor) {
                text = editor.innerText;
            }
        }

        // Strategy 4: Fallback to body but EXCLUDE sidebar
        if (!text || text.trim().length < 50) {
            const bodyClone = document.body.cloneNode(true);

            // Remove known UI elements from the clone
            const uiSelectors = [
                '.docs-navigation-sidebar', // Outline sidebar
                '.docs-ruler',
                '.docs-toolbar-wrapper',
                '.app-header',
                '#docs-header',
                '.docs-docos-activitybox' // Comments
            ];

            uiSelectors.forEach(sel => {
                const els = bodyClone.querySelectorAll(sel);
                els.forEach(el => el.remove());
            });

            text = bodyClone.innerText;
        }

        sendResponse({ text: text });
    }
});
