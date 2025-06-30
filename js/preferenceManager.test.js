/**
 * Unit Tests for PreferenceManager
 * Tests localStorage integration, preference management, and filtering
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// Import using dynamic import for ES modules in Jest
let PreferenceManager;

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

// Mock console methods to avoid noise in tests
const consoleMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('PreferenceManager', () => {
    let preferenceManager;
    
    beforeAll(async () => {
        // Dynamic import for ES modules
        const module = await import('./preferenceManager.js');
        PreferenceManager = module.PreferenceManager;
    });
    
    beforeEach(() => {
        // Reset localStorage mock
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        
        // Reset console mocks
        Object.keys(consoleMock).forEach(key => consoleMock[key].mockClear());
        
        // Mock global objects
        global.localStorage = localStorageMock;
        global.console = { ...console, ...consoleMock };
        
        // Create fresh instance
        preferenceManager = new PreferenceManager();
    });
    
    describe('Initialization', () => {
        test('should initialize with empty preferences when no storage data', () => {
            expect(preferenceManager.preferences.size).toBe(0);
            expect(localStorageMock.getItem).toHaveBeenCalledWith('spanish-menu-preferences');
        });
        
        test('should load existing preferences from localStorage', () => {
            const testData = {
                'item1': { state: 'liked', timestamp: Date.now() },
                'item2': { state: 'disliked', timestamp: Date.now() }
            };
            
            localStorageMock.setItem('spanish-menu-preferences', JSON.stringify(testData));
            
            const pm = new PreferenceManager();
            expect(pm.preferences.size).toBe(2);
            expect(pm.getPreference('item1')).toBe('liked');
            expect(pm.getPreference('item2')).toBe('disliked');
        });
        
        test('should handle corrupted localStorage data gracefully', () => {
            localStorageMock.setItem('spanish-menu-preferences', 'invalid-json');
            
            const pm = new PreferenceManager();
            expect(pm.preferences.size).toBe(0);
            expect(consoleMock.error).toHaveBeenCalled();
        });
    });
    
    describe('Preference States', () => {
        test('should have correct preference state constants', () => {
            expect(preferenceManager.STATES.NEUTRAL).toBe('neutral');
            expect(preferenceManager.STATES.LIKED).toBe('liked');
            expect(preferenceManager.STATES.DISLIKED).toBe('disliked');
        });
        
        test('should return neutral for new items', () => {
            expect(preferenceManager.getPreference('new-item')).toBe('neutral');
        });
        
        test('should return neutral for invalid item ID', () => {
            expect(preferenceManager.getPreference(null)).toBe('neutral');
            expect(preferenceManager.getPreference('')).toBe('neutral');
            expect(preferenceManager.getPreference(undefined)).toBe('neutral');
        });
    });
    
    describe('Setting Preferences', () => {
        test('should set liked preference correctly', () => {
            const result = preferenceManager.setPreference('item1', 'liked');
            expect(result).toBe(true);
            expect(preferenceManager.getPreference('item1')).toBe('liked');
            expect(preferenceManager.isLiked('item1')).toBe(true);
        });
        
        test('should set disliked preference correctly', () => {
            const result = preferenceManager.setPreference('item1', 'disliked');
            expect(result).toBe(true);
            expect(preferenceManager.getPreference('item1')).toBe('disliked');
            expect(preferenceManager.isDisliked('item1')).toBe(true);
        });
        
        test('should remove preference when set to neutral', () => {
            preferenceManager.setPreference('item1', 'liked');
            expect(preferenceManager.preferences.has('item1')).toBe(true);
            
            preferenceManager.setPreference('item1', 'neutral');
            expect(preferenceManager.preferences.has('item1')).toBe(false);
            expect(preferenceManager.getPreference('item1')).toBe('neutral');
        });
        
        test('should reject invalid preference states', () => {
            const result = preferenceManager.setPreference('item1', 'invalid');
            expect(result).toBe(false);
            expect(consoleMock.warn).toHaveBeenCalled();
        });
        
        test('should reject empty item IDs', () => {
            const result = preferenceManager.setPreference('', 'liked');
            expect(result).toBe(false);
            expect(consoleMock.warn).toHaveBeenCalled();
        });
        
        test('should save to localStorage when preference is set', () => {
            preferenceManager.setPreference('item1', 'liked');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });
    
    describe('Toggle Preferences', () => {
        test('should toggle from neutral to liked', () => {
            const newState = preferenceManager.togglePreference('item1');
            expect(newState).toBe('liked');
            expect(preferenceManager.getPreference('item1')).toBe('liked');
        });
        
        test('should toggle from liked to disliked', () => {
            preferenceManager.setPreference('item1', 'liked');
            const newState = preferenceManager.togglePreference('item1');
            expect(newState).toBe('disliked');
            expect(preferenceManager.getPreference('item1')).toBe('disliked');
        });
        
        test('should toggle from disliked to neutral', () => {
            preferenceManager.setPreference('item1', 'disliked');
            const newState = preferenceManager.togglePreference('item1');
            expect(newState).toBe('neutral');
            expect(preferenceManager.getPreference('item1')).toBe('neutral');
        });
    });
    
    describe('Preference Queries', () => {
        beforeEach(() => {
            preferenceManager.setPreference('liked1', 'liked');
            preferenceManager.setPreference('liked2', 'liked');
            preferenceManager.setPreference('disliked1', 'disliked');
            preferenceManager.setPreference('disliked2', 'disliked');
        });
        
        test('should get all liked items', () => {
            const liked = preferenceManager.getLikedItems();
            expect(liked).toHaveLength(2);
            expect(liked).toContain('liked1');
            expect(liked).toContain('liked2');
        });
        
        test('should get all disliked items', () => {
            const disliked = preferenceManager.getDislikedItems();
            expect(disliked).toHaveLength(2);
            expect(disliked).toContain('disliked1');
            expect(disliked).toContain('disliked2');
        });
        
        test('should provide accurate statistics', () => {
            const stats = preferenceManager.getStats();
            expect(stats.total).toBe(4);
            expect(stats.liked).toBe(2);
            expect(stats.disliked).toBe(2);
        });
    });
    
    describe('Item Filtering', () => {
        const mockItems = [
            { id: 'item1', name: 'Paella' },
            { id: 'item2', name: 'Tortilla' },
            { id: 'item3', name: 'Gazpacho' },
            { id: 'item4', name: 'Jamon' }
        ];
        
        beforeEach(() => {
            preferenceManager.setPreference('item1', 'liked');
            preferenceManager.setPreference('item2', 'liked');
            preferenceManager.setPreference('item3', 'disliked');
            // item4 remains neutral
        });
        
        test('should filter to show only liked items', () => {
            const filtered = preferenceManager.filterItems(mockItems, { showLikedOnly: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(item => item.id)).toEqual(['item1', 'item2']);
        });
        
        test('should filter to hide disliked items', () => {
            const filtered = preferenceManager.filterItems(mockItems, { hideDisliked: true });
            expect(filtered).toHaveLength(3);
            expect(filtered.map(item => item.id)).toEqual(['item1', 'item2', 'item4']);
        });
        
        test('should apply both filters simultaneously', () => {
            const filtered = preferenceManager.filterItems(mockItems, { 
                showLikedOnly: true, 
                hideDisliked: true 
            });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(item => item.id)).toEqual(['item1', 'item2']);
        });
        
        test('should return all items when no filters applied', () => {
            const filtered = preferenceManager.filterItems(mockItems);
            expect(filtered).toHaveLength(4);
        });
        
        test('should handle empty or invalid input gracefully', () => {
            expect(preferenceManager.filterItems(null)).toEqual([]);
            expect(preferenceManager.filterItems(undefined)).toEqual([]);
            expect(preferenceManager.filterItems('not-array')).toEqual([]);
        });
    });
    
    describe('Storage Management', () => {
        test('should handle localStorage quota exceeded error', () => {
            localStorageMock.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });
            
            // Should not throw error
            expect(() => {
                preferenceManager.setPreference('item1', 'liked');
            }).not.toThrow();
            
            expect(consoleMock.warn).toHaveBeenCalled();
        });
        
        test('should cleanup old preferences when storage gets large', () => {
            // Add many old preferences
            const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
            
            for (let i = 0; i < 10; i++) {
                preferenceManager.preferences.set(`old-item-${i}`, {
                    state: 'liked',
                    timestamp: oldTimestamp
                });
            }
            
            preferenceManager.cleanupOldPreferences();
            expect(preferenceManager.preferences.size).toBe(0);
        });
    });
    
    describe('Data Import/Export', () => {
        test('should export preferences correctly', () => {
            preferenceManager.setPreference('item1', 'liked');
            preferenceManager.setPreference('item2', 'disliked');
            
            const exported = preferenceManager.exportPreferences();
            expect(exported).toHaveProperty('item1');
            expect(exported).toHaveProperty('item2');
            expect(exported.item1.state).toBe('liked');
            expect(exported.item2.state).toBe('disliked');
        });
        
        test('should import preferences correctly', () => {
            const importData = {
                'item1': { state: 'liked', timestamp: Date.now() },
                'item2': { state: 'disliked', timestamp: Date.now() }
            };
            
            const result = preferenceManager.importPreferences(importData);
            expect(result).toBe(true);
            expect(preferenceManager.getPreference('item1')).toBe('liked');
            expect(preferenceManager.getPreference('item2')).toBe('disliked');
        });
        
        test('should handle invalid import data', () => {
            const result1 = preferenceManager.importPreferences(null);
            const result2 = preferenceManager.importPreferences('invalid');
            
            expect(result1).toBe(false);
            expect(result2).toBe(false);
        });
        
        test('should clear all preferences', () => {
            preferenceManager.setPreference('item1', 'liked');
            preferenceManager.setPreference('item2', 'disliked');
            
            preferenceManager.clearAllPreferences();
            expect(preferenceManager.preferences.size).toBe(0);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('spanish-menu-preferences');
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle very long item IDs', () => {
            const longId = 'a'.repeat(1000);
            const result = preferenceManager.setPreference(longId, 'liked');
            expect(result).toBe(true);
            expect(preferenceManager.getPreference(longId)).toBe('liked');
        });
        
        test('should handle special characters in item IDs', () => {
            const specialId = 'item-with-特殊字符-and-émojis-🍽️';
            const result = preferenceManager.setPreference(specialId, 'liked');
            expect(result).toBe(true);
            expect(preferenceManager.getPreference(specialId)).toBe('liked');
        });
        
        test('should maintain performance with many preferences', () => {
            const startTime = Date.now();
            
            // Add 1000 preferences
            for (let i = 0; i < 1000; i++) {
                preferenceManager.setPreference(`item-${i}`, i % 2 === 0 ? 'liked' : 'disliked');
            }
            
            // Test retrieval performance
            for (let i = 0; i < 100; i++) {
                preferenceManager.getPreference(`item-${i}`);
            }
            
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
        });
    });
});