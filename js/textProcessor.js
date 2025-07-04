class TextProcessor {
    constructor() {
        this.spanishFoodWords = new Set([
            'paella', 'tortilla', 'jamón', 'chorizo', 'gazpacho', 'tapas', 'croquetas',
            'bocadillo', 'empanada', 'fabada', 'cocido', 'callos', 'morcilla', 'butifarra',
            'pescado', 'mariscos', 'langostinos', 'gambas', 'pulpo', 'calamares', 'merluza',
            'bacalao', 'salmón', 'atún', 'sardinas', 'anchoas', 'trucha', 'lubina',
            'pollo', 'ternera', 'cerdo', 'cordero', 'cabrito', 'conejo', 'pato',
            'ensalada', 'verduras', 'patatas', 'tomate', 'cebolla', 'pimiento', 'ajo',
            'arroz', 'fideos', 'pasta', 'lentejas', 'garbanzos', 'judías', 'alubias',
            'queso', 'manchego', 'cabrales', 'tetilla', 'idiazábal', 'murcia',
            'vino', 'cerveza', 'agua', 'café', 'cortado', 'carajillo', 'horchata',
            'flan', 'natillas', 'torrijas', 'churros', 'polvorón', 'turrón', 'crema'
        ]);

        this.spanishMenuTerms = new Set([
            'entrantes', 'primeros', 'segundos', 'postres', 'bebidas', 'vinos',
            'platos', 'especialidad', 'casera', 'plancha', 'frito', 'asado',
            'guisado', 'estofado', 'salsa', 'alioli', 'vinagreta', 'aceite',
            'menú', 'carta', 'del', 'día', 'casa', 'especial', 'temporada'
        ]);

        this.pricePatterns = [
            /\d+[.,]\d{2}?\s*€/g,
            /€\s*\d+[.,]?\d{0,2}/g,
            /\d+[.,]\d{2}?\s*euros?/gi,
            /\d+[.,]\d{2}?\s*eur/gi,
            /\$\s*\d+[.,]?\d{0,2}/g,
            /\d+[.,]\d{2}?\s*\$/g
        ];

        this.numberPatterns = [
            /^\d+$/,
            /^\d+[.,]\d+$/,
            /^[ivxlcdm]+$/i // Roman numerals
        ];

        this.nonFoodWords = new Set([
            'servicio', 'incluido', 'iva', 'propina', 'mesa', 'silla', 'cubierto',
            'servilleta', 'mantel', 'cuenta', 'pagar', 'tarjeta', 'efectivo',
            'horario', 'abierto', 'cerrado', 'reservas', 'teléfono', 'dirección',
            'wifi', 'baño', 'aseo', 'parking', 'terraza', 'salón', 'comedor'
        ]);
    }

    processOCRText(ocrResult, options = {}) {
        const {
            minWordLength = 2,
            maxWordLength = 25,
            minConfidence = 30,
            includePartialMatches = true,
            fuzzyThreshold = 0.7
        } = options;

        try {
            const words = this.extractWords(ocrResult);
            const filteredWords = this.filterWords(words, {
                minWordLength,
                maxWordLength,
                minConfidence
            });
            
            const spanishWords = this.identifySpanishWords(filteredWords);
            const suggestions = this.generateSuggestions(spanishWords, {
                includePartialMatches,
                fuzzyThreshold
            });

            return {
                originalText: ocrResult.fullText,
                extractedWords: words.length,
                filteredWords: filteredWords.length,
                spanishWords: spanishWords,
                suggestions: suggestions,
                confidence: ocrResult.averageConfidence,
                processingTime: Date.now()
            };
        } catch (error) {
            console.error('Text processing failed:', error);
            throw new Error(`Text analysis failed: ${error.message}`);
        }
    }

    extractWords(ocrResult) {
        const words = [];
        
        // Extract from words with confidence
        if (ocrResult.words && ocrResult.words.length > 0) {
            words.push(...ocrResult.words.map(word => ({
                text: word.text.toLowerCase(),
                confidence: word.confidence,
                bbox: word.bbox,
                source: 'ocr_word'
            })));
        }
        
        // Extract from full text as fallback
        if (ocrResult.fullText) {
            const textWords = ocrResult.fullText
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 0)
                .map(word => ({
                    text: this.cleanWord(word),
                    confidence: ocrResult.confidence || 50,
                    source: 'full_text'
                }));
            
            words.push(...textWords);
        }

        // Remove duplicates while preserving highest confidence
        const uniqueWords = new Map();
        words.forEach(word => {
            const key = word.text;
            if (!uniqueWords.has(key) || uniqueWords.get(key).confidence < word.confidence) {
                uniqueWords.set(key, word);
            }
        });

        return Array.from(uniqueWords.values());
    }

    cleanWord(word) {
        return word
            .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, '') // Remove non-letter chars except Spanish
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    filterWords(words, options) {
        const { minWordLength, maxWordLength, minConfidence } = options;
        
        return words.filter(word => {
            // Length filter
            if (word.text.length < minWordLength || word.text.length > maxWordLength) {
                return false;
            }
            
            // Confidence filter
            if (word.confidence < minConfidence) {
                return false;
            }
            
            // Price filter
            if (this.isPriceText(word.text)) {
                return false;
            }
            
            // Number filter
            if (this.isNumberText(word.text)) {
                return false;
            }
            
            // Non-food words filter
            if (this.nonFoodWords.has(word.text)) {
                return false;
            }
            
            return true;
        });
    }

    isPriceText(text) {
        return this.pricePatterns.some(pattern => pattern.test(text));
    }

    isNumberText(text) {
        return this.numberPatterns.some(pattern => pattern.test(text));
    }

    identifySpanishWords(words) {
        const spanishWords = [];
        
        words.forEach(word => {
            const score = this.calculateSpanishScore(word.text);
            
            if (score > 0) {
                spanishWords.push({
                    ...word,
                    spanishScore: score,
                    category: this.categorizeWord(word.text)
                });
            }
        });
        
        // Sort by Spanish score and confidence
        return spanishWords.sort((a, b) => {
            const scoreA = (a.spanishScore * 0.7) + (a.confidence * 0.3);
            const scoreB = (b.spanishScore * 0.7) + (b.confidence * 0.3);
            return scoreB - scoreA;
        });
    }

    calculateSpanishScore(word) {
        let score = 0;
        
        // Exact matches get highest score
        if (this.spanishFoodWords.has(word)) {
            score += 100;
        } else if (this.spanishMenuTerms.has(word)) {
            score += 80;
        }
        
        // Partial matches for common Spanish patterns
        if (word.includes('ñ') || word.includes('ll') || word.includes('rr')) {
            score += 30;
        }
        
        // Spanish accent marks
        if (/[áéíóúüñ]/i.test(word)) {
            score += 25;
        }
        
        // Common Spanish endings
        if (/(?:ada|ado|ción|sión|ería|ito|ita)$/.test(word)) {
            score += 20;
        }
        
        // Spanish food-related suffixes
        if (/(?:illo|ete|ico|ín|uelo)$/.test(word)) {
            score += 15;
        }
        
        return Math.min(score, 100);
    }

    categorizeWord(word) {
        if (this.spanishFoodWords.has(word)) {
            return 'food';
        } else if (this.spanishMenuTerms.has(word)) {
            return 'menu_term';
        } else if (/[áéíóúüñ]/.test(word)) {
            return 'spanish_accent';
        } else {
            return 'other';
        }
    }

    generateSuggestions(spanishWords, options) {
        const { includePartialMatches, fuzzyThreshold } = options;
        const suggestions = [];
        
        // High-confidence exact matches
        const exactMatches = spanishWords
            .filter(word => word.spanishScore >= 80 && word.confidence >= 60)
            .slice(0, 5);
        
        suggestions.push(...exactMatches.map(word => ({
            text: word.text,
            confidence: word.confidence,
            score: word.spanishScore,
            category: word.category,
            type: 'exact'
        })));
        
        // Partial matches if enabled
        if (includePartialMatches) {
            const partialMatches = spanishWords
                .filter(word => 
                    word.spanishScore >= 40 && 
                    word.spanishScore < 80 && 
                    word.confidence >= 40
                )
                .slice(0, 3);
            
            suggestions.push(...partialMatches.map(word => ({
                text: word.text,
                confidence: word.confidence,
                score: word.spanishScore,
                category: word.category,
                type: 'partial'
            })));
        }
        
        // Remove duplicates and sort by combined score
        const uniqueSuggestions = suggestions
            .filter((suggestion, index, self) => 
                index === self.findIndex(s => s.text === suggestion.text)
            )
            .sort((a, b) => {
                const scoreA = (a.score * 0.6) + (a.confidence * 0.4);
                const scoreB = (b.score * 0.6) + (b.confidence * 0.4);
                return scoreB - scoreA;
            })
            .slice(0, 8); // Limit to 8 suggestions max
        
        return uniqueSuggestions;
    }

    // Fuzzy matching for OCR errors
    calculateLevenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    findClosestSpanishWord(word, threshold = 0.7) {
        let bestMatch = null;
        let bestScore = 0;
        
        const allSpanishWords = [...this.spanishFoodWords, ...this.spanishMenuTerms];
        
        for (const spanishWord of allSpanishWords) {
            const distance = this.calculateLevenshteinDistance(word, spanishWord);
            const maxLength = Math.max(word.length, spanishWord.length);
            const similarity = 1 - (distance / maxLength);
            
            if (similarity >= threshold && similarity > bestScore) {
                bestMatch = spanishWord;
                bestScore = similarity;
            }
        }
        
        return bestMatch ? { word: bestMatch, similarity: bestScore } : null;
    }
}

export default TextProcessor;