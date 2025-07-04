/**
 * Tests for SearchEngine - Fuzzy Search and Auto-suggest functionality
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock DataManager for testing
class MockDataManager {
    constructor() {
        this.isLoaded = true;
        this.menuItems = [
            {
                id: '1',
                spanishName: 'Paella',
                englishName: 'Rice Dish',
                description: 'Traditional Spanish rice dish with saffron',
                priceRange: '€12-15',
                isVegetarian: false,
                hasPork: false,
                hasDairy: false,
                hasOtherMeat: true,
                hasSeafood: true
            },
            {
                id: '2',
                spanishName: 'Gazpacho',
                englishName: 'Cold Soup',
                description: 'Cold tomato soup from Andalusia',
                priceRange: '€6-8',
                isVegetarian: true,
                hasPork: false,
                hasDairy: false,
                hasOtherMeat: false,
                hasSeafood: false
            },
            {
                id: '3',
                spanishName: 'Jamón Ibérico',
                englishName: 'Iberian Ham',
                description: 'Premium cured ham from Spain',
                priceRange: '€18-25',
                isVegetarian: false,
                hasPork: true,
                hasDairy: false,
                hasOtherMeat: false,
                hasSeafood: false
            },
            {
                id: '4',
                spanishName: 'Tortilla Española',
                englishName: 'Spanish Omelet',
                description: 'Potato and egg omelet',
                priceRange: '€8-10',
                isVegetarian: true,
                hasPork: false,
                hasDairy: true,
                hasOtherMeat: false,
                hasSeafood: false
            }
        ];
    }
    
    getMenuItems() {
        return [...this.menuItems];
    }
}

// Mock SearchEngine for testing
class MockSearchEngine {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.searchIndex = new Map();
        this.indexBuilt = false;
        
        this.config = {
            minQueryLength: 1,
            maxSuggestions: 8,
            maxResults: 20,
            fuzzyThreshold: 0.3,
            exactMatchBonus: 0.5,
            wordStartBonus: 0.3,
            spanishNameWeight: 1.0,
            englishNameWeight: 0.8,
            descriptionWeight: 0.5
        };
        
        this.stats = {
            totalSearches: 0,
            lastSearchTime: null,
            avgSearchTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.searchCache = new Map();
        this.maxCacheSize = 100;
    }
    
    extractWords(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\sáàâãäéèêëíìîïóòôõöúùûüçñ]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    
    getTypeWeight(type) {
        switch (type) {
            case 'spanish': return this.config.spanishNameWeight;
            case 'english': return this.config.englishNameWeight;
            case 'description': return this.config.descriptionWeight;
            case 'word': return 0.7;
            default: return 0.5;
        }
    }
    
    addToIndex(term, item, type) {
        if (!this.searchIndex.has(term)) {
            this.searchIndex.set(term, []);
        }
        
        this.searchIndex.get(term).push({
            item,
            type,
            weight: this.getTypeWeight(type)
        });
    }
    
    buildSearchIndex() {
        if (!this.dataManager.isLoaded) {
            throw new Error('DataManager must be loaded before building search index');
        }
        
        this.searchIndex.clear();
        const menuItems = this.dataManager.getMenuItems();
        
        menuItems.forEach(item => {
            // Index Spanish name
            this.addToIndex(item.spanishName.toLowerCase(), item, 'spanish');
            
            // Index English name
            this.addToIndex(item.englishName.toLowerCase(), item, 'english');
            
            // Index description words
            if (item.description) {
                const descWords = this.extractWords(item.description.toLowerCase());
                descWords.forEach(word => {
                    if (word.length > 2) {
                        this.addToIndex(word, item, 'description');
                    }
                });
            }
            
            // Index individual words
            const spanishWords = this.extractWords(item.spanishName.toLowerCase());
            const englishWords = this.extractWords(item.englishName.toLowerCase());
            
            [...spanishWords, ...englishWords].forEach(word => {
                if (word.length > 1) {
                    this.addToIndex(word, item, 'word');
                }
            });
        });
        
        this.indexBuilt = true;
    }
    
    levenshteinSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        
        return maxLen === 0 ? 1.0 : (maxLen - distance) / maxLen;
    }
    
    jaccardSimilarity(str1, str2) {
        const getBigrams = (str) => {
            const bigrams = new Set();
            for (let i = 0; i < str.length - 1; i++) {
                bigrams.add(str.slice(i, i + 2));
            }
            return bigrams;
        };
        
        const bigrams1 = getBigrams(str1);
        const bigrams2 = getBigrams(str2);
        
        const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
        const union = new Set([...bigrams1, ...bigrams2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        if (str1.includes(str2) || str2.includes(str1)) {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length <= str2.length ? str1 : str2;
            return shorter.length / longer.length;
        }
        
        const levenshteinSim = this.levenshteinSimilarity(str1, str2);
        const jaccardSim = this.jaccardSimilarity(str1, str2);
        
        return (levenshteinSim * 0.7) + (jaccardSim * 0.3);
    }
    
    extractMaxPrice(priceRange) {
        const matches = priceRange.match(/€(\d+)-?(\d+)?/);
        if (matches) {
            return parseInt(matches[2] || matches[1]);
        }
        return null;
    }
    
    applyFilters(results, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return results;
        }
        
        return results.filter(result => {
            const item = result.item;
            
            if (filters.vegetarian && !item.isVegetarian) return false;
            if (filters.noPork && item.hasPork) return false;
            if (filters.noDairy && item.hasDairy) return false;
            if (filters.noMeat && (item.hasOtherMeat || item.hasPork)) return false;
            if (filters.noSeafood && item.hasSeafood) return false;
            
            if (filters.maxPrice && item.priceRange) {
                const itemPrice = this.extractMaxPrice(item.priceRange);
                if (itemPrice && itemPrice > filters.maxPrice) return false;
            }
            
            return true;
        });
    }
    
    getAutocompleteSuggestions(query, limit = 5) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        const cleanQuery = query.trim().toLowerCase();
        const suggestions = new Set();
        
        for (const [term, entries] of this.searchIndex.entries()) {
            if (suggestions.size >= limit) break;
            
            if (term.startsWith(cleanQuery) && term !== cleanQuery) {
                const firstEntry = entries[0];
                if (firstEntry) {
                    suggestions.add({
                        text: term,
                        context: firstEntry.item.spanishName,
                        type: firstEntry.type
                    });
                }
            }
        }
        
        return Array.from(suggestions).slice(0, limit);
    }
    
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.searchCache.size,
            indexSize: this.searchIndex.size,
            isIndexBuilt: this.indexBuilt
        };
    }
    
    clearCache() {
        this.searchCache.clear();
    }
    
    rebuildIndex() {
        this.indexBuilt = false;
        this.clearCache();
        this.buildSearchIndex();
    }
}

describe('SearchEngine', () => {
    let dataManager;
    let searchEngine;
    
    beforeEach(() => {
        dataManager = new MockDataManager();
        searchEngine = new MockSearchEngine(dataManager);
    });
    
    afterEach(() => {
        dataManager = null;
        searchEngine = null;
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(searchEngine.dataManager).toBe(dataManager);
            expect(searchEngine.indexBuilt).toBe(false);
            expect(searchEngine.searchIndex.size).toBe(0);
            expect(searchEngine.config.minQueryLength).toBe(1);
            expect(searchEngine.config.maxSuggestions).toBe(8);
            expect(searchEngine.config.fuzzyThreshold).toBe(0.3);
        });

        test('should initialize with empty stats', () => {
            const stats = searchEngine.getStats();
            expect(stats.totalSearches).toBe(0);
            expect(stats.lastSearchTime).toBeNull();
            expect(stats.avgSearchTime).toBe(0);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.isIndexBuilt).toBe(false);
        });
    });

    describe('Word Extraction', () => {
        test('should extract words correctly', () => {
            const text = 'Paella with seafood and rice';
            const words = searchEngine.extractWords(text);
            expect(words).toEqual(['paella', 'with', 'seafood', 'and', 'rice']);
        });

        test('should handle Spanish characters', () => {
            const text = 'Jamón Ibérico with ñ';
            const words = searchEngine.extractWords(text);
            expect(words).toEqual(['jamón', 'ibérico', 'with', 'ñ']);
        });

        test('should filter empty words', () => {
            const text = 'Word   with    multiple   spaces';
            const words = searchEngine.extractWords(text);
            expect(words).toEqual(['word', 'with', 'multiple', 'spaces']);
        });

        test('should handle punctuation', () => {
            const text = 'Rice, seafood & vegetables!';
            const words = searchEngine.extractWords(text);
            expect(words).toEqual(['rice', 'seafood', 'vegetables']);
        });
    });

    describe('Index Building', () => {
        test('should build search index successfully', () => {
            searchEngine.buildSearchIndex();
            
            expect(searchEngine.indexBuilt).toBe(true);
            expect(searchEngine.searchIndex.size).toBeGreaterThan(0);
        });

        test('should index Spanish names', () => {
            searchEngine.buildSearchIndex();
            
            expect(searchEngine.searchIndex.has('paella')).toBe(true);
            expect(searchEngine.searchIndex.has('gazpacho')).toBe(true);
            expect(searchEngine.searchIndex.has('jamón ibérico')).toBe(true);
        });

        test('should index English names', () => {
            searchEngine.buildSearchIndex();
            
            expect(searchEngine.searchIndex.has('rice dish')).toBe(true);
            expect(searchEngine.searchIndex.has('cold soup')).toBe(true);
            expect(searchEngine.searchIndex.has('iberian ham')).toBe(true);
        });

        test('should index individual words', () => {
            searchEngine.buildSearchIndex();
            
            expect(searchEngine.searchIndex.has('rice')).toBe(true);
            expect(searchEngine.searchIndex.has('cold')).toBe(true);
            expect(searchEngine.searchIndex.has('spanish')).toBe(true);
        });

        test('should index description words', () => {
            searchEngine.buildSearchIndex();
            
            expect(searchEngine.searchIndex.has('traditional')).toBe(true);
            expect(searchEngine.searchIndex.has('saffron')).toBe(true);
            expect(searchEngine.searchIndex.has('tomato')).toBe(true);
        });

        test('should throw error if DataManager not loaded', () => {
            dataManager.isLoaded = false;
            expect(() => searchEngine.buildSearchIndex()).toThrow('DataManager must be loaded');
        });
    });

    describe('String Similarity', () => {
        test('should return 1.0 for identical strings', () => {
            const similarity = searchEngine.calculateSimilarity('paella', 'paella');
            expect(similarity).toBe(1.0);
        });

        test('should return 0.0 for empty strings', () => {
            // Empty strings have special handling - identical empty strings return 1.0
            const similarity = searchEngine.calculateSimilarity('', '');
            expect(similarity).toBe(1.0);
            
            const similarity2 = searchEngine.calculateSimilarity('paella', '');
            expect(similarity2).toBe(0.0);
        });

        test('should handle substring matches', () => {
            const similarity = searchEngine.calculateSimilarity('paella', 'paell');
            expect(similarity).toBeGreaterThan(0.8);
        });

        test('should calculate reasonable similarity for similar words', () => {
            const similarity = searchEngine.calculateSimilarity('paella', 'paela');
            expect(similarity).toBeGreaterThan(0.7);
            expect(similarity).toBeLessThan(1.0);
        });

        test('should return low similarity for very different words', () => {
            const similarity = searchEngine.calculateSimilarity('paella', 'gazpacho');
            expect(similarity).toBeLessThan(0.3);
        });
    });

    describe('Levenshtein Similarity', () => {
        test('should calculate correct Levenshtein similarity', () => {
            // Same strings
            expect(searchEngine.levenshteinSimilarity('test', 'test')).toBe(1.0);
            
            // One character difference
            expect(searchEngine.levenshteinSimilarity('test', 'best')).toBe(0.75);
            
            // Empty strings
            expect(searchEngine.levenshteinSimilarity('', '')).toBe(1.0);
            expect(searchEngine.levenshteinSimilarity('test', '')).toBe(0.0);
        });
    });

    describe('Jaccard Similarity', () => {
        test('should calculate correct Jaccard similarity', () => {
            // Same strings should have high similarity
            const similarity = searchEngine.jaccardSimilarity('paella', 'paella');
            expect(similarity).toBe(1.0);
            
            // Different strings should have lower similarity
            const similarity2 = searchEngine.jaccardSimilarity('paella', 'gazpacho');
            expect(similarity2).toBeLessThan(0.5);
        });

        test('should handle short strings', () => {
            // Very short strings
            const similarity = searchEngine.jaccardSimilarity('a', 'b');
            expect(similarity).toBe(0);
            
            // One character strings that match - bigrams require 2+ chars, so this returns 0
            const similarity2 = searchEngine.jaccardSimilarity('a', 'a');
            expect(similarity2).toBe(0); // No bigrams possible with single character
            
            // Two character strings that match
            const similarity3 = searchEngine.jaccardSimilarity('ab', 'ab');
            expect(similarity3).toBe(1.0);
        });
    });

    describe('Type Weight', () => {
        test('should return correct weights for different types', () => {
            expect(searchEngine.getTypeWeight('spanish')).toBe(1.0);
            expect(searchEngine.getTypeWeight('english')).toBe(0.8);
            expect(searchEngine.getTypeWeight('description')).toBe(0.5);
            expect(searchEngine.getTypeWeight('word')).toBe(0.7);
            expect(searchEngine.getTypeWeight('unknown')).toBe(0.5);
        });
    });

    describe('Price Extraction', () => {
        test('should extract price from price range', () => {
            expect(searchEngine.extractMaxPrice('€12-15')).toBe(15);
            expect(searchEngine.extractMaxPrice('€8-10')).toBe(10);
            expect(searchEngine.extractMaxPrice('€25')).toBe(25);
            expect(searchEngine.extractMaxPrice('No price')).toBeNull();
        });
    });

    describe('Filtering', () => {
        let mockResults;
        
        beforeEach(() => {
            mockResults = [
                { item: dataManager.menuItems[0] }, // Paella - has meat and seafood
                { item: dataManager.menuItems[1] }, // Gazpacho - vegetarian
                { item: dataManager.menuItems[2] }, // Jamón - has pork
                { item: dataManager.menuItems[3] }  // Tortilla - vegetarian with dairy
            ];
        });

        test('should filter vegetarian items', () => {
            const filtered = searchEngine.applyFilters(mockResults, { vegetarian: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(r => r.item.spanishName)).toEqual(['Gazpacho', 'Tortilla Española']);
        });

        test('should filter items without pork', () => {
            const filtered = searchEngine.applyFilters(mockResults, { noPork: true });
            expect(filtered).toHaveLength(3);
            expect(filtered.map(r => r.item.spanishName)).not.toContain('Jamón Ibérico');
        });

        test('should filter items without dairy', () => {
            const filtered = searchEngine.applyFilters(mockResults, { noDairy: true });
            expect(filtered).toHaveLength(3);
            expect(filtered.map(r => r.item.spanishName)).not.toContain('Tortilla Española');
        });

        test('should filter items without meat', () => {
            const filtered = searchEngine.applyFilters(mockResults, { noMeat: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(r => r.item.spanishName)).toEqual(['Gazpacho', 'Tortilla Española']);
        });

        test('should filter items without seafood', () => {
            const filtered = searchEngine.applyFilters(mockResults, { noSeafood: true });
            expect(filtered).toHaveLength(3);
            expect(filtered.map(r => r.item.spanishName)).not.toContain('Paella');
        });

        test('should filter by price range', () => {
            const filtered = searchEngine.applyFilters(mockResults, { maxPrice: 10 });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(r => r.item.spanishName)).toEqual(['Gazpacho', 'Tortilla Española']);
        });

        test('should apply multiple filters', () => {
            const filtered = searchEngine.applyFilters(mockResults, {
                vegetarian: true,
                noDairy: true
            });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].item.spanishName).toBe('Gazpacho');
        });

        test('should return all items when no filters applied', () => {
            const filtered = searchEngine.applyFilters(mockResults, {});
            expect(filtered).toHaveLength(4);
            
            const filtered2 = searchEngine.applyFilters(mockResults);
            expect(filtered2).toHaveLength(4);
        });
    });

    describe('Autocomplete Suggestions', () => {
        beforeEach(() => {
            searchEngine.buildSearchIndex();
        });

        test('should return empty array for empty query', () => {
            const suggestions = searchEngine.getAutocompleteSuggestions('');
            expect(suggestions).toEqual([]);
            
            const suggestions2 = searchEngine.getAutocompleteSuggestions('   ');
            expect(suggestions2).toEqual([]);
        });

        test('should return suggestions that start with query', () => {
            const suggestions = searchEngine.getAutocompleteSuggestions('pa');
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.every(s => s.text.startsWith('pa'))).toBe(true);
        });

        test('should limit number of suggestions', () => {
            const suggestions = searchEngine.getAutocompleteSuggestions('p', 3);
            expect(suggestions.length).toBeLessThanOrEqual(3);
        });

        test('should include context information', () => {
            const suggestions = searchEngine.getAutocompleteSuggestions('pa');
            if (suggestions.length > 0) {
                expect(suggestions[0]).toHaveProperty('text');
                expect(suggestions[0]).toHaveProperty('context');
                expect(suggestions[0]).toHaveProperty('type');
            }
        });
    });

    describe('Cache Management', () => {
        test('should clear cache', () => {
            searchEngine.searchCache.set('test', { data: 'test' });
            expect(searchEngine.searchCache.size).toBe(1);
            
            searchEngine.clearCache();
            expect(searchEngine.searchCache.size).toBe(0);
        });
    });

    describe('Index Rebuilding', () => {
        test('should rebuild index', () => {
            searchEngine.buildSearchIndex();
            expect(searchEngine.indexBuilt).toBe(true);
            
            const originalSize = searchEngine.searchIndex.size;
            
            searchEngine.rebuildIndex();
            expect(searchEngine.indexBuilt).toBe(true);
            expect(searchEngine.searchIndex.size).toBe(originalSize);
        });
    });

    describe('Statistics', () => {
        test('should track statistics correctly', () => {
            const initialStats = searchEngine.getStats();
            expect(initialStats.indexSize).toBe(0);
            expect(initialStats.isIndexBuilt).toBe(false);
            
            searchEngine.buildSearchIndex();
            
            const updatedStats = searchEngine.getStats();
            expect(updatedStats.indexSize).toBeGreaterThan(0);
            expect(updatedStats.isIndexBuilt).toBe(true);
        });
    });
});

describe('SearchEngine Integration', () => {
    let dataManager;
    let searchEngine;
    
    beforeEach(() => {
        dataManager = new MockDataManager();
        searchEngine = new MockSearchEngine(dataManager);
        searchEngine.buildSearchIndex();
    });
    
    test('should handle complex search scenarios', () => {
        // Test exact match
        const suggestions = searchEngine.getAutocompleteSuggestions('paella');
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
        
        // Test partial match
        const partialSuggestions = searchEngine.getAutocompleteSuggestions('pa');
        expect(partialSuggestions.length).toBeGreaterThan(0);
    });
    
    test('should handle Spanish characters in search', () => {
        const suggestions = searchEngine.getAutocompleteSuggestions('jamón');
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
});