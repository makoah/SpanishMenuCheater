/**
 * Settings Manager - OCR Settings Interface Controller
 * Manages the UI interactions for OCR settings modal
 */

class SettingsManager {
    constructor() {
        this.modal = null;
        this.usageTracker = null;
        this.googleVisionOCR = null;
        
        // DOM elements
        this.elements = {};
        
        // State
        this.isApiKeyValid = false;
        this.isTestingApiKey = false;
        
        // Event listeners
        this.eventListeners = [];
    }

    /**
     * Initialize settings manager
     * @param {Object} dependencies - Required dependencies
     */
    async initialize(dependencies = {}) {
        try {
            this.usageTracker = dependencies.usageTracker;
            this.googleVisionOCR = dependencies.googleVisionOCR;
            
            this.initializeElements();
            this.attachEventListeners();
            await this.loadSettings();
            await this.updateUsageDisplay();
            
            console.log('⚙️ Settings manager initialized');
            
        } catch (error) {
            console.error('Failed to initialize settings manager:', error);
            throw new Error(`Settings manager initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.modal = document.getElementById('ocr-settings-modal');
        
        this.elements = {
            // Modal controls
            settingsBtn: document.getElementById('settings-btn'),
            closeBtn: document.getElementById('settings-close'),
            saveBtn: document.getElementById('settings-save'),
            
            // API key section
            apiKeyInput: document.getElementById('google-vision-api-key'),
            toggleVisibilityBtn: document.getElementById('toggle-api-key-visibility'),
            testApiKeyBtn: document.getElementById('test-api-key'),
            clearApiKeyBtn: document.getElementById('clear-api-key'),
            apiKeyStatus: document.getElementById('api-key-status'),
            
            // Usage tracking section
            usagePercentage: document.getElementById('usage-percentage'),
            usageProgress: document.getElementById('usage-progress'),
            usageCurrent: document.getElementById('usage-current'),
            usageLimit: document.getElementById('usage-limit'),
            usageCost: document.getElementById('usage-cost'),
            monthlyLimitInput: document.getElementById('monthly-limit'),
            limitCost: document.getElementById('limit-cost'),
            
            // Processing options
            enableNotifications: document.getElementById('enable-notifications'),
            autoFallback: document.getElementById('auto-fallback'),
            showProcessingSource: document.getElementById('show-processing-source'),
            
            // Statistics
            statSuccessRate: document.getElementById('stat-success-rate'),
            statAvgTime: document.getElementById('stat-avg-time'),
            statTotalProcessed: document.getElementById('stat-total-processed'),
            statDaysRemaining: document.getElementById('stat-days-remaining'),
            resetUsageBtn: document.getElementById('reset-usage-btn'),
            exportStatsBtn: document.getElementById('export-stats-btn')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Modal controls
        this.addEventListenerWithCleanup(this.elements.settingsBtn, 'click', () => this.openModal());
        this.addEventListenerWithCleanup(this.elements.closeBtn, 'click', () => this.closeModal());
        this.addEventListenerWithCleanup(this.elements.saveBtn, 'click', () => this.saveSettings());
        
        // Close modal when clicking overlay
        this.addEventListenerWithCleanup(this.modal, 'click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // API key controls
        this.addEventListenerWithCleanup(this.elements.apiKeyInput, 'input', () => this.onApiKeyChange());
        this.addEventListenerWithCleanup(this.elements.apiKeyInput, 'paste', () => {
            setTimeout(() => this.onApiKeyChange(), 10);
        });
        this.addEventListenerWithCleanup(this.elements.toggleVisibilityBtn, 'click', () => this.toggleApiKeyVisibility());
        this.addEventListenerWithCleanup(this.elements.testApiKeyBtn, 'click', () => this.testApiKey());
        this.addEventListenerWithCleanup(this.elements.clearApiKeyBtn, 'click', () => this.clearApiKey());
        
        // Usage limit controls
        this.addEventListenerWithCleanup(this.elements.monthlyLimitInput, 'input', () => this.updateLimitCost());
        
        // Statistics controls
        this.addEventListenerWithCleanup(this.elements.resetUsageBtn, 'click', () => this.resetUsageData());
        this.addEventListenerWithCleanup(this.elements.exportStatsBtn, 'click', () => this.exportStatistics());
        
        // Keyboard shortcuts
        this.addEventListenerWithCleanup(document, 'keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListenerWithCleanup(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Open settings modal
     */
    async openModal() {
        try {
            await this.loadSettings();
            await this.updateUsageDisplay();
            this.modal.classList.remove('hidden');
            
            // Focus API key input if empty
            if (!this.elements.apiKeyInput.value) {
                setTimeout(() => this.elements.apiKeyInput.focus(), 100);
            }
            
        } catch (error) {
            console.error('Failed to open settings modal:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    /**
     * Close settings modal
     */
    closeModal() {
        this.modal.classList.add('hidden');
        this.clearApiKeyStatus();
    }

    /**
     * Load current settings into UI
     */
    async loadSettings() {
        try {
            // Load API key from localStorage
            const apiKey = this.getStoredApiKey();
            if (apiKey) {
                this.elements.apiKeyInput.value = apiKey;
                this.updateApiKeyStatus('stored', 'API key loaded from storage');
            }
            
            // Load usage tracker settings
            if (this.usageTracker && this.usageTracker.isInitialized) {
                const settings = this.usageTracker.settings;
                this.elements.monthlyLimitInput.value = settings.monthlyLimit;
                this.elements.enableNotifications.checked = settings.notifications;
                this.updateLimitCost();
            }
            
            // Load processing options from localStorage
            const processingOptions = this.getProcessingOptions();
            this.elements.autoFallback.checked = processingOptions.autoFallback;
            this.elements.showProcessingSource.checked = processingOptions.showProcessingSource;
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Save current settings
     */
    async saveSettings() {
        try {
            // Save API key
            const apiKey = this.elements.apiKeyInput.value.trim();
            if (apiKey) {
                this.storeApiKey(apiKey);
            } else {
                this.removeStoredApiKey();
            }
            
            // Save usage tracker settings
            if (this.usageTracker && this.usageTracker.isInitialized) {
                await this.usageTracker.updateSettings({
                    monthlyLimit: parseInt(this.elements.monthlyLimitInput.value) || 500,
                    notifications: this.elements.enableNotifications.checked
                });
            }
            
            // Save processing options
            this.saveProcessingOptions({
                autoFallback: this.elements.autoFallback.checked,
                showProcessingSource: this.elements.showProcessingSource.checked
            });
            
            this.showNotification('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Handle API key input changes
     */
    onApiKeyChange() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.clearApiKeyStatus();
            this.isApiKeyValid = false;
            return;
        }
        
        // Basic validation
        if (this.isValidApiKeyFormat(apiKey)) {
            this.updateApiKeyStatus('info', 'API key format looks valid');
            this.elements.testApiKeyBtn.disabled = false;
        } else {
            this.updateApiKeyStatus('error', 'Invalid API key format');
            this.elements.testApiKeyBtn.disabled = true;
            this.isApiKeyValid = false;
        }
    }

    /**
     * Validate API key format
     */
    isValidApiKeyFormat(apiKey) {
        // Google Cloud API keys typically start with 'AIza' and are 39 characters
        return apiKey.startsWith('AIza') && apiKey.length === 39;
    }

    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
        const input = this.elements.apiKeyInput;
        const btn = this.elements.toggleVisibilityBtn;
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
            btn.setAttribute('aria-label', 'Hide API key');
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
            btn.setAttribute('aria-label', 'Show API key');
        }
    }

    /**
     * Test API key validity
     */
    async testApiKey() {
        if (this.isTestingApiKey) return;
        
        const apiKey = this.elements.apiKeyInput.value.trim();
        if (!apiKey) {
            this.updateApiKeyStatus('error', 'Please enter an API key');
            return;
        }
        
        this.isTestingApiKey = true;
        this.elements.testApiKeyBtn.disabled = true;
        this.elements.testApiKeyBtn.textContent = 'Testing...';
        this.updateApiKeyStatus('info', 'Testing API key...');
        
        try {
            // Create test GoogleVisionOCR instance
            const { default: GoogleVisionOCR } = await import('./googleVisionOCR.js');
            const testOCR = new GoogleVisionOCR();
            await testOCR.initialize({ apiKey });
            
            // Test with a simple image (1x1 pixel PNG in base64)
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            
            const result = await testOCR.processImage(testImage, {
                maxImageSize: 1024,
                quality: 0.8,
                preprocessImage: false
            });
            
            // If we get here without error, the API key works
            this.isApiKeyValid = true;
            this.updateApiKeyStatus('success', 'API key is valid and working');
            
        } catch (error) {
            this.isApiKeyValid = false;
            
            if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
                this.updateApiKeyStatus('error', 'Invalid API key - please check your key');
            } else if (error.message.includes('quota') || error.message.includes('429')) {
                this.updateApiKeyStatus('warning', 'API key valid but quota exceeded');
                this.isApiKeyValid = true; // Key is valid, just over quota
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                this.updateApiKeyStatus('warning', 'Network error - check your connection');
            } else {
                this.updateApiKeyStatus('error', `Test failed: ${error.message}`);
            }
            
        } finally {
            this.isTestingApiKey = false;
            this.elements.testApiKeyBtn.disabled = false;
            this.elements.testApiKeyBtn.textContent = 'Test';
        }
    }

    /**
     * Clear API key
     */
    clearApiKey() {
        this.elements.apiKeyInput.value = '';
        this.removeStoredApiKey();
        this.clearApiKeyStatus();
        this.isApiKeyValid = false;
        this.elements.testApiKeyBtn.disabled = true;
    }

    /**
     * Update API key status display
     */
    updateApiKeyStatus(type, message) {
        const statusDiv = this.elements.apiKeyStatus;
        const iconSpan = statusDiv.querySelector('.status-icon');
        const textSpan = statusDiv.querySelector('.status-text');
        
        // Clear existing classes
        statusDiv.className = 'api-key-status';
        
        // Set new status
        statusDiv.classList.add(`status-${type}`);
        statusDiv.classList.remove('hidden');
        
        // Set icon and text
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            stored: '💾'
        };
        
        iconSpan.textContent = icons[type] || 'ℹ️';
        textSpan.textContent = message;
    }

    /**
     * Clear API key status
     */
    clearApiKeyStatus() {
        this.elements.apiKeyStatus.classList.add('hidden');
    }

    /**
     * Update usage display
     */
    async updateUsageDisplay() {
        if (!this.usageTracker || !this.usageTracker.isInitialized) {
            return;
        }
        
        try {
            const usage = this.usageTracker.getCurrentUsage();
            const summary = this.usageTracker.getUsageSummary();
            
            // Update usage meter
            this.elements.usagePercentage.textContent = `${usage.percentage}%`;
            this.elements.usageProgress.style.width = `${Math.min(usage.percentage, 100)}%`;
            
            // Update usage details
            this.elements.usageCurrent.textContent = usage.apiCalls;
            this.elements.usageLimit.textContent = usage.settings.monthlyLimit;
            this.elements.usageCost.textContent = `$${usage.estimatedCost.toFixed(2)}`;
            
            // Update statistics
            this.elements.statSuccessRate.textContent = `${usage.successRate}%`;
            this.elements.statAvgTime.textContent = usage.averageProcessingTime > 0 
                ? `${(usage.averageProcessingTime / 1000).toFixed(1)}s` 
                : '--';
            this.elements.statTotalProcessed.textContent = usage.apiCalls;
            this.elements.statDaysRemaining.textContent = summary.remaining.days;
            
            // Update progress bar color based on usage
            const progressBar = this.elements.usageProgress;
            progressBar.className = 'meter-fill';
            if (usage.percentage >= 90) {
                progressBar.classList.add('high-usage');
            } else if (usage.percentage >= 50) {
                progressBar.classList.add('medium-usage');
            }
            
        } catch (error) {
            console.error('Failed to update usage display:', error);
        }
    }

    /**
     * Update limit cost calculation
     */
    updateLimitCost() {
        const limit = parseInt(this.elements.monthlyLimitInput.value) || 0;
        const costPerCall = this.usageTracker?.settings?.costPerCall || 0.0015;
        const estimatedCost = (limit * costPerCall).toFixed(2);
        this.elements.limitCost.textContent = `$${estimatedCost}`;
    }

    /**
     * Reset usage data
     */
    async resetUsageData() {
        if (!confirm('Are you sure you want to reset all usage data? This cannot be undone.')) {
            return;
        }
        
        try {
            if (this.usageTracker && this.usageTracker.isInitialized) {
                await this.usageTracker.resetAllUsage();
                await this.updateUsageDisplay();
                this.showNotification('Usage data reset successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to reset usage data:', error);
            this.showNotification('Failed to reset usage data', 'error');
        }
    }

    /**
     * Export statistics
     */
    exportStatistics() {
        try {
            if (!this.usageTracker || !this.usageTracker.isInitialized) {
                this.showNotification('Usage tracking not available', 'error');
                return;
            }
            
            const usage = this.usageTracker.getCurrentUsage();
            const historical = this.usageTracker.getHistoricalUsage();
            const summary = this.usageTracker.getUsageSummary();
            
            const exportData = {
                currentMonth: usage,
                historicalData: historical,
                summary: summary,
                exportedAt: new Date().toISOString()
            };
            
            // Create and download JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ocr-usage-stats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Statistics exported successfully', 'success');
            
        } catch (error) {
            console.error('Failed to export statistics:', error);
            this.showNotification('Failed to export statistics', 'error');
        }
    }

    /**
     * Store API key securely
     */
    storeApiKey(apiKey) {
        try {
            localStorage.setItem('google_vision_api_key', apiKey);
        } catch (error) {
            console.error('Failed to store API key:', error);
            throw new Error('Failed to save API key');
        }
    }

    /**
     * Get stored API key
     */
    getStoredApiKey() {
        try {
            return localStorage.getItem('google_vision_api_key') || '';
        } catch (error) {
            console.error('Failed to retrieve API key:', error);
            return '';
        }
    }

    /**
     * Remove stored API key
     */
    removeStoredApiKey() {
        try {
            localStorage.removeItem('google_vision_api_key');
        } catch (error) {
            console.error('Failed to remove API key:', error);
        }
    }

    /**
     * Get processing options
     */
    getProcessingOptions() {
        try {
            const stored = localStorage.getItem('ocr_processing_options');
            return stored ? JSON.parse(stored) : {
                autoFallback: true,
                showProcessingSource: false
            };
        } catch (error) {
            console.error('Failed to load processing options:', error);
            return { autoFallback: true, showProcessingSource: false };
        }
    }

    /**
     * Save processing options
     */
    saveProcessingOptions(options) {
        try {
            localStorage.setItem('ocr_processing_options', JSON.stringify(options));
        } catch (error) {
            console.error('Failed to save processing options:', error);
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-text">${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Clear references
        this.usageTracker = null;
        this.googleVisionOCR = null;
        this.elements = {};
        
        console.log('🧹 Settings manager cleaned up');
    }
}

export default SettingsManager;