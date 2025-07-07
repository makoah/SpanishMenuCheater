/**
 * Usage Tracker - Monitor Google Vision API calls and cost control
 * Tracks monthly usage, enforces limits, and provides warnings
 */

class UsageTracker {
    constructor() {
        this.storageKey = 'google_vision_usage';
        this.settingsKey = 'google_vision_settings';
        this.currentUsage = {
            month: null,
            year: null,
            apiCalls: 0,
            totalProcessingTime: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastUpdated: null
        };
        this.settings = {
            monthlyLimit: 500, // Default: 500 API calls per month
            warningThresholds: [0.5, 0.8, 0.9], // Warning at 50%, 80%, 90%
            costPerCall: 0.0015, // $1.50 per 1000 calls
            enabled: true,
            notifications: true
        };
        this.callbacks = {
            onUsageUpdate: null,
            onWarning: null,
            onLimitReached: null
        };
        this.isInitialized = false;
    }

    /**
     * Initialize the usage tracker
     * @param {Object} options - Configuration options
     */
    async initialize(options = {}) {
        try {
            // Load existing usage data
            await this.loadUsageData();
            
            // Load settings
            await this.loadSettings();
            
            // Apply any provided options
            if (options.monthlyLimit) {
                this.settings.monthlyLimit = options.monthlyLimit;
            }
            if (options.callbacks) {
                this.callbacks = { ...this.callbacks, ...options.callbacks };
            }
            
            // Check if we need to reset for new month
            this.checkMonthlyReset();
            
            this.isInitialized = true;
            console.log('📊 Usage tracker initialized:', this.getCurrentUsage());
            
        } catch (error) {
            console.error('Failed to initialize usage tracker:', error);
            throw new Error(`Usage tracker initialization failed: ${error.message}`);
        }
    }

    /**
     * Record a Google Vision API call
     * @param {Object} callInfo - Information about the API call
     */
    async recordAPICall(callInfo = {}) {
        if (!this.isInitialized) {
            console.warn('Usage tracker not initialized, call will not be recorded');
            return;
        }

        const {
            success = true,
            processingTime = 0,
            imageSize = 0,
            confidence = 0,
            errorType = null
        } = callInfo;

        try {
            // Ensure we're tracking the current month
            this.checkMonthlyReset();
            
            // Update usage counters
            this.currentUsage.apiCalls++;
            this.currentUsage.totalProcessingTime += processingTime;
            this.currentUsage.lastUpdated = new Date().toISOString();
            
            if (success) {
                this.currentUsage.successfulCalls++;
            } else {
                this.currentUsage.failedCalls++;
            }
            
            // Save updated usage
            await this.saveUsageData();
            
            // Check for warnings and limits
            this.checkUsageThresholds();
            
            // Notify callback if available
            if (this.callbacks.onUsageUpdate) {
                this.callbacks.onUsageUpdate(this.getCurrentUsage());
            }
            
            console.log(`📊 API call recorded: ${this.currentUsage.apiCalls}/${this.settings.monthlyLimit}`);
            
        } catch (error) {
            console.error('Failed to record API call:', error);
        }
    }

    /**
     * Check if monthly reset is needed
     */
    checkMonthlyReset() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        if (this.currentUsage.month !== currentMonth || this.currentUsage.year !== currentYear) {
            console.log(`📅 Monthly reset: ${this.currentUsage.month}/${this.currentUsage.year} → ${currentMonth}/${currentYear}`);
            this.resetMonthlyUsage(currentMonth, currentYear);
        }
    }

    /**
     * Reset usage for new month
     * @param {number} month - New month (0-11)
     * @param {number} year - New year
     */
    resetMonthlyUsage(month, year) {
        const previousUsage = { ...this.currentUsage };
        
        this.currentUsage = {
            month: month,
            year: year,
            apiCalls: 0,
            totalProcessingTime: 0,
            successfulCalls: 0,
            failedCalls: 0,
            lastUpdated: new Date().toISOString()
        };
        
        // Archive previous month's data if it exists
        if (previousUsage.month !== null) {
            this.archivePreviousMonth(previousUsage);
        }
        
        this.saveUsageData();
    }

    /**
     * Archive previous month's usage data
     * @param {Object} previousUsage - Previous month's usage data
     */
    async archivePreviousMonth(previousUsage) {
        try {
            const archiveKey = `${this.storageKey}_archive`;
            const existingArchive = JSON.parse(localStorage.getItem(archiveKey) || '[]');
            
            // Add previous month to archive
            existingArchive.push({
                ...previousUsage,
                archivedAt: new Date().toISOString()
            });
            
            // Keep only last 12 months
            if (existingArchive.length > 12) {
                existingArchive.splice(0, existingArchive.length - 12);
            }
            
            localStorage.setItem(archiveKey, JSON.stringify(existingArchive));
            console.log('📦 Previous month usage archived');
            
        } catch (error) {
            console.warn('Failed to archive previous month usage:', error);
        }
    }

    /**
     * Check usage thresholds and trigger warnings
     */
    checkUsageThresholds() {
        if (!this.settings.enabled || !this.settings.notifications) {
            return;
        }

        const usagePercentage = this.getUsagePercentage();
        
        // Check if limit is reached
        if (this.currentUsage.apiCalls >= this.settings.monthlyLimit) {
            if (this.callbacks.onLimitReached) {
                this.callbacks.onLimitReached({
                    currentUsage: this.currentUsage.apiCalls,
                    limit: this.settings.monthlyLimit,
                    percentage: usagePercentage
                });
            }
            return;
        }
        
        // Check warning thresholds
        for (const threshold of this.settings.warningThresholds) {
            if (usagePercentage >= threshold * 100) {
                const warningKey = `warning_${Math.round(threshold * 100)}`;
                
                // Check if we already warned for this threshold this month
                if (!this.hasWarningBeenShown(warningKey)) {
                    this.markWarningShown(warningKey);
                    
                    if (this.callbacks.onWarning) {
                        this.callbacks.onWarning({
                            threshold: Math.round(threshold * 100),
                            currentUsage: this.currentUsage.apiCalls,
                            limit: this.settings.monthlyLimit,
                            percentage: usagePercentage,
                            estimatedCost: this.getEstimatedCost()
                        });
                    }
                }
                break; // Only show one warning at a time
            }
        }
    }

    /**
     * Check if a warning has been shown this month
     * @param {string} warningKey - Warning identifier
     * @returns {boolean} True if warning was already shown
     */
    hasWarningBeenShown(warningKey) {
        const warningsKey = `${this.storageKey}_warnings`;
        const currentMonthKey = `${this.currentUsage.year}_${this.currentUsage.month}`;
        
        try {
            const warnings = JSON.parse(localStorage.getItem(warningsKey) || '{}');
            return warnings[currentMonthKey]?.includes(warningKey) || false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark a warning as shown for this month
     * @param {string} warningKey - Warning identifier
     */
    markWarningShown(warningKey) {
        const warningsKey = `${this.storageKey}_warnings`;
        const currentMonthKey = `${this.currentUsage.year}_${this.currentUsage.month}`;
        
        try {
            const warnings = JSON.parse(localStorage.getItem(warningsKey) || '{}');
            
            if (!warnings[currentMonthKey]) {
                warnings[currentMonthKey] = [];
            }
            
            if (!warnings[currentMonthKey].includes(warningKey)) {
                warnings[currentMonthKey].push(warningKey);
            }
            
            localStorage.setItem(warningsKey, JSON.stringify(warnings));
        } catch (error) {
            console.warn('Failed to mark warning as shown:', error);
        }
    }

    /**
     * Get current usage statistics
     * @returns {Object} Current usage information
     */
    getCurrentUsage() {
        return {
            ...this.currentUsage,
            percentage: this.getUsagePercentage(),
            remaining: Math.max(0, this.settings.monthlyLimit - this.currentUsage.apiCalls),
            estimatedCost: this.getEstimatedCost(),
            averageProcessingTime: this.getAverageProcessingTime(),
            successRate: this.getSuccessRate(),
            settings: { ...this.settings }
        };
    }

    /**
     * Get usage percentage
     * @returns {number} Usage percentage (0-100)
     */
    getUsagePercentage() {
        if (this.settings.monthlyLimit === 0) return 0;
        return Math.round((this.currentUsage.apiCalls / this.settings.monthlyLimit) * 100);
    }

    /**
     * Get estimated cost for current month
     * @returns {number} Estimated cost in USD
     */
    getEstimatedCost() {
        return Math.round(this.currentUsage.apiCalls * this.settings.costPerCall * 100) / 100;
    }

    /**
     * Get average processing time
     * @returns {number} Average processing time in milliseconds
     */
    getAverageProcessingTime() {
        if (this.currentUsage.apiCalls === 0) return 0;
        return Math.round(this.currentUsage.totalProcessingTime / this.currentUsage.apiCalls);
    }

    /**
     * Get success rate
     * @returns {number} Success rate percentage (0-100)
     */
    getSuccessRate() {
        if (this.currentUsage.apiCalls === 0) return 100;
        return Math.round((this.currentUsage.successfulCalls / this.currentUsage.apiCalls) * 100);
    }

    /**
     * Check if API calls are allowed (not over limit)
     * @returns {boolean} True if calls are allowed
     */
    isUsageAllowed() {
        if (!this.settings.enabled) return true;
        return this.currentUsage.apiCalls < this.settings.monthlyLimit;
    }

    /**
     * Get days remaining in current month
     * @returns {number} Days remaining in month
     */
    getDaysRemainingInMonth() {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.getDate() - now.getDate();
    }

    /**
     * Get projected monthly usage
     * @returns {number} Projected monthly API calls
     */
    getProjectedMonthlyUsage() {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        if (dayOfMonth === 0) return 0;
        
        return Math.round((this.currentUsage.apiCalls / dayOfMonth) * daysInMonth);
    }

    /**
     * Update settings
     * @param {Object} newSettings - New settings to apply
     */
    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await this.saveSettings();
        
        // Re-check thresholds with new settings
        this.checkUsageThresholds();
        
        console.log('⚙️ Usage tracker settings updated:', this.settings);
    }

    /**
     * Get historical usage data
     * @returns {Array} Array of previous months' usage data
     */
    getHistoricalUsage() {
        try {
            const archiveKey = `${this.storageKey}_archive`;
            return JSON.parse(localStorage.getItem(archiveKey) || '[]');
        } catch (error) {
            console.warn('Failed to load historical usage:', error);
            return [];
        }
    }

    /**
     * Load usage data from storage
     */
    async loadUsageData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.currentUsage = { ...this.currentUsage, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load usage data, starting fresh:', error);
            this.resetMonthlyUsage(new Date().getMonth(), new Date().getFullYear());
        }
    }

    /**
     * Save usage data to storage
     */
    async saveUsageData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentUsage));
        } catch (error) {
            console.error('Failed to save usage data:', error);
        }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const stored = localStorage.getItem(this.settingsKey);
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Reset all usage data (for testing or user request)
     */
    async resetAllUsage() {
        this.resetMonthlyUsage(new Date().getMonth(), new Date().getFullYear());
        
        // Clear warnings
        const warningsKey = `${this.storageKey}_warnings`;
        localStorage.removeItem(warningsKey);
        
        // Clear archive
        const archiveKey = `${this.storageKey}_archive`;
        localStorage.removeItem(archiveKey);
        
        await this.saveUsageData();
        console.log('🗑️ All usage data reset');
    }

    /**
     * Get usage summary for display
     * @returns {Object} Formatted usage summary
     */
    getUsageSummary() {
        const usage = this.getCurrentUsage();
        const projected = this.getProjectedMonthlyUsage();
        const daysRemaining = this.getDaysRemainingInMonth();
        
        return {
            current: {
                calls: usage.apiCalls,
                percentage: usage.percentage,
                cost: usage.estimatedCost
            },
            limit: this.settings.monthlyLimit,
            remaining: {
                calls: usage.remaining,
                days: daysRemaining
            },
            projected: {
                calls: projected,
                cost: Math.round(projected * this.settings.costPerCall * 100) / 100,
                overLimit: projected > this.settings.monthlyLimit
            },
            performance: {
                successRate: usage.successRate,
                averageTime: usage.averageProcessingTime
            }
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.callbacks = {
            onUsageUpdate: null,
            onWarning: null,
            onLimitReached: null
        };
        this.isInitialized = false;
        console.log('🧹 Usage tracker cleaned up');
    }
}

export default UsageTracker;