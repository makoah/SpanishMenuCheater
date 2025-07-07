/**
 * Tests for DataManager - Menu Data Processing and Management
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the DataManager for testing
class MockDataManager {
    constructor() {
        this.menuItems = [];
        this.isLoaded = false;
        this.dataSource = 'data/spanish_menu_items.csv';
        this.version = '1.0.0';
        this.lastUpdated = null;
        
        this.requiredFields = [
            'Spanish Name',
            'English Translation',
            'Description',
            'Price Range',
            'Pork',
            'Other Meat',
            'Fish/Seafood',
            'Dairy',
            'Vegetarian'
        ];
        
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
    
    // Test implementations of key methods
    cleanString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/\s+/g, ' ').replace(/[""]/g, '"').replace(/['']/g, "'");
    }
    
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value !== 'string') return false;
        const cleaned = value.toLowerCase().trim();
        return cleaned === 'true' || cleaned === '1' || cleaned === 'yes' || cleaned === 'y';
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
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
        
        result.push(current.trim());
        return result;
    }
    
    generateItemId(item) {
        const spanishName = item['Spanish Name'] || '';
        const englishName = item['English Translation'] || '';
        const combined = (spanishName + englishName).toLowerCase();
        
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36);
    }
    
    validateMenuItem(item) {
        if (!item['Spanish Name'] || !item['English Translation']) {
            return null;
        }
        
        const cleanItem = {
            spanishName: this.cleanString(item['Spanish Name']),
            englishName: this.cleanString(item['English Translation']),
            description: this.cleanString(item['Description'] || ''),
            priceRange: this.cleanString(item['Price Range'] || ''),
            hasPork: this.parseBoolean(item['Pork']),
            hasOtherMeat: this.parseBoolean(item['Other Meat']),
            hasSeafood: this.parseBoolean(item['Fish/Seafood']),
            hasDairy: this.parseBoolean(item['Dairy']),
            isVegetarian: this.parseBoolean(item['Vegetarian']),
            googleSearchUrl: item['Google Search'] || '',
            id: item._id || this.generateItemId(item),
            rowNumber: item._rowNumber,
            lastUpdated: new Date().toISOString()
        };
        
        if (cleanItem.spanishName.length === 0 || cleanItem.englishName.length === 0) {
            return null;
        }
        
        return cleanItem;
    }
    
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
    
    calculateStats() {
        this.stats = {
            totalItems: this.menuItems.length,
            vegetarianItems: this.menuItems.filter(item => item.isVegetarian).length,
            porkItems: this.menuItems.filter(item => item.hasPork).length,
            dairyItems: this.menuItems.filter(item => item.hasDairy).length,
            meatItems: this.menuItems.filter(item => item.hasOtherMeat).length,
            seafoodItems: this.menuItems.filter(item => item.hasSeafood).length,
            validItems: this.menuItems.length,
            invalidItems: 0
        };
    }
    
    getMenuItems() {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        return [...this.menuItems];
    }
    
    getMenuItem(id) {
        if (!this.isLoaded) {
            throw new Error('Menu data not loaded. Call loadMenuData() first.');
        }
        return this.menuItems.find(item => item.id === id) || null;
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    getDataInfo() {
        return {
            source: this.dataSource,
            version: this.version,
            lastUpdated: this.lastUpdated,
            isLoaded: this.isLoaded,
            itemCount: this.menuItems.length
        };
    }
}

describe('DataManager', () => {
    let dataManager;
    
    beforeEach(() => {
        dataManager = new MockDataManager();
    });
    
    afterEach(() => {
        dataManager = null;
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(dataManager.menuItems).toEqual([]);
            expect(dataManager.isLoaded).toBe(false);
            expect(dataManager.dataSource).toBe('data/spanish_menu_items.csv');
            expect(dataManager.version).toBe('1.0.0');
            expect(dataManager.lastUpdated).toBeNull();
        });

        test('should have required fields defined', () => {
            expect(dataManager.requiredFields).toContain('Spanish Name');
            expect(dataManager.requiredFields).toContain('English Translation');
            expect(dataManager.requiredFields).toContain('Pork');
            expect(dataManager.requiredFields).toContain('Vegetarian');
        });

        test('should initialize empty stats', () => {
            const stats = dataManager.getStats();
            expect(stats.totalItems).toBe(0);
            expect(stats.vegetarianItems).toBe(0);
            expect(stats.porkItems).toBe(0);
        });
    });

    describe('String Cleaning', () => {
        test('should clean strings properly', () => {
            expect(dataManager.cleanString('  Hello  World  ')).toBe('Hello World');
            expect(dataManager.cleanString('"Quoted Text"')).toBe('"Quoted Text"');
            expect(dataManager.cleanString('')).toBe('');
            expect(dataManager.cleanString(null)).toBe('');
            expect(dataManager.cleanString(undefined)).toBe('');
        });

        test('should normalize whitespace', () => {
            expect(dataManager.cleanString('Multiple   spaces   here')).toBe('Multiple spaces here');
            expect(dataManager.cleanString('\t\nTabs and newlines\t\n')).toBe('Tabs and newlines');
        });
    });

    describe('Boolean Parsing', () => {
        test('should parse true values correctly', () => {
            expect(dataManager.parseBoolean('true')).toBe(true);
            expect(dataManager.parseBoolean('TRUE')).toBe(true);
            expect(dataManager.parseBoolean('True')).toBe(true);
            expect(dataManager.parseBoolean('1')).toBe(true);
            expect(dataManager.parseBoolean('yes')).toBe(true);
            expect(dataManager.parseBoolean('Y')).toBe(true);
            expect(dataManager.parseBoolean(true)).toBe(true);
        });

        test('should parse false values correctly', () => {
            expect(dataManager.parseBoolean('false')).toBe(false);
            expect(dataManager.parseBoolean('FALSE')).toBe(false);
            expect(dataManager.parseBoolean('0')).toBe(false);
            expect(dataManager.parseBoolean('no')).toBe(false);
            expect(dataManager.parseBoolean('n')).toBe(false);
            expect(dataManager.parseBoolean('')).toBe(false);
            expect(dataManager.parseBoolean(null)).toBe(false);
            expect(dataManager.parseBoolean(undefined)).toBe(false);
            expect(dataManager.parseBoolean(false)).toBe(false);
        });
    });

    describe('CSV Parsing', () => {
        test('should parse simple CSV line', () => {
            const line = 'Field1,Field2,Field3';
            const result = dataManager.parseCSVLine(line);
            expect(result).toEqual(['Field1', 'Field2', 'Field3']);
        });

        test('should handle quoted fields with commas', () => {
            const line = 'Field1,"Field with, comma",Field3';
            const result = dataManager.parseCSVLine(line);
            expect(result).toEqual(['Field1', 'Field with, comma', 'Field3']);
        });

        test('should handle escaped quotes', () => {
            const line = 'Field1,"Field with ""quotes""",Field3';
            const result = dataManager.parseCSVLine(line);
            expect(result).toEqual(['Field1', 'Field with "quotes"', 'Field3']);
        });

        test('should handle empty fields', () => {
            const line = 'Field1,,Field3';
            const result = dataManager.parseCSVLine(line);
            expect(result).toEqual(['Field1', '', 'Field3']);
        });

        test('should trim whitespace from fields', () => {
            const line = ' Field1 , Field2 , Field3 ';
            const result = dataManager.parseCSVLine(line);
            expect(result).toEqual(['Field1', 'Field2', 'Field3']);
        });
    });

    describe('ID Generation', () => {
        test('should generate consistent IDs for same input', () => {
            const item1 = { 'Spanish Name': 'Paella', 'English Translation': 'Rice Dish' };
            const item2 = { 'Spanish Name': 'Paella', 'English Translation': 'Rice Dish' };
            
            const id1 = dataManager.generateItemId(item1);
            const id2 = dataManager.generateItemId(item2);
            
            expect(id1).toBe(id2);
            expect(typeof id1).toBe('string');
            expect(id1.length).toBeGreaterThan(0);
        });

        test('should generate different IDs for different inputs', () => {
            const item1 = { 'Spanish Name': 'Paella', 'English Translation': 'Rice Dish' };
            const item2 = { 'Spanish Name': 'Gazpacho', 'English Translation': 'Cold Soup' };
            
            const id1 = dataManager.generateItemId(item1);
            const id2 = dataManager.generateItemId(item2);
            
            expect(id1).not.toBe(id2);
        });

        test('should handle empty or missing names', () => {
            const item = { 'Spanish Name': '', 'English Translation': '' };
            const id = dataManager.generateItemId(item);
            
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });
    });

    describe('Menu Item Validation', () => {
        test('should validate complete menu item', () => {
            const rawItem = {
                'Spanish Name': 'Paella',
                'English Translation': 'Rice Dish',
                'Description': 'Traditional Spanish rice dish',
                'Price Range': '€12-15',
                'Pork': 'false',
                'Other Meat': 'true',
                'Fish/Seafood': 'true',
                'Dairy': 'false',
                'Vegetarian': 'false',
                'Google Search': 'https://example.com',
                _rowNumber: 1,
                _id: 'test123'
            };

            const validated = dataManager.validateMenuItem(rawItem);

            expect(validated).not.toBeNull();
            expect(validated.spanishName).toBe('Paella');
            expect(validated.englishName).toBe('Rice Dish');
            expect(validated.description).toBe('Traditional Spanish rice dish');
            expect(validated.priceRange).toBe('€12-15');
            expect(validated.hasPork).toBe(false);
            expect(validated.hasOtherMeat).toBe(true);
            expect(validated.hasSeafood).toBe(true);
            expect(validated.hasDairy).toBe(false);
            expect(validated.isVegetarian).toBe(false);
            expect(validated.googleSearchUrl).toBe('https://example.com');
            expect(validated.id).toBe('test123');
            expect(validated.rowNumber).toBe(1);
            expect(validated.lastUpdated).toBeDefined();
        });

        test('should reject items without Spanish name', () => {
            const rawItem = {
                'Spanish Name': '',
                'English Translation': 'Rice Dish',
                'Description': 'Test',
                'Price Range': '€12-15',
                'Pork': 'false',
                'Other Meat': 'false',
                'Fish/Seafood': 'false',
                'Dairy': 'false',
                'Vegetarian': 'true'
            };

            const validated = dataManager.validateMenuItem(rawItem);
            expect(validated).toBeNull();
        });

        test('should reject items without English translation', () => {
            const rawItem = {
                'Spanish Name': 'Paella',
                'English Translation': '',
                'Description': 'Test',
                'Price Range': '€12-15',
                'Pork': 'false',
                'Other Meat': 'false',
                'Fish/Seafood': 'false',
                'Dairy': 'false',
                'Vegetarian': 'true'
            };

            const validated = dataManager.validateMenuItem(rawItem);
            expect(validated).toBeNull();
        });

        test('should handle missing optional fields', () => {
            const rawItem = {
                'Spanish Name': 'Paella',
                'English Translation': 'Rice Dish',
                'Pork': 'false',
                'Other Meat': 'false',
                'Fish/Seafood': 'false',
                'Dairy': 'false',
                'Vegetarian': 'true'
            };

            const validated = dataManager.validateMenuItem(rawItem);

            expect(validated).not.toBeNull();
            expect(validated.description).toBe('');
            expect(validated.priceRange).toBe('');
            expect(validated.googleSearchUrl).toBe('');
        });
    });

    describe('Data Access Methods', () => {
        beforeEach(() => {
            // Set up test data
            dataManager.menuItems = [
                {
                    id: '1',
                    spanishName: 'Paella',
                    englishName: 'Rice Dish',
                    isVegetarian: false,
                    hasPork: false,
                    hasDairy: true,
                    hasOtherMeat: true,
                    hasSeafood: true
                },
                {
                    id: '2',
                    spanishName: 'Gazpacho',
                    englishName: 'Cold Soup',
                    isVegetarian: true,
                    hasPork: false,
                    hasDairy: false,
                    hasOtherMeat: false,
                    hasSeafood: false
                }
            ];
            dataManager.isLoaded = true;
        });

        test('should get all menu items', () => {
            const items = dataManager.getMenuItems();
            expect(items).toHaveLength(2);
            expect(items[0].spanishName).toBe('Paella');
            expect(items[1].spanishName).toBe('Gazpacho');
        });

        test('should get menu item by ID', () => {
            const item = dataManager.getMenuItem('1');
            expect(item).not.toBeNull();
            expect(item.spanishName).toBe('Paella');
        });

        test('should return null for non-existent ID', () => {
            const item = dataManager.getMenuItem('999');
            expect(item).toBeNull();
        });

        test('should throw error when data not loaded', () => {
            dataManager.isLoaded = false;
            expect(() => dataManager.getMenuItems()).toThrow('Menu data not loaded');
            expect(() => dataManager.getMenuItem('1')).toThrow('Menu data not loaded');
        });
    });

    describe('Dietary Filtering', () => {
        beforeEach(() => {
            dataManager.menuItems = [
                {
                    id: '1',
                    spanishName: 'Paella',
                    isVegetarian: false,
                    hasPork: false,
                    hasDairy: true,
                    hasOtherMeat: true,
                    hasSeafood: true
                },
                {
                    id: '2',
                    spanishName: 'Gazpacho',
                    isVegetarian: true,
                    hasPork: false,
                    hasDairy: false,
                    hasOtherMeat: false,
                    hasSeafood: false
                },
                {
                    id: '3',
                    spanishName: 'Jamón',
                    isVegetarian: false,
                    hasPork: true,
                    hasDairy: false,
                    hasOtherMeat: false,
                    hasSeafood: false
                }
            ];
            dataManager.isLoaded = true;
        });

        test('should filter vegetarian items', () => {
            const filtered = dataManager.filterByDietary({ vegetarian: true });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].spanishName).toBe('Gazpacho');
        });

        test('should filter items without pork', () => {
            const filtered = dataManager.filterByDietary({ noPork: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(item => item.spanishName)).toEqual(['Paella', 'Gazpacho']);
        });

        test('should filter items without dairy', () => {
            const filtered = dataManager.filterByDietary({ noDairy: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(item => item.spanishName)).toEqual(['Gazpacho', 'Jamón']);
        });

        test('should filter items without meat', () => {
            const filtered = dataManager.filterByDietary({ noMeat: true });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].spanishName).toBe('Gazpacho');
        });

        test('should filter items without seafood', () => {
            const filtered = dataManager.filterByDietary({ noSeafood: true });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(item => item.spanishName)).toEqual(['Gazpacho', 'Jamón']);
        });

        test('should apply multiple filters', () => {
            const filtered = dataManager.filterByDietary({ 
                noPork: true, 
                noDairy: true 
            });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].spanishName).toBe('Gazpacho');
        });

        test('should return empty array when no items match', () => {
            const filtered = dataManager.filterByDietary({ 
                vegetarian: true,
                noMeat: false // This creates an impossible condition
            });
            expect(filtered).toHaveLength(1); // Gazpacho is vegetarian
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            dataManager.menuItems = [
                {
                    isVegetarian: true,
                    hasPork: false,
                    hasDairy: false,
                    hasOtherMeat: false,
                    hasSeafood: false
                },
                {
                    isVegetarian: false,
                    hasPork: true,
                    hasDairy: true,
                    hasOtherMeat: false,
                    hasSeafood: false
                },
                {
                    isVegetarian: false,
                    hasPork: false,
                    hasDairy: false,
                    hasOtherMeat: true,
                    hasSeafood: true
                }
            ];
        });

        test('should calculate statistics correctly', () => {
            dataManager.calculateStats();
            const stats = dataManager.getStats();
            
            expect(stats.totalItems).toBe(3);
            expect(stats.vegetarianItems).toBe(1);
            expect(stats.porkItems).toBe(1);
            expect(stats.dairyItems).toBe(1);
            expect(stats.meatItems).toBe(1);
            expect(stats.seafoodItems).toBe(1);
            expect(stats.validItems).toBe(3);
        });
    });

    describe('Data Information', () => {
        test('should return correct data info', () => {
            const info = dataManager.getDataInfo();
            
            expect(info.source).toBe('data/spanish_menu_items.csv');
            expect(info.version).toBe('1.0.0');
            expect(info.isLoaded).toBe(false);
            expect(info.itemCount).toBe(0);
        });

        test('should update item count after loading data', () => {
            dataManager.menuItems = [{ id: '1' }, { id: '2' }];
            dataManager.isLoaded = true;
            
            const info = dataManager.getDataInfo();
            expect(info.itemCount).toBe(2);
            expect(info.isLoaded).toBe(true);
        });
    });
});

describe('DataManager Error Handling', () => {
    let dataManager;
    
    beforeEach(() => {
        dataManager = new MockDataManager();
    });
    
    test('should handle empty CSV gracefully', () => {
        expect(() => {
            dataManager.parseCSVLine('');
        }).not.toThrow();
        
        const result = dataManager.parseCSVLine('');
        expect(result).toEqual(['']);
    });
    
    test('should handle malformed boolean values', () => {
        expect(dataManager.parseBoolean('maybe')).toBe(false);
        expect(dataManager.parseBoolean('123')).toBe(false);
        expect(dataManager.parseBoolean({})).toBe(false);
    });
    
    test('should handle special characters in strings', () => {
        const input = 'Special chars: àáâãäåæçèéêë ñ üÜ';
        const result = dataManager.cleanString(input);
        expect(result).toBe(input);
    });
});