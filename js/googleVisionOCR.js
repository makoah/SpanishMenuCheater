/**
 * Google Cloud Vision API OCR Integration
 * Handles cloud-based text recognition using Google Vision API
 */

class GoogleVisionOCR {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://vision.googleapis.com/v1/images:annotate';
        this.isInitialized = false;
        this.lastProcessingTime = 0;
    }

    /**
     * Initialize with API key from settings
     * @param {string} apiKey - Google Cloud Vision API key
     */
    async initialize(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Valid API key required for Google Vision OCR');
        }

        this.apiKey = apiKey.trim();
        
        // Validate API key format (Google API keys are typically 39 characters)
        if (this.apiKey.length < 20) {
            throw new Error('API key appears to be invalid (too short)');
        }

        this.isInitialized = true;
        console.log('✅ Google Vision OCR initialized successfully');
    }

    /**
     * Process image using Google Cloud Vision API
     * @param {Blob|File|string} imageData - Image to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} OCR result with text and confidence
     */
    async processImage(imageData, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Google Vision OCR not initialized. Call initialize() first.');
        }

        const startTime = Date.now();
        
        try {
            // Convert image to base64
            const base64Image = await this.convertToBase64(imageData);
            
            // Prepare API request
            const requestBody = {
                requests: [{
                    image: {
                        content: base64Image
                    },
                    features: [{
                        type: 'TEXT_DETECTION',
                        maxResults: 1
                    }],
                    imageContext: {
                        languageHints: ['es', 'en'] // Spanish and English
                    }
                }]
            };

            // Make API request
            const response = await this.makeAPIRequest(requestBody);
            
            // Process and format response
            const result = this.formatAPIResponse(response);
            
            this.lastProcessingTime = Date.now() - startTime;
            console.log(`🌐 Google Vision OCR completed in ${this.lastProcessingTime}ms`);
            
            return result;
            
        } catch (error) {
            this.lastProcessingTime = Date.now() - startTime;
            console.error('❌ Google Vision OCR failed:', error.message);
            throw this.enhanceError(error);
        }
    }

    /**
     * Convert image data to base64 string
     * @param {Blob|File|string} imageData - Image to convert
     * @returns {Promise<string>} Base64 encoded image
     */
    async convertToBase64(imageData) {
        if (typeof imageData === 'string') {
            // If it's already a data URL, extract base64 part
            if (imageData.startsWith('data:image/')) {
                return imageData.split(',')[1];
            }
            throw new Error('String image data must be a data URL');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(imageData);
        });
    }

    /**
     * Make HTTP request to Google Vision API
     * @param {Object} requestBody - API request payload
     * @returns {Promise<Object>} API response
     */
    async makeAPIRequest(requestBody) {
        const url = `${this.baseUrl}?key=${this.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Google Vision API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Format Google Vision API response to match our OCR result format
     * @param {Object} apiResponse - Raw Google Vision API response
     * @returns {Object} Formatted OCR result
     */
    formatAPIResponse(apiResponse) {
        const annotations = apiResponse.responses?.[0]?.textAnnotations;
        
        if (!annotations || annotations.length === 0) {
            return {
                fullText: '',
                confidence: 0,
                words: [],
                lines: [],
                processingTime: this.lastProcessingTime,
                wordCount: 0,
                averageConfidence: 0,
                source: 'google_vision'
            };
        }

        // First annotation contains the full text
        const fullTextAnnotation = annotations[0];
        const fullText = fullTextAnnotation.description || '';
        
        // Remaining annotations are individual words/symbols
        const wordAnnotations = annotations.slice(1);
        
        const words = wordAnnotations.map(annotation => ({
            text: annotation.description.trim(),
            confidence: Math.round((annotation.score || 0.9) * 100), // Google Vision doesn't always provide confidence
            bbox: annotation.boundingPoly ? this.extractBbox(annotation.boundingPoly) : null
        })).filter(word => word.text.length > 0);

        // Group words into lines based on y-coordinate proximity
        const lines = this.groupWordsIntoLines(words);
        
        const averageConfidence = words.length > 0 
            ? Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length)
            : 0;

        return {
            fullText: fullText.trim(),
            confidence: averageConfidence,
            words: words,
            lines: lines,
            processingTime: this.lastProcessingTime,
            wordCount: words.length,
            averageConfidence: averageConfidence,
            source: 'google_vision'
        };
    }

    /**
     * Extract bounding box from Google Vision polygon
     * @param {Object} boundingPoly - Google Vision bounding polygon
     * @returns {Object} Simplified bbox coordinates
     */
    extractBbox(boundingPoly) {
        if (!boundingPoly.vertices || boundingPoly.vertices.length === 0) {
            return null;
        }

        const vertices = boundingPoly.vertices;
        const xs = vertices.map(v => v.x || 0);
        const ys = vertices.map(v => v.y || 0);

        return {
            x0: Math.min(...xs),
            y0: Math.min(...ys),
            x1: Math.max(...xs),
            y1: Math.max(...ys)
        };
    }

    /**
     * Group words into lines based on y-coordinate proximity
     * @param {Array} words - Array of word objects with bbox
     * @returns {Array} Array of line objects
     */
    groupWordsIntoLines(words) {
        if (words.length === 0) return [];

        // Sort words by y-coordinate, then x-coordinate
        const sortedWords = words.filter(w => w.bbox).sort((a, b) => {
            const yDiff = a.bbox.y0 - b.bbox.y0;
            if (Math.abs(yDiff) < 10) { // Same line threshold
                return a.bbox.x0 - b.bbox.x0;
            }
            return yDiff;
        });

        const lines = [];
        let currentLine = [];
        let lastY = null;

        for (const word of sortedWords) {
            if (lastY === null || Math.abs(word.bbox.y0 - lastY) < 15) {
                // Same line
                currentLine.push(word);
            } else {
                // New line
                if (currentLine.length > 0) {
                    lines.push(this.createLineObject(currentLine));
                }
                currentLine = [word];
            }
            lastY = word.bbox.y0;
        }

        // Add last line
        if (currentLine.length > 0) {
            lines.push(this.createLineObject(currentLine));
        }

        return lines;
    }

    /**
     * Create line object from array of words
     * @param {Array} words - Words in the line
     * @returns {Object} Line object
     */
    createLineObject(words) {
        const text = words.map(w => w.text).join(' ');
        const confidence = Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length);
        
        return {
            text: text,
            confidence: confidence,
            words: words.length
        };
    }

    /**
     * Enhance error with more specific information
     * @param {Error} error - Original error
     * @returns {Error} Enhanced error
     */
    enhanceError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return new Error('Network error: Please check your internet connection');
        }
        
        if (message.includes('403') || message.includes('forbidden')) {
            return new Error('API key authentication failed: Please check your Google Vision API key');
        }
        
        if (message.includes('429') || message.includes('quota')) {
            return new Error('API quota exceeded: You have reached your Google Vision usage limit');
        }
        
        if (message.includes('400') || message.includes('bad request')) {
            return new Error('Invalid image format: Please try a different image');
        }
        
        if (message.includes('404')) {
            return new Error('Google Vision API service not found: Please check your API configuration');
        }
        
        return error;
    }

    /**
     * Test API key validity
     * @returns {Promise<boolean>} True if API key is valid
     */
    async testAPIKey() {
        if (!this.isInitialized) {
            throw new Error('Google Vision OCR not initialized');
        }

        try {
            // Create a small test image (1x1 white pixel)
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            await this.processImage(testImage);
            return true;
        } catch (error) {
            console.error('API key test failed:', error.message);
            return false;
        }
    }

    /**
     * Get processing status and metrics
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasAPIKey: !!this.apiKey,
            lastProcessingTime: this.lastProcessingTime,
            apiKeyValid: this.isInitialized && !!this.apiKey
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.apiKey = null;
        this.isInitialized = false;
        this.lastProcessingTime = 0;
        console.log('Google Vision OCR cleaned up');
    }
}

export default GoogleVisionOCR;