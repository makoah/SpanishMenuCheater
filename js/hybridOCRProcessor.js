/**
 * Hybrid OCR Processor - Coordinates Google Vision API and Tesseract.js OCR
 * Implements cloud-first processing with automatic fallback to local OCR
 */

import GoogleVisionOCR from './googleVisionOCR.js';
import OCRProcessor from './ocrProcessor.js';

class HybridOCRProcessor {
    constructor() {
        this.googleVisionOCR = null;
        this.tesseractOCR = null;
        this.isInitialized = false;
        this.hasGoogleVisionKey = false;
        this.processingStats = {
            totalProcessed: 0,
            googleVisionUsed: 0,
            tesseractUsed: 0,
            fallbackOccurred: 0,
            lastProcessingTime: 0,
            averageProcessingTime: 0
        };
        this.progressCallback = null;
    }

    /**
     * Initialize the hybrid OCR processor
     * @param {Object} options - Initialization options
     * @param {string} options.googleVisionApiKey - Google Vision API key (optional)
     * @param {Function} options.progressCallback - Progress callback function
     */
    async initialize(options = {}) {
        const { googleVisionApiKey, progressCallback } = options;
        
        this.progressCallback = progressCallback;
        
        try {
            this.updateProgress('Initializing OCR processors...', 0);
            
            // Always initialize Tesseract.js as fallback
            this.tesseractOCR = new OCRProcessor();
            await this.tesseractOCR.initialize(this.createTesseractProgressCallback());
            
            this.updateProgress('Local OCR initialized', 30);
            
            // Initialize Google Vision if API key provided
            if (googleVisionApiKey && googleVisionApiKey.trim()) {
                try {
                    this.googleVisionOCR = new GoogleVisionOCR();
                    await this.googleVisionOCR.initialize(googleVisionApiKey);
                    this.hasGoogleVisionKey = true;
                    this.updateProgress('Cloud OCR initialized', 60);
                    console.log('🌐 Hybrid OCR: Google Vision + Tesseract.js ready');
                } catch (error) {
                    console.warn('⚠️ Google Vision initialization failed, using Tesseract.js only:', error.message);
                    this.googleVisionOCR = null;
                    this.hasGoogleVisionKey = false;
                }
            } else {
                console.log('🔧 Hybrid OCR: Tesseract.js only (no Google Vision API key)');
            }
            
            this.isInitialized = true;
            this.updateProgress('Hybrid OCR ready', 100);
            
        } catch (error) {
            console.error('❌ Hybrid OCR initialization failed:', error);
            throw new Error(`Failed to initialize hybrid OCR: ${error.message}`);
        }
    }

    /**
     * Process image with hybrid approach: Google Vision first, Tesseract.js fallback
     * @param {Blob|File|string} imageData - Image to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} OCR result with source information
     */
    async processImage(imageData, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Hybrid OCR processor not initialized. Call initialize() first.');
        }

        const {
            forceLocal = false,
            confidence = 20,
            maxTime = 45000,
            useMultipleAttempts = false
        } = options;

        const startTime = Date.now();
        let result = null;
        let source = null;
        let fallbackReason = null;

        try {
            this.updateProgress('Starting OCR processing...', 0);

            // Try Google Vision first (if available and not forced to local)
            if (this.hasGoogleVisionKey && !forceLocal) {
                try {
                    this.updateProgress('Processing with Google Vision...', 20);
                    console.log('🌐 Attempting Google Vision OCR...');
                    
                    result = await this.googleVisionOCR.processImage(imageData, {
                        preprocessImage: true,
                        maxImageSize: 4 * 1024 * 1024,
                        quality: 0.9,
                        format: 'jpeg'
                    });
                    
                    source = 'google_vision';
                    this.processingStats.googleVisionUsed++;
                    
                    this.updateProgress('Google Vision processing complete', 80);
                    console.log(`✅ Google Vision OCR successful: ${result.confidence}% confidence`);
                    
                    // If confidence is very low, still try Tesseract as backup
                    if (result.confidence < 20) {
                        console.log('⚠️ Low confidence from Google Vision, trying Tesseract as backup...');
                        const tesseractResult = await this.processTesseract(imageData, options);
                        
                        // Use whichever has higher confidence
                        if (tesseractResult.confidence > result.confidence) {
                            result = tesseractResult;
                            source = 'tesseract_backup';
                            console.log(`🔄 Using Tesseract result (${tesseractResult.confidence}% > ${result.confidence}%)`);
                        } else {
                            result.source = 'google_vision_primary';
                            console.log(`🌐 Keeping Google Vision result (${result.confidence}% >= ${tesseractResult.confidence}%)`);
                        }
                    } else {
                        result.source = 'google_vision';
                    }
                    
                } catch (googleError) {
                    console.warn('⚠️ Google Vision failed, falling back to Tesseract.js:', googleError.message);
                    fallbackReason = googleError.message;
                    this.processingStats.fallbackOccurred++;
                    
                    // Fallback to Tesseract.js
                    result = await this.processTesseract(imageData, options);
                    source = 'tesseract_fallback';
                }
            } else {
                // Use Tesseract.js directly
                const reason = forceLocal ? 'forced local processing' : 'no Google Vision API key';
                console.log(`🔧 Using Tesseract.js OCR: ${reason}`);
                
                result = await this.processTesseract(imageData, options);
                source = 'tesseract_only';
            }

            // Add processing metadata
            const processingTime = Date.now() - startTime;
            result.hybridProcessing = {
                source: source,
                fallbackReason: fallbackReason,
                processingTime: processingTime,
                hasGoogleVision: this.hasGoogleVisionKey,
                timestamp: new Date().toISOString()
            };

            // Update statistics
            this.updateStatistics(processingTime);
            this.updateProgress('OCR processing complete', 100);
            
            console.log(`✅ Hybrid OCR complete: ${source} (${processingTime}ms)`);
            return result;

        } catch (error) {
            console.error('❌ Hybrid OCR processing failed:', error);
            this.updateProgress('OCR processing failed', 0);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    /**
     * Process image with Tesseract.js
     * @param {Blob|File|string} imageData - Image to process  
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Tesseract OCR result
     */
    async processTesseract(imageData, options) {
        this.updateProgress('Processing with Tesseract.js...', 40);
        
        const result = await this.tesseractOCR.processImage(imageData, options);
        result.source = 'tesseract';
        
        this.processingStats.tesseractUsed++;
        this.updateProgress('Tesseract.js processing complete', 80);
        
        return result;
    }

    /**
     * Create progress callback for Tesseract.js
     * @returns {Function} Progress callback that forwards to main callback
     */
    createTesseractProgressCallback() {
        return (progress) => {
            if (this.progressCallback && progress.status === 'recognizing text') {
                // Scale Tesseract progress to fit within overall progress range
                const scaledProgress = 40 + (progress.progress * 0.4); // 40-80% range
                this.updateProgress(`Processing with Tesseract.js... ${progress.progress}%`, scaledProgress);
            }
        };
    }

    /**
     * Update processing statistics
     * @param {number} processingTime - Time taken for processing
     */
    updateStatistics(processingTime) {
        this.processingStats.totalProcessed++;
        this.processingStats.lastProcessingTime = processingTime;
        
        // Calculate rolling average
        if (this.processingStats.totalProcessed === 1) {
            this.processingStats.averageProcessingTime = processingTime;
        } else {
            const weight = 0.2; // Weight for new value
            this.processingStats.averageProcessingTime = 
                (this.processingStats.averageProcessingTime * (1 - weight)) + 
                (processingTime * weight);
        }
    }

    /**
     * Update progress if callback is available
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     */
    updateProgress(message, progress) {
        if (this.progressCallback) {
            this.progressCallback({
                status: 'processing',
                message: message,
                progress: Math.round(progress)
            });
        }
    }

    /**
     * Get processing method recommendation based on conditions
     * @param {Object} conditions - Current conditions
     * @returns {Object} Recommendation with method and reason
     */
    getProcessingRecommendation(conditions = {}) {
        const { isOnline = navigator.onLine, batteryLevel = 1, isLowPowerMode = false } = conditions;
        
        if (!this.hasGoogleVisionKey) {
            return {
                method: 'tesseract',
                reason: 'No Google Vision API key configured'
            };
        }
        
        if (!isOnline) {
            return {
                method: 'tesseract',
                reason: 'Device is offline'
            };
        }
        
        if (isLowPowerMode || batteryLevel < 0.2) {
            return {
                method: 'tesseract',
                reason: 'Low power mode or battery'
            };
        }
        
        return {
            method: 'google_vision',
            reason: 'Optimal conditions for cloud processing'
        };
    }

    /**
     * Test both OCR engines and compare results
     * @param {Blob|File|string} testImage - Test image
     * @returns {Promise<Object>} Comparison results
     */
    async compareEngines(testImage) {
        if (!this.isInitialized) {
            throw new Error('Hybrid OCR processor not initialized');
        }

        const results = {
            googleVision: null,
            tesseract: null,
            comparison: null,
            timestamp: new Date().toISOString()
        };

        try {
            // Test Google Vision (if available)
            if (this.hasGoogleVisionKey) {
                const startTime = Date.now();
                results.googleVision = await this.googleVisionOCR.processImage(testImage);
                results.googleVision.processingTime = Date.now() - startTime;
            }

            // Test Tesseract.js
            const startTime = Date.now();
            results.tesseract = await this.tesseractOCR.processImage(testImage);
            results.tesseract.processingTime = Date.now() - startTime;

            // Create comparison
            if (results.googleVision && results.tesseract) {
                results.comparison = {
                    confidenceDifference: results.googleVision.confidence - results.tesseract.confidence,
                    timeDifference: results.googleVision.processingTime - results.tesseract.processingTime,
                    wordCountDifference: results.googleVision.wordCount - results.tesseract.wordCount,
                    recommended: results.googleVision.confidence > results.tesseract.confidence ? 'google_vision' : 'tesseract'
                };
            }

            return results;

        } catch (error) {
            console.error('Engine comparison failed:', error);
            throw new Error(`Engine comparison failed: ${error.message}`);
        }
    }

    /**
     * Get current status and statistics
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasGoogleVision: this.hasGoogleVisionKey,
            hasTesseract: !!this.tesseractOCR?.isInitialized,
            statistics: { ...this.processingStats },
            engines: {
                googleVision: this.googleVisionOCR?.getStatus() || null,
                tesseract: this.tesseractOCR?.getStatus() || null
            }
        };
    }

    /**
     * Update Google Vision API key
     * @param {string} apiKey - New API key
     */
    async updateGoogleVisionKey(apiKey) {
        try {
            if (apiKey && apiKey.trim()) {
                if (!this.googleVisionOCR) {
                    this.googleVisionOCR = new GoogleVisionOCR();
                }
                await this.googleVisionOCR.initialize(apiKey);
                this.hasGoogleVisionKey = true;
                console.log('✅ Google Vision API key updated successfully');
            } else {
                this.googleVisionOCR = null;
                this.hasGoogleVisionKey = false;
                console.log('🔧 Google Vision disabled (no API key)');
            }
        } catch (error) {
            console.error('❌ Failed to update Google Vision API key:', error);
            this.googleVisionOCR = null;
            this.hasGoogleVisionKey = false;
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.googleVisionOCR) {
            this.googleVisionOCR.cleanup();
            this.googleVisionOCR = null;
        }
        
        if (this.tesseractOCR) {
            await this.tesseractOCR.terminate();
            this.tesseractOCR = null;
        }
        
        this.isInitialized = false;
        this.hasGoogleVisionKey = false;
        this.progressCallback = null;
        
        console.log('🧹 Hybrid OCR processor cleaned up');
    }
}

export default HybridOCRProcessor;