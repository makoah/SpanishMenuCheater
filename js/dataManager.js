/**
 * Data Manager Module
 * Handles CSV parsing, data validation, and menu item management
 */

export class DataManager {
    constructor() {
        this.menuItems = [];
        this.isLoaded = false;
        this.dataSource = 'data/spanish_menu_items.csv';
        this.version = '1.0.0';
        this.lastUpdated = null;
        
        // Data validation rules
        this.requiredFields = [
            'Spanish Name',
            'English Translation',
            'Dutch Translation',
            'Description',
            'Dutch Description',
            'Price Range',
            'Pork',
            'Other Meat',
            'Fish/Seafood',
            'Dairy',
            'Vegetarian'
        ];
        
        // Statistics
        this.stats = {
            totalItems: 0,
            vegetarianItems: 0,
            porkItems: 0,
            dairyItems: 0,
            meatItems: 0,
            seafoodItems: 0,
            validItems: 0,
            invalidItems: 0
        };
    }
    
    /**
     * Load and parse menu data from CSV
     */
    async loadMenuData() {
        try {
            console.log('📊 Loading menu data from CSV...');
            
            const csvData = await this.fetchCSVData();
            const parsedData = this.parseCSVData(csvData);
            const validatedData = this.validateMenuData(parsedData);
            
            this.menuItems = validatedData;
            this.isLoaded = true;
            this.lastUpdated = new Date();
            this.calculateStats();
            
            console.log(`✅ Successfully loaded ${this.menuItems.length} menu items`);
            console.log('📈 Data statistics:', this.stats);
            
            return this.menuItems;
            
        } catch (error) {
            console.error('❌ Failed to load menu data:', error);
            throw new Error(`Data loading failed: ${error.message}`);
        }
    }
    
    /**
     * Fetch CSV data from file
     */
    async fetchCSVData() {
        try {
            const response = await fetch(this.dataSource);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText || csvText.trim().length === 0) {
                throw new Error('CSV file is empty');
            }
            
            return csvText;
            
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Failed to fetch CSV data - network error or file not found');
            }
            throw error;
        }
    }
    
    /**
     * Parse CSV data into structured objects
     */
    parseCSVData(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            
            if (lines.length === 0) {
                throw new Error('CSV file has no content');
            }
            
            // Parse header row
            const headers = this.parseCSVLine(lines[0]);
            
            if (headers.length === 0) {
                throw new Error('CSV file has no headers');
            }
            
            // Validate required headers
            const missingHeaders = this.requiredFields.filter(field => 
                !headers.includes(field)
            );
            
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
            }
            
            // Parse data rows
            const menuItems = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Skip empty lines
                if (!line) continue;
                
                try {
                    const values = this.parseCSVLine(line);
                    
                    if (values.length !== headers.length) {
                        console.warn(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
                        continue;
                    }
                    
                    // Create menu item object
                    const menuItem = {};
                    headers.forEach((header, index) => {
                        menuItem[header] = values[index] || '';
                    });
                    
                    // Add metadata
                    menuItem._rowNumber = i + 1;
                    menuItem._id = this.generateItemId(menuItem);
                    
                    menuItems.push(menuItem);
                    
                } catch (rowError) {
                    console.warn(`Row ${i + 1}: Parse error - ${rowError.message}`);
                    continue;
                }
            }
            
            console.log(`📋 Parsed ${menuItems.length} items from ${lines.length - 1} CSV rows`);
            return menuItems;
            
        } catch (error) {
            throw new Error(`CSV parsing failed: ${error.message}`);
        }
    }
    
    /**
     * Parse a single CSV line handling quotes and commas
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let quoteCount = 0;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                quoteCount++;
                if (inQuotes && line[i + 1] === '"') {
                    // Handle escaped quotes
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }
    
    /**
     * Validate menu data and clean up items
     */
    validateMenuData(rawItems) {
        const validItems = [];
        let validCount = 0;
        let invalidCount = 0;
        
        for (const item of rawItems) {
            try {
                const validatedItem = this.validateMenuItem(item);
                if (validatedItem) {
                    validItems.push(validatedItem);
                    validCount++;
                } else {
                    invalidCount++;
                }
            } catch (error) {
                console.warn(`Validation failed for item "${item['Spanish Name'] || 'unknown'}": ${error.message}`);
                invalidCount++;
            }
        }
        
        console.log(`✅ Validated ${validCount} items, ${invalidCount} items failed validation`);
        return validItems;
    }
    
    /**
     * Validate and clean a single menu item
     */
    validateMenuItem(item) {
        // Check required fields
        if (!item['Spanish Name'] || !item['English Translation']) {
            return null; // Skip items without essential fields
        }
        
        // Clean and normalize the item
        const cleanItem = {
            // Core information
            spanishName: this.cleanString(item['Spanish Name']),
            englishName: this.cleanString(item['English Translation']),
            dutchName: this.cleanString(item['Dutch Translation'] || item['English Translation']), // Fallback to English if Dutch missing
            description: this.cleanString(item['Description'] || ''),
            dutchDescription: this.cleanString(item['Dutch Description'] || item['Description'] || ''), // Fallback to English description
            priceRange: this.cleanString(item['Price Range'] || ''),
            
            // Dietary information (convert to boolean)
            hasPork: this.parseBoolean(item['Pork']),
            hasOtherMeat: this.parseBoolean(item['Other Meat']),
            hasSeafood: this.parseBoolean(item['Fish/Seafood']),
            hasDairy: this.parseBoolean(item['Dairy']),
            isVegetarian: this.parseBoolean(item['Vegetarian']),
            
            // Additional data
            googleSearchUrl: item['Google Search'] || '',
            
            // Metadata
            id: item._id,
            rowNumber: item._rowNumber,
            lastUpdated: new Date().toISOString()
        };
        
        // Additional validation
        if (cleanItem.spanishName.length === 0 || cleanItem.englishName.length === 0) {
            return null;
        }
        
        // Logical validation - vegetarian items shouldn't have meat
        if (cleanItem.isVegetarian && (cleanItem.hasPork || cleanItem.hasOtherMeat || cleanItem.hasSeafood)) {
            console.warn(`Item "${cleanItem.spanishName}" marked as vegetarian but contains meat/seafood`);
        }
        
        return cleanItem;
    }
    
    /**
     * Generate unique ID for menu item
     */
    generateItemId(item) {
        const spanishName = item['Spanish Name'] || '';
        const englishName = item['English Translation'] || '';
        const combined = (spanishName + englishName).toLowerCase();
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Clean and normalize string values
     */
    cleanString(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[""]/g, '"') // Normalize quotes
            .replace(/['']/g, "'"); // Normalize apostrophes
    }
    
    /**
     * Parse boolean values from CSV
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value !== 'string') return false;
        
        const cleaned = value.toLowerCase().trim();
        return cleaned === 'true' || cleaned === '1' || cleaned === 'yes' || cleaned === 'y';
    }
    
    /**
     * Calculate statistics about the dataset
     */
    calculateStats() {
        this.stats = {
            totalItems: this.menuItems.length,
            vegetarianItems: this.menuItems.filter(item => item.isVegetarian).length,
            porkItems: this.menuItems.filter(item => item.hasPork).length,
            dairyItems: this.menuItems.filter(item => item.hasDairy).length,
            meatItems: this.menuItems.filter(item => item.hasOtherMeat).length,
            seafoodItems: this.menuItems.filter(item => item.hasSeafood).length,
            validItems: this.menuItems.length,
            invalidItems: 0 // Set during validation
        };
    }
    
    /**
     * Get all menu items
     */
    getMenuItems() {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        return [...this.menuItems]; // Return copy to prevent mutation
    }
    
    /**
     * Get menu item by ID
     */
    getMenuItem(id) {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        return this.menuItems.find(item => item.id === id) || null;
    }
    
    /**
     * Filter menu items by dietary requirements
     */
    filterByDietary(filters = {}) {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        
        let filtered = [...this.menuItems];
        
        if (filters.vegetarian === true) {
            filtered = filtered.filter(item => item.isVegetarian);
        }
        
        if (filters.noPork === true) {
            filtered = filtered.filter(item => !item.hasPork);
        }
        
        if (filters.noDairy === true) {
            filtered = filtered.filter(item => !item.hasDairy);
        }
        
        if (filters.noMeat === true) {
            filtered = filtered.filter(item => !item.hasOtherMeat && !item.hasPork);
        }
        
        if (filters.noSeafood === true) {
            filtered = filtered.filter(item => !item.hasSeafood);
        }
        
        return filtered;
    }
    
    /**
     * Get data statistics
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Get data source information
     */
    getDataInfo() {
        return {
            source: this.dataSource,
            version: this.version,
            lastUpdated: this.lastUpdated,
            isLoaded: this.isLoaded,
            itemCount: this.menuItems.length
        };
    }
    
    /**
     * Refresh data (reload from source)
     */
    async refreshData() {
        console.log('🔄 Refreshing menu data...');
        this.menuItems = [];
        this.isLoaded = false;
        this.stats = {};
        
        return await this.loadMenuData();
    }
    
    /**
     * Export menu data as JSON
     */
    exportData() {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        
        return {
            metadata: this.getDataInfo(),
            statistics: this.getStats(),
            items: this.getMenuItems()
        };
    }
}

// Export for browser environments
if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
}

console.log('📊 DataManager module loaded');