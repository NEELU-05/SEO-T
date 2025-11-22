const StorageManager = {
    KEYS: {
        HISTORY: 'seo_checker_history',
        SETTINGS: 'seo_checker_settings'
    },

    DEFAULTS: {
        historyLimit: 20,
        showNotifications: true,
        theme: 'light'
    },

    // History Methods
    getHistory: () => {
        try {
            const history = localStorage.getItem(StorageManager.KEYS.HISTORY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('Error reading history:', e);
            return [];
        }
    },

    saveToHistory: (resultItem) => {
        try {
            const history = StorageManager.getHistory();
            const settings = StorageManager.getSettings();

            // Add new item to beginning
            history.unshift({
                id: Date.now(),
                date: new Date().toISOString(),
                ...resultItem
            });

            // Trim to limit
            if (history.length > settings.historyLimit) {
                history.length = settings.historyLimit;
            }

            localStorage.setItem(StorageManager.KEYS.HISTORY, JSON.stringify(history));
        } catch (e) {
            console.error('Error saving history:', e);
        }
    },

    clearHistory: () => {
        localStorage.removeItem(StorageManager.KEYS.HISTORY);
    },

    // Settings Methods
    getSettings: () => {
        try {
            const settings = localStorage.getItem(StorageManager.KEYS.SETTINGS);
            return settings ? { ...StorageManager.DEFAULTS, ...JSON.parse(settings) } : StorageManager.DEFAULTS;
        } catch (e) {
            return StorageManager.DEFAULTS;
        }
    },

    saveSettings: (newSettings) => {
        try {
            const current = StorageManager.getSettings();
            const updated = { ...current, ...newSettings };
            localStorage.setItem(StorageManager.KEYS.SETTINGS, JSON.stringify(updated));
            return updated;
        } catch (e) {
            console.error('Error saving settings:', e);
            return StorageManager.DEFAULTS;
        }
    }
};

if (typeof window !== 'undefined') window.StorageManager = StorageManager;
