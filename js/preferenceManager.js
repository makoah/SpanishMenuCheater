/**
 * Preference Manager - Handles user likes/dislikes for menu items
 * Provides localStorage-based persistence for user preferences
 */

export class PreferenceManager {
    constructor() {
        this.storageKey = 'spanish-menu-preferences';
        this.preferences = new Map();
        this.maxStorageSize = 1024 * 1024; // 1MB limit for preferences
        
        // Preference states
        this.STATES = {
            NEUTRAL: 'neutral',
            LIKED: 'liked',
            DISLIKED: 'disliked'
        };
        
        this.init();
    }
    
    /**
     * Initialize the preference manager
     */
    init() {
        this.loadPreferences();
        console.log(`[PreferenceManager] Initialized with ${this.preferences.size} stored preferences`);
    }
    
    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                
                // Validate data structure
                if (data && typeof data === 'object') {
                    this.preferences = new Map(Object.entries(data));
                    console.log(`[PreferenceManager] Loaded ${this.preferences.size} preferences from storage`);
                } else {
                    console.warn('[PreferenceManager] Invalid preference data in storage, starting fresh');
                    this.preferences = new Map();
                }
            }
        } catch (error) {
            console.error('[PreferenceManager] Error loading preferences:', error);
            this.preferences = new Map();
        }
    }
    
    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            const data = Object.fromEntries(this.preferences);
            const jsonString = JSON.stringify(data);
            
            // Check storage size
            if (jsonString.length > this.maxStorageSize) {
                console.warn('[PreferenceManager] Preferences approaching storage limit, cleaning up old entries');
                this.cleanupOldPreferences();
                return this.savePreferences(); // Retry after cleanup
            }
            
            localStorage.setItem(this.storageKey, jsonString);
            console.log(`[PreferenceManager] Saved ${this.preferences.size} preferences to storage`);
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('[PreferenceManager] Storage quota exceeded, performing cleanup');
                this.cleanupOldPreferences();
                // Only retry once to avoid infinite recursion
                try {
                    const retryData = Object.fromEntries(this.preferences);
                    const retryJsonString = JSON.stringify(retryData);
                    localStorage.setItem(this.storageKey, retryJsonString);
                    console.log(`[PreferenceManager] Retry successful: saved ${this.preferences.size} preferences`);
                } catch (retryError) {
                    console.error('[PreferenceManager] Failed to save even after cleanup:', retryError);
                }
            } else {
                console.error('[PreferenceManager] Error saving preferences:', error);
            }
        }
    }
    
    /**
     * Set preference for a menu item
     * @param {string} itemId - Menu item ID
     * @param {string} state - Preference state (liked, disliked, neutral)
     */
    setPreference(itemId, state) {
        if (!itemId) {
            console.warn('[PreferenceManager] Cannot set preference: itemId is required');
            return false;
        }
        
        if (!Object.values(this.STATES).includes(state)) {
            console.warn('[PreferenceManager] Invalid preference state:', state);
            return false;
        }
        
        const previousState = this.preferences.get(itemId);
        
        if (state === this.STATES.NEUTRAL) {
            // Remove neutral preferences to save space
            this.preferences.delete(itemId);
        } else {
            // Store preference with timestamp for cleanup purposes
            this.preferences.set(itemId, {
                state: state,
                timestamp: Date.now()
            });
        }
        
        this.savePreferences();
        
        console.log(`[PreferenceManager] Set preference for ${itemId}: ${previousState?.state || 'neutral'} → ${state}`);
        return true;
    }
    
    /**
     * Get preference for a menu item
     * @param {string} itemId - Menu item ID
     * @returns {string} Preference state (liked, disliked, neutral)
     */
    getPreference(itemId) {
        if (!itemId) {
            return this.STATES.NEUTRAL;
        }
        
        const preference = this.preferences.get(itemId);
        return preference ? preference.state : this.STATES.NEUTRAL;
    }
    
    /**
     * Check if item is liked
     * @param {string} itemId - Menu item ID
     * @returns {boolean}
     */
    isLiked(itemId) {
        return this.getPreference(itemId) === this.STATES.LIKED;
    }
    
    /**
     * Check if item is disliked
     * @param {string} itemId - Menu item ID
     * @returns {boolean}
     */
    isDisliked(itemId) {
        return this.getPreference(itemId) === this.STATES.DISLIKED;
    }
    
    /**
     * Toggle preference between states
     * @param {string} itemId - Menu item ID
     * @returns {string} New preference state
     */
    togglePreference(itemId) {
        const currentState = this.getPreference(itemId);
        let newState;
        
        switch (currentState) {
            case this.STATES.NEUTRAL:
                newState = this.STATES.LIKED;
                break;
            case this.STATES.LIKED:
                newState = this.STATES.DISLIKED;
                break;
            case this.STATES.DISLIKED:
                newState = this.STATES.NEUTRAL;
                break;
            default:
                newState = this.STATES.LIKED;
        }
        
        this.setPreference(itemId, newState);
        return newState;
    }
    
    /**
     * Get all liked items
     * @returns {Array<string>} Array of liked item IDs
     */
    getLikedItems() {
        const liked = [];
        for (const [itemId, preference] of this.preferences) {
            if (preference.state === this.STATES.LIKED) {
                liked.push(itemId);
            }
        }
        return liked;
    }
    
    /**
     * Get all disliked items
     * @returns {Array<string>} Array of disliked item IDs
     */
    getDislikedItems() {
        const disliked = [];
        for (const [itemId, preference] of this.preferences) {
            if (preference.state === this.STATES.DISLIKED) {
                disliked.push(itemId);
            }
        }
        return disliked;
    }
    
    /**
     * Get preference statistics
     * @returns {Object} Stats about user preferences
     */
    getStats() {
        const stats = {
            total: this.preferences.size,
            liked: 0,
            disliked: 0
        };
        
        for (const preference of this.preferences.values()) {
            if (preference.state === this.STATES.LIKED) {
                stats.liked++;
            } else if (preference.state === this.STATES.DISLIKED) {
                stats.disliked++;
            }
        }
        
        return stats;
    }
    
    /**
     * Filter items based on preferences
     * @param {Array} items - Array of menu items
     * @param {Object} filterOptions - Filter options
     * @returns {Array} Filtered items
     */
    filterItems(items, filterOptions = {}) {
        if (!Array.isArray(items)) {
            return [];
        }
        
        const { showLikedOnly = false, hideDisliked = false } = filterOptions;
        
        return items.filter(item => {
            const preference = this.getPreference(item.id);
            
            // If showing liked only, only include liked items
            if (showLikedOnly && preference !== this.STATES.LIKED) {
                return false;
            }
            
            // If hiding disliked, exclude disliked items
            if (hideDisliked && preference === this.STATES.DISLIKED) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Clean up old preferences to manage storage size
     */
    cleanupOldPreferences() {
        const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago
        let cleanedCount = 0;
        
        for (const [itemId, preference] of this.preferences) {
            if (preference.timestamp && preference.timestamp < cutoffTime) {
                this.preferences.delete(itemId);
                cleanedCount++;
            }
        }
        
        // If still too large, remove oldest preferences
        if (this.preferences.size > 1000) {
            const sortedEntries = Array.from(this.preferences.entries())
                .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
            
            // Keep only the 800 most recent preferences
            const toKeep = sortedEntries.slice(-800);
            this.preferences = new Map(toKeep);
            cleanedCount += sortedEntries.length - 800;
        }
        
        console.log(`[PreferenceManager] Cleaned up ${cleanedCount} old preferences`);
    }
    
    /**
     * Clear all preferences
     */
    clearAllPreferences() {
        this.preferences.clear();
        localStorage.removeItem(this.storageKey);
        console.log('[PreferenceManager] All preferences cleared');
    }
    
    /**
     * Export preferences for backup
     * @returns {Object} Preferences data
     */
    exportPreferences() {
        return Object.fromEntries(this.preferences);
    }
    
    /**
     * Import preferences from backup
     * @param {Object} data - Preferences data
     */
    importPreferences(data) {
        try {
            if (data && typeof data === 'object') {
                this.preferences = new Map(Object.entries(data));
                this.savePreferences();
                console.log(`[PreferenceManager] Imported ${this.preferences.size} preferences`);
                return true;
            }
        } catch (error) {
            console.error('[PreferenceManager] Error importing preferences:', error);
        }
        return false;
    }
}