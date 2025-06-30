/**
 * Search Engine Module
 * Implements fuzzy string matching and auto-suggest functionality
 */

export class SearchEngine {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.searchIndex = new Map();
        this.indexBuilt = false;
        
        // Search configuration
        this.config = {
            minQueryLength: 1,
            maxSuggestions: 8,
            maxResults: 20,
            fuzzyThreshold: 0.3, // Minimum similarity score (0-1)
            exactMatchBonus: 0.5, // Bonus for exact matches
            wordStartBonus: 0.3, // Bonus for matching word starts
            spanishNameWeight: 1.0, // Weight for Spanish name matches
            englishNameWeight: 0.8, // Weight for English name matches
            descriptionWeight: 0.5 // Weight for description matches
        };
        
        // Search statistics
        this.stats = {
            totalSearches: 0,
            lastSearchTime: null,
            avgSearchTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Simple cache for search results
        this.searchCache = new Map();
        this.maxCacheSize = 100;
    }
    
    /**
     * Build search index from menu data
     */
    buildSearchIndex() {
        console.log('🔍 Building search index...');
        const startTime = performance.now();
        
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
                    if (word.length > 2) { // Skip very short words
                        this.addToIndex(word, item, 'description');
                    }
                });
            }
            
            // Index individual words from Spanish and English names
            const spanishWords = this.extractWords(item.spanishName.toLowerCase());
            const englishWords = this.extractWords(item.englishName.toLowerCase());
            
            [...spanishWords, ...englishWords].forEach(word => {
                if (word.length > 1) {
                    this.addToIndex(word, item, 'word');
                }
            });
        });
        
        this.indexBuilt = true;
        const buildTime = performance.now() - startTime;
        
        console.log(`✅ Search index built in ${buildTime.toFixed(2)}ms`);
        console.log(`📊 Index contains ${this.searchIndex.size} unique terms`);
    }
    
    /**
     * Add item to search index
     */
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
    
    /**
     * Get weight for different match types
     */
    getTypeWeight(type) {
        switch (type) {
            case 'spanish': return this.config.spanishNameWeight;
            case 'english': return this.config.englishNameWeight;
            case 'description': return this.config.descriptionWeight;
            case 'word': return 0.7;
            default: return 0.5;
        }
    }
    
    /**
     * Extract words from text
     */
    extractWords(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\sáàâãäéèêëíìîïóòôõöúùûüçñ]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    
    /**
     * Main search function
     */
    search(query, filters = {}) {
        const startTime = performance.now();
        this.stats.totalSearches++;
        
        if (!this.indexBuilt) {
            this.buildSearchIndex();
        }
        
        if (!query || query.trim().length < this.config.minQueryLength) {
            return {
                results: [],
                suggestions: [],
                query: query,
                totalMatches: 0,
                searchTime: 0
            };
        }
        
        const cleanQuery = query.trim().toLowerCase();
        
        // Check cache first
        const cacheKey = this.getCacheKey(cleanQuery, filters);
        if (this.searchCache.has(cacheKey)) {
            this.stats.cacheHits++;
            const cached = this.searchCache.get(cacheKey);
            return {
                ...cached,
                searchTime: performance.now() - startTime
            };
        }
        
        this.stats.cacheMisses++;
        
        // Perform search
        const matches = this.findMatches(cleanQuery);
        const scoredResults = this.scoreAndRankResults(matches, cleanQuery);
        const filteredResults = this.applyFilters(scoredResults, filters);
        const finalResults = filteredResults.slice(0, this.config.maxResults);
        
        // Generate suggestions
        const suggestions = this.generateSuggestions(cleanQuery, matches);
        
        const searchTime = performance.now() - startTime;
        this.updateSearchStats(searchTime);
        
        const result = {
            results: finalResults,
            suggestions: suggestions,
            query: query,
            totalMatches: filteredResults.length,
            searchTime: searchTime
        };
        
        // Cache the result
        this.cacheResult(cacheKey, result);
        
        return result;
    }
    
    /**
     * Find potential matches using fuzzy search
     */
    findMatches(query) {
        const matches = new Map(); // Use Map to avoid duplicates
        const queryWords = this.extractWords(query);
        
        // Direct term matches
        for (const [term, entries] of this.searchIndex.entries()) {
            const similarity = this.calculateSimilarity(query, term);
            
            if (similarity >= this.config.fuzzyThreshold) {
                entries.forEach(entry => {
                    const key = entry.item.id;
                    if (!matches.has(key)) {
                        matches.set(key, {
                            item: entry.item,
                            scores: []
                        });
                    }
                    
                    matches.get(key).scores.push({
                        similarity,
                        type: entry.type,
                        weight: entry.weight,
                        matchedTerm: term,
                        isExact: term === query,
                        isWordStart: term.startsWith(query) || query.startsWith(term)
                    });
                });
            }
        }
        
        // Multi-word query matching
        if (queryWords.length > 1) {
            queryWords.forEach(word => {
                for (const [term, entries] of this.searchIndex.entries()) {
                    const similarity = this.calculateSimilarity(word, term);
                    
                    if (similarity >= this.config.fuzzyThreshold) {
                        entries.forEach(entry => {
                            const key = entry.item.id;
                            if (!matches.has(key)) {
                                matches.set(key, {
                                    item: entry.item,
                                    scores: []
                                });
                            }
                            
                            matches.get(key).scores.push({
                                similarity: similarity * 0.8, // Slight penalty for partial word matches
                                type: entry.type,
                                weight: entry.weight,
                                matchedTerm: term,
                                isExact: term === word,
                                isWordStart: term.startsWith(word) || word.startsWith(term),
                                isPartialWord: true
                            });
                        });
                    }
                }
            });
        }
        
        return Array.from(matches.values());
    }
    
    /**
     * Calculate string similarity using a combination of algorithms
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        // Exact substring match gets high score
        if (str1.includes(str2) || str2.includes(str1)) {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length <= str2.length ? str1 : str2;
            return shorter.length / longer.length;
        }
        
        // Levenshtein distance based similarity
        const levenshteinSim = this.levenshteinSimilarity(str1, str2);
        
        // Jaccard similarity for character n-grams
        const jaccardSim = this.jaccardSimilarity(str1, str2);
        
        // Combine similarities with weights
        return (levenshteinSim * 0.7) + (jaccardSim * 0.3);
    }
    
    /**
     * Calculate Levenshtein distance based similarity
     */
    levenshteinSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        // Initialize matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // deletion
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        
        return maxLen === 0 ? 1.0 : (maxLen - distance) / maxLen;
    }
    
    /**
     * Calculate Jaccard similarity using character bigrams
     */
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
    
    /**
     * Score and rank search results
     */
    scoreAndRankResults(matches, query) {
        return matches.map(match => {
            let totalScore = 0;
            let maxScore = 0;
            let bestType = '';
            
            // Calculate composite score from all matches
            match.scores.forEach(score => {
                let adjustedScore = score.similarity * score.weight;
                
                // Apply bonuses
                if (score.isExact) {
                    adjustedScore += this.config.exactMatchBonus;
                }
                if (score.isWordStart) {
                    adjustedScore += this.config.wordStartBonus;
                }
                
                // Penalty for partial word matches
                if (score.isPartialWord) {
                    adjustedScore *= 0.9;
                }
                
                totalScore += adjustedScore;
                
                if (adjustedScore > maxScore) {
                    maxScore = adjustedScore;
                    bestType = score.type;
                }
            });
            
            // Normalize score by number of matches (prevent gaming with many weak matches)
            const normalizedScore = totalScore / Math.sqrt(match.scores.length);
            
            return {
                item: match.item,
                score: normalizedScore,
                maxScore: maxScore,
                bestMatchType: bestType,
                matchCount: match.scores.length,
                matchDetails: match.scores
            };
        }).sort((a, b) => b.score - a.score);
    }
    
    /**
     * Apply dietary and other filters to results
     */
    applyFilters(results, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return results;
        }
        
        return results.filter(result => {
            const item = result.item;
            
            // Dietary filters
            if (filters.vegetarian && !item.isVegetarian) return false;
            if (filters.noPork && item.hasPork) return false;
            if (filters.noDairy && item.hasDairy) return false;
            if (filters.noMeat && (item.hasOtherMeat || item.hasPork)) return false;
            if (filters.noSeafood && item.hasSeafood) return false;
            
            // Price range filter
            if (filters.maxPrice && item.priceRange) {
                const itemPrice = this.extractMaxPrice(item.priceRange);
                if (itemPrice && itemPrice > filters.maxPrice) return false;
            }
            
            return true;
        });
    }
    
    /**
     * Extract maximum price from price range string
     */
    extractMaxPrice(priceRange) {
        const matches = priceRange.match(/€(\d+)-?(\d+)?/);
        if (matches) {
            return parseInt(matches[2] || matches[1]);
        }
        return null;
    }
    
    /**
     * Generate search suggestions
     */
    generateSuggestions(query, matches) {
        const suggestions = new Set();
        const queryWords = this.extractWords(query);
        
        // Get suggestions from index terms
        for (const [term, entries] of this.searchIndex.entries()) {
            if (suggestions.size >= this.config.maxSuggestions) break;
            
            // Skip if term is too short or exactly matches query
            if (term.length < 2 || term === query) continue;
            
            // Check if term starts with query or any query word
            const startsWithQuery = term.startsWith(query) || 
                queryWords.some(word => term.startsWith(word));
            
            if (startsWithQuery) {
                suggestions.add(term);
                continue;
            }
            
            // Check similarity for fuzzy suggestions
            const similarity = this.calculateSimilarity(query, term);
            if (similarity >= this.config.fuzzyThreshold + 0.2) { // Higher threshold for suggestions
                suggestions.add(term);
            }
        }
        
        // Get suggestions from actual matches
        matches.slice(0, 3).forEach(match => {
            if (suggestions.size >= this.config.maxSuggestions) return;
            
            suggestions.add(match.item.spanishName.toLowerCase());
            suggestions.add(match.item.englishName.toLowerCase());
        });
        
        return Array.from(suggestions)
            .slice(0, this.config.maxSuggestions)
            .sort((a, b) => {
                // Prioritize terms that start with the query
                const aStarts = a.startsWith(query);
                const bStarts = b.startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.length - b.length; // Shorter terms first
            });
    }
    
    /**
     * Get cache key for result caching
     */
    getCacheKey(query, filters) {
        const filterStr = JSON.stringify(filters);
        return `${query}|${filterStr}`;
    }
    
    /**
     * Cache search result
     */
    cacheResult(key, result) {
        // Remove oldest entries if cache is full
        if (this.searchCache.size >= this.maxCacheSize) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        this.searchCache.set(key, {
            results: result.results,
            suggestions: result.suggestions,
            query: result.query,
            totalMatches: result.totalMatches,
            cachedAt: Date.now()
        });
    }
    
    /**
     * Update search statistics
     */
    updateSearchStats(searchTime) {
        this.stats.lastSearchTime = searchTime;
        this.stats.avgSearchTime = (
            (this.stats.avgSearchTime * (this.stats.totalSearches - 1)) + searchTime
        ) / this.stats.totalSearches;
    }
    
    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
        console.log('🗑️ Search cache cleared');
    }
    
    /**
     * Get search statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.searchCache.size,
            indexSize: this.searchIndex.size,
            isIndexBuilt: this.indexBuilt
        };
    }
    
    /**
     * Rebuild index (useful for data updates)
     */
    rebuildIndex() {
        console.log('🔄 Rebuilding search index...');
        this.indexBuilt = false;
        this.clearCache();
        this.buildSearchIndex();
    }
    
    /**
     * Get autocomplete suggestions (faster, simpler version)
     */
    getAutocompleteSuggestions(query, limit = 5) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        const cleanQuery = query.trim().toLowerCase();
        const suggestions = new Set();
        
        // Quick lookup for terms that start with the query
        for (const [term, entries] of this.searchIndex.entries()) {
            if (suggestions.size >= limit) break;
            
            if (term.startsWith(cleanQuery) && term !== cleanQuery) {
                // Get the first item that matches to show context
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
}

// Export for browser environments
if (typeof window !== 'undefined') {
    window.SearchEngine = SearchEngine;
}

console.log('🔍 SearchEngine module loaded');