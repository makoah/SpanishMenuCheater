/**
 * Preferences Manager - Handles user preferences storage and retrieval
 * Uses localStorage to persist like/dislike preferences across sessions
 */

export class PreferencesManager {
    constructor() {
        this.storageKey = 'spanish-menu-preferences';
        this.maxPreferences = 1000; // Limit to prevent localStorage overflow
        this.preferences = this.loadPreferences();
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return {
                    liked: new Set(data.liked || []),
                    disliked: new Set(data.disliked || []),
                    lastUpdated: data.lastUpdated || new Date().toISOString()
                };
            }
        } catch (error) {
            console.warn('Failed to load preferences from localStorage:', error);
        }
        
        return {
            liked: new Set(),
            disliked: new Set(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            const data = {
                liked: Array.from(this.preferences.liked),
                disliked: Array.from(this.preferences.disliked),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save preferences to localStorage:', error);
            // If storage is full, try cleanup and retry once
            if (error.name === 'QuotaExceededError') {
                this.cleanup();
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                } catch (retryError) {
                    console.error('Failed to save preferences even after cleanup:', retryError);
                }
            }
        }
    }

    /**
     * Set preference for a menu item
     * @param {string} itemId - Unique identifier for the menu item
     * @param {string} type - 'like', 'dislike', or 'neutral'
     */
    setPreference(itemId, type) {
        if (!itemId) return;

        // Remove from both sets first
        this.preferences.liked.delete(itemId);
        this.preferences.disliked.delete(itemId);

        // Add to appropriate set based on type
        switch (type) {
            case 'like':
                this.preferences.liked.add(itemId);
                break;
            case 'dislike':
                this.preferences.disliked.add(itemId);
                break;
            case 'neutral':
                // Already removed above, nothing to add
                break;
            default:
                console.warn(`Invalid preference type: ${type}`);
                return;
        }

        // Check if we need to cleanup old preferences
        const totalPreferences = this.preferences.liked.size + this.preferences.disliked.size;
        if (totalPreferences > this.maxPreferences) {
            this.cleanup();
        }

        this.savePreferences();
    }

    /**
     * Get preference for a menu item
     * @param {string} itemId - Unique identifier for the menu item
     * @returns {string} 'like', 'dislike', or 'neutral'
     */
    getPreference(itemId) {
        if (!itemId) return 'neutral';

        if (this.preferences.liked.has(itemId)) {
            return 'like';
        } else if (this.preferences.disliked.has(itemId)) {
            return 'dislike';
        }
        return 'neutral';
    }

    /**
     * Check if item is liked
     * @param {string} itemId - Unique identifier for the menu item
     * @returns {boolean}
     */
    isLiked(itemId) {
        return this.preferences.liked.has(itemId);
    }

    /**
     * Check if item is disliked
     * @param {string} itemId - Unique identifier for the menu item
     * @returns {boolean}
     */
    isDisliked(itemId) {
        return this.preferences.disliked.has(itemId);
    }

    /**
     * Get preference counts
     * @returns {object} Object with liked and disliked counts
     */
    getPreferenceCounts() {
        return {
            liked: this.preferences.liked.size,
            disliked: this.preferences.disliked.size,
            total: this.preferences.liked.size + this.preferences.disliked.size
        };
    }

    /**
     * Get all liked item IDs
     * @returns {Array} Array of liked item IDs
     */
    getLikedItems() {
        return Array.from(this.preferences.liked);
    }

    /**
     * Get all disliked item IDs
     * @returns {Array} Array of disliked item IDs
     */
    getDislikedItems() {
        return Array.from(this.preferences.disliked);
    }

    /**
     * Clear all preferences
     */
    clearAllPreferences() {
        this.preferences.liked.clear();
        this.preferences.disliked.clear();
        this.savePreferences();
    }

    /**
     * Cleanup old preferences using LRU strategy
     * This is a simple implementation - in a more complex app,
     * you might track access times and remove least recently used
     */
    cleanup() {
        const maxAllowed = Math.floor(this.maxPreferences * 0.8); // Keep 80% after cleanup
        const totalPreferences = this.preferences.liked.size + this.preferences.disliked.size;
        
        if (totalPreferences <= maxAllowed) return;

        const toRemove = totalPreferences - maxAllowed;
        let removed = 0;

        // Simple strategy: remove from disliked first, then liked
        // In a real app, you'd implement proper LRU based on usage timestamps
        const dislikedArray = Array.from(this.preferences.disliked);
        for (let i = 0; i < Math.min(toRemove, dislikedArray.length); i++) {
            this.preferences.disliked.delete(dislikedArray[i]);
            removed++;
        }

        if (removed < toRemove) {
            const likedArray = Array.from(this.preferences.liked);
            const stillToRemove = toRemove - removed;
            for (let i = 0; i < Math.min(stillToRemove, likedArray.length); i++) {
                this.preferences.liked.delete(likedArray[i]);
            }
        }

        console.log(`Cleaned up ${toRemove} old preferences`);
    }

    /**
     * Export preferences for debugging or backup
     * @returns {object} Preferences data
     */
    exportPreferences() {
        return {
            liked: Array.from(this.preferences.liked),
            disliked: Array.from(this.preferences.disliked),
            lastUpdated: this.preferences.lastUpdated,
            counts: this.getPreferenceCounts()
        };
    }
}