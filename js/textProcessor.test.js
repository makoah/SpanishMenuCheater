import { jest } from '@jest/globals';
import TextProcessor from './textProcessor.js';

describe('TextProcessor', () => {
    let textProcessor;
    let mockOCRResult;

    beforeEach(() => {
        textProcessor = new TextProcessor();
        
        mockOCRResult = {
            fullText: 'Paella Valenciana 12.50€ Jamón Ibérico 8,90€ Gazpacho Andaluz',
            confidence: 85,
            averageConfidence: 78,
            words: [
                { text: 'Paella', confidence: 90, bbox: {} },
                { text: 'Valenciana', confidence: 85, bbox: {} },
                { text: '12.50€', confidence: 95, bbox: {} },
                { text: 'Jamón', confidence: 88, bbox: {} },
                { text: 'Ibérico', confidence: 82, bbox: {} },
                { text: '8,90€', confidence: 93, bbox: {} },
                { text: 'Gazpacho', confidence: 89, bbox: {} },
                { text: 'Andaluz', confidence: 76, bbox: {} }
            ]
        };
    });

    describe('initialization', () => {
        test('should initialize with Spanish food vocabulary', () => {
            expect(textProcessor.spanishFoodWords.has('paella')).toBe(true);
            expect(textProcessor.spanishFoodWords.has('jamón')).toBe(true);
            expect(textProcessor.spanishFoodWords.has('gazpacho')).toBe(true);
        });

        test('should initialize with menu terms', () => {
            expect(textProcessor.spanishMenuTerms.has('entrantes')).toBe(true);
            expect(textProcessor.spanishMenuTerms.has('postres')).toBe(true);
            expect(textProcessor.spanishMenuTerms.has('especialidad')).toBe(true);
        });

        test('should initialize with non-food words filter', () => {
            expect(textProcessor.nonFoodWords.has('servicio')).toBe(true);
            expect(textProcessor.nonFoodWords.has('cuenta')).toBe(true);
            expect(textProcessor.nonFoodWords.has('wifi')).toBe(true);
        });
    });

    describe('extractWords', () => {
        test('should extract words from OCR result', () => {
            const words = textProcessor.extractWords(mockOCRResult);
            
            expect(words.length).toBeGreaterThan(0);
            expect(words.some(w => w.text === 'paella')).toBe(true);
            expect(words.some(w => w.text === 'jamón')).toBe(true);
        });

        test('should handle OCR result with only full text', () => {
            const ocrResult = {
                fullText: 'Tortilla Española Chorizo',
                confidence: 70
            };
            
            const words = textProcessor.extractWords(ocrResult);
            
            expect(words.length).toBe(3);
            expect(words.some(w => w.text === 'tortilla')).toBe(true);
            expect(words.some(w => w.text === 'española')).toBe(true);
            expect(words.some(w => w.text === 'chorizo')).toBe(true);
        });

        test('should remove duplicate words keeping highest confidence', () => {
            const ocrResult = {
                fullText: 'paella paella',
                words: [
                    { text: 'paella', confidence: 80 },
                    { text: 'paella', confidence: 90 }
                ]
            };
            
            const words = textProcessor.extractWords(ocrResult);
            const paellaWords = words.filter(w => w.text === 'paella');
            
            expect(paellaWords.length).toBe(1);
            expect(paellaWords[0].confidence).toBe(90);
        });
    });

    describe('cleanWord', () => {
        test('should remove punctuation and normalize text', () => {
            expect(textProcessor.cleanWord('Paella!')).toBe('paella');
            expect(textProcessor.cleanWord('Jamón,')).toBe('jamón');
            expect(textProcessor.cleanWord('(Gazpacho)')).toBe('gazpacho');
        });

        test('should preserve Spanish accents', () => {
            expect(textProcessor.cleanWord('José')).toBe('josé');
            expect(textProcessor.cleanWord('Señor')).toBe('señor');
            expect(textProcessor.cleanWord('Niño')).toBe('niño');
        });

        test('should handle multiple spaces', () => {
            expect(textProcessor.cleanWord('  tortilla   española  ')).toBe('tortilla española');
        });
    });

    describe('isPriceText', () => {
        test('should identify various price formats', () => {
            expect(textProcessor.isPriceText('12.50€')).toBe(true);
            expect(textProcessor.isPriceText('€8,90')).toBe(true);
            expect(textProcessor.isPriceText('15.00 euros')).toBe(true);
            expect(textProcessor.isPriceText('$12.50')).toBe(true);
            expect(textProcessor.isPriceText('paella')).toBe(false);
        });
    });

    describe('isNumberText', () => {
        test('should identify numbers and Roman numerals', () => {
            expect(textProcessor.isNumberText('123')).toBe(true);
            expect(textProcessor.isNumberText('12.50')).toBe(true);
            expect(textProcessor.isNumberText('VIII')).toBe(true);
            expect(textProcessor.isNumberText('paella')).toBe(false);
        });
    });

    describe('filterWords', () => {
        test('should filter out prices and numbers', () => {
            const words = [
                { text: 'paella', confidence: 90 },
                { text: '12.50€', confidence: 95 },
                { text: 'gazpacho', confidence: 89 },
                { text: '123', confidence: 88 }
            ];
            
            const filtered = textProcessor.filterWords(words, {
                minWordLength: 2,
                maxWordLength: 25,
                minConfidence: 70
            });
            
            expect(filtered.length).toBe(2);
            expect(filtered.some(w => w.text === 'paella')).toBe(true);
            expect(filtered.some(w => w.text === 'gazpacho')).toBe(true);
            expect(filtered.some(w => w.text === '12.50€')).toBe(false);
            expect(filtered.some(w => w.text === '123')).toBe(false);
        });

        test('should filter by confidence threshold', () => {
            const words = [
                { text: 'paella', confidence: 90 },
                { text: 'jamón', confidence: 50 },
                { text: 'gazpacho', confidence: 30 }
            ];
            
            const filtered = textProcessor.filterWords(words, {
                minWordLength: 2,
                maxWordLength: 25,
                minConfidence: 60
            });
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].text).toBe('paella');
        });

        test('should filter by word length', () => {
            const words = [
                { text: 'a', confidence: 90 },
                { text: 'paella', confidence: 90 },
                { text: 'verylongwordthatexceedslimit', confidence: 90 }
            ];
            
            const filtered = textProcessor.filterWords(words, {
                minWordLength: 3,
                maxWordLength: 15,
                minConfidence: 70
            });
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].text).toBe('paella');
        });
    });

    describe('calculateSpanishScore', () => {
        test('should give high scores to known Spanish food words', () => {
            expect(textProcessor.calculateSpanishScore('paella')).toBe(100);
            expect(textProcessor.calculateSpanishScore('jamón')).toBe(100);
            expect(textProcessor.calculateSpanishScore('gazpacho')).toBe(100);
        });

        test('should give good scores to Spanish menu terms', () => {
            expect(textProcessor.calculateSpanishScore('entrantes')).toBe(80);
            expect(textProcessor.calculateSpanishScore('postres')).toBe(80);
        });

        test('should score Spanish accent marks', () => {
            const score = textProcessor.calculateSpanishScore('señor');
            expect(score).toBeGreaterThan(20);
        });

        test('should score Spanish letter patterns', () => {
            const score = textProcessor.calculateSpanishScore('pollo');
            expect(score).toBeGreaterThan(25);
        });

        test('should give low scores to non-Spanish words', () => {
            expect(textProcessor.calculateSpanishScore('hamburger')).toBe(0);
            expect(textProcessor.calculateSpanishScore('pizza')).toBe(0);
        });
    });

    describe('categorizeWord', () => {
        test('should categorize food words correctly', () => {
            expect(textProcessor.categorizeWord('paella')).toBe('food');
            expect(textProcessor.categorizeWord('jamón')).toBe('food');
        });

        test('should categorize menu terms correctly', () => {
            expect(textProcessor.categorizeWord('entrantes')).toBe('menu_term');
            expect(textProcessor.categorizeWord('postres')).toBe('menu_term');
        });

        test('should categorize words with Spanish accents', () => {
            expect(textProcessor.categorizeWord('señor')).toBe('spanish_accent');
            expect(textProcessor.categorizeWord('josé')).toBe('spanish_accent');
        });

        test('should categorize other words', () => {
            expect(textProcessor.categorizeWord('something')).toBe('other');
        });
    });

    describe('processOCRText', () => {
        test('should process OCR text and return suggestions', () => {
            const result = textProcessor.processOCRText(mockOCRResult);
            
            expect(result.originalText).toBe(mockOCRResult.fullText);
            expect(result.suggestions).toBeInstanceOf(Array);
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.spanishWords).toBeInstanceOf(Array);
            expect(result.confidence).toBe(mockOCRResult.averageConfidence);
        });

        test('should find Spanish food words in suggestions', () => {
            const result = textProcessor.processOCRText(mockOCRResult);
            
            const suggestionTexts = result.suggestions.map(s => s.text);
            expect(suggestionTexts).toContain('paella');
            expect(suggestionTexts).toContain('jamón');
            expect(suggestionTexts).toContain('gazpacho');
        });

        test('should not include prices in suggestions', () => {
            const result = textProcessor.processOCRText(mockOCRResult);
            
            const suggestionTexts = result.suggestions.map(s => s.text);
            expect(suggestionTexts).not.toContain('12.50€');
            expect(suggestionTexts).not.toContain('8,90€');
        });

        test('should handle empty OCR result gracefully', () => {
            const emptyResult = {
                fullText: '',
                confidence: 0,
                averageConfidence: 0,
                words: []
            };
            
            const result = textProcessor.processOCRText(emptyResult);
            
            expect(result.suggestions).toEqual([]);
            expect(result.spanishWords).toEqual([]);
            expect(result.extractedWords).toBe(0);
        });
    });

    describe('calculateLevenshteinDistance', () => {
        test('should calculate edit distance correctly', () => {
            expect(textProcessor.calculateLevenshteinDistance('paella', 'paella')).toBe(0);
            expect(textProcessor.calculateLevenshteinDistance('paella', 'paela')).toBe(1);
            expect(textProcessor.calculateLevenshteinDistance('jamón', 'jamon')).toBe(1);
            expect(textProcessor.calculateLevenshteinDistance('gazpacho', 'gazpcho')).toBe(1);
        });
    });

    describe('findClosestSpanishWord', () => {
        test('should find closest match for OCR errors', () => {
            const match = textProcessor.findClosestSpanishWord('paela', 0.7);
            expect(match).not.toBeNull();
            expect(match.word).toBe('paella');
            expect(match.similarity).toBeGreaterThan(0.7);
        });

        test('should return null for words too different', () => {
            const match = textProcessor.findClosestSpanishWord('hamburger', 0.7);
            expect(match).toBeNull();
        });

        test('should handle accent differences', () => {
            const match = textProcessor.findClosestSpanishWord('jamon', 0.7);
            expect(match).not.toBeNull();
            expect(match.word).toBe('jamón');
        });
    });

    describe('generateSuggestions', () => {
        test('should prioritize high-confidence exact matches', () => {
            const spanishWords = [
                { text: 'paella', confidence: 90, spanishScore: 100, category: 'food' },
                { text: 'jamón', confidence: 60, spanishScore: 100, category: 'food' },
                { text: 'gazpacho', confidence: 85, spanishScore: 100, category: 'food' }
            ];
            
            const suggestions = textProcessor.generateSuggestions(spanishWords, {
                includePartialMatches: true,
                fuzzyThreshold: 0.7
            });
            
            expect(suggestions[0].text).toBe('paella');
            expect(suggestions[0].type).toBe('exact');
            expect(suggestions.length).toBeGreaterThan(0);
        });

        test('should limit suggestions to maximum count', () => {
            const manyWords = Array.from({ length: 15 }, (_, i) => ({
                text: `word${i}`,
                confidence: 80,
                spanishScore: 90,
                category: 'food'
            }));
            
            const suggestions = textProcessor.generateSuggestions(manyWords, {
                includePartialMatches: true,
                fuzzyThreshold: 0.7
            });
            
            expect(suggestions.length).toBeLessThanOrEqual(8);
        });

        test('should remove duplicate suggestions', () => {
            const spanishWords = [
                { text: 'paella', confidence: 90, spanishScore: 100, category: 'food' },
                { text: 'paella', confidence: 85, spanishScore: 100, category: 'food' }
            ];
            
            const suggestions = textProcessor.generateSuggestions(spanishWords, {
                includePartialMatches: true,
                fuzzyThreshold: 0.7
            });
            
            const paellaSuggestions = suggestions.filter(s => s.text === 'paella');
            expect(paellaSuggestions.length).toBe(1);
        });
    });
});