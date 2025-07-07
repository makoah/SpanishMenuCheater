/**
 * Tests for HybridOCRProcessor - Hybrid OCR System with Google Vision + Tesseract.js
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import HybridOCRProcessor from './hybridOCRProcessor.js';

// Mock the imported OCR classes
jest.mock('./googleVisionOCR.js');
jest.mock('./ocrProcessor.js');

import GoogleVisionOCR from './googleVisionOCR.js';
import OCRProcessor from './ocrProcessor.js';

describe('HybridOCRProcessor', () => {
    let hybridProcessor;
    let mockGoogleVision;
    let mockTesseract;
    const validApiKey = 'AIzaSyDmocvGJ7-fKvLV8hNOJjmFJVGsAlGKLMN';
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    beforeEach(() => {
        hybridProcessor = new HybridOCRProcessor();
        
        // Setup Google Vision mock
        mockGoogleVision = {
            initialize: jest.fn().mockResolvedValue(undefined),
            processImage: jest.fn().mockResolvedValue({
                fullText: 'paella valenciana',
                confidence: 85,
                words: [
                    { text: 'paella', confidence: 90 },
                    { text: 'valenciana', confidence: 80 }
                ],
                source: 'google_vision'
            }),
            getStatus: jest.fn().mockReturnValue({ isInitialized: true }),
            cleanup: jest.fn()
        };
        GoogleVisionOCR.mockImplementation(() => mockGoogleVision);

        // Setup Tesseract mock
        mockTesseract = {
            initialize: jest.fn().mockResolvedValue(undefined),
            processImage: jest.fn().mockResolvedValue({
                fullText: 'paella',
                confidence: 45,
                words: [{ text: 'paella', confidence: 45 }],
                source: 'tesseract'
            }),
            getStatus: jest.fn().mockReturnValue({ isInitialized: true }),
            terminate: jest.fn().mockResolvedValue(undefined),
            isInitialized: true
        };
        OCRProcessor.mockImplementation(() => mockTesseract);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(hybridProcessor.isInitialized).toBe(false);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            expect(hybridProcessor.googleVisionOCR).toBeNull();
            expect(hybridProcessor.tesseractOCR).toBeNull();
        });

        test('should initialize with Tesseract.js only when no API key provided', async () => {
            const progressCallback = jest.fn();
            
            await hybridProcessor.initialize({ progressCallback });
            
            expect(hybridProcessor.isInitialized).toBe(true);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            expect(hybridProcessor.tesseractOCR).toBeTruthy();
            expect(hybridProcessor.googleVisionOCR).toBeNull();
            expect(mockTesseract.initialize).toHaveBeenCalled();
        });

        test('should initialize with both engines when API key provided', async () => {
            const progressCallback = jest.fn();
            
            await hybridProcessor.initialize({ 
                googleVisionApiKey: validApiKey,
                progressCallback 
            });
            
            expect(hybridProcessor.isInitialized).toBe(true);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(true);
            expect(hybridProcessor.tesseractOCR).toBeTruthy();
            expect(hybridProcessor.googleVisionOCR).toBeTruthy();
            expect(mockGoogleVision.initialize).toHaveBeenCalledWith(validApiKey);
            expect(mockTesseract.initialize).toHaveBeenCalled();
        });

        test('should handle Google Vision initialization failure gracefully', async () => {
            mockGoogleVision.initialize.mockRejectedValue(new Error('Invalid API key'));
            
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            expect(hybridProcessor.isInitialized).toBe(true);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            expect(hybridProcessor.googleVisionOCR).toBeNull();
            expect(hybridProcessor.tesseractOCR).toBeTruthy();
        });

        test('should call progress callback during initialization', async () => {
            const progressCallback = jest.fn();
            
            await hybridProcessor.initialize({ 
                googleVisionApiKey: validApiKey,
                progressCallback 
            });
            
            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'processing',
                    message: expect.stringContaining('Initializing'),
                    progress: 0
                })
            );
        });

        test('should throw error if Tesseract initialization fails', async () => {
            mockTesseract.initialize.mockRejectedValue(new Error('Tesseract failed'));
            
            await expect(hybridProcessor.initialize({}))
                .rejects.toThrow('Failed to initialize hybrid OCR');
        });
    });

    describe('Image Processing', () => {
        beforeEach(async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
        });

        test('should throw error when not initialized', async () => {
            const uninitializedProcessor = new HybridOCRProcessor();
            
            await expect(uninitializedProcessor.processImage(testImage))
                .rejects.toThrow('Hybrid OCR processor not initialized');
        });

        test('should use Google Vision first when available', async () => {
            const result = await hybridProcessor.processImage(testImage);
            
            expect(mockGoogleVision.processImage).toHaveBeenCalledWith(testImage, expect.any(Object));
            expect(mockTesseract.processImage).not.toHaveBeenCalled();
            expect(result.hybridProcessing.source).toBe('google_vision');
            expect(result.fullText).toBe('paella valenciana');
        });

        test('should fallback to Tesseract when Google Vision fails', async () => {
            mockGoogleVision.processImage.mockRejectedValue(new Error('Network error'));
            
            const result = await hybridProcessor.processImage(testImage);
            
            expect(mockGoogleVision.processImage).toHaveBeenCalled();
            expect(mockTesseract.processImage).toHaveBeenCalled();
            expect(result.hybridProcessing.source).toBe('tesseract_fallback');
            expect(result.hybridProcessing.fallbackReason).toBe('Network error');
            expect(result.fullText).toBe('paella');
        });

        test('should use Tesseract only when no Google Vision key', async () => {
            const processor = new HybridOCRProcessor();
            await processor.initialize({}); // No API key
            
            const result = await processor.processImage(testImage);
            
            expect(mockGoogleVision.processImage).not.toHaveBeenCalled();
            expect(mockTesseract.processImage).toHaveBeenCalled();
            expect(result.hybridProcessing.source).toBe('tesseract_only');
        });

        test('should force local processing when requested', async () => {
            const result = await hybridProcessor.processImage(testImage, { forceLocal: true });
            
            expect(mockGoogleVision.processImage).not.toHaveBeenCalled();
            expect(mockTesseract.processImage).toHaveBeenCalled();
            expect(result.hybridProcessing.source).toBe('tesseract_only');
        });

        test('should try Tesseract backup when Google Vision confidence is very low', async () => {
            // Mock low confidence Google Vision result
            mockGoogleVision.processImage.mockResolvedValue({
                fullText: 'unclear text',
                confidence: 15, // Very low confidence
                words: [],
                source: 'google_vision'
            });
            
            const result = await hybridProcessor.processImage(testImage);
            
            expect(mockGoogleVision.processImage).toHaveBeenCalled();
            expect(mockTesseract.processImage).toHaveBeenCalled();
            
            // Should use Tesseract result since it has higher confidence (45% > 15%)
            expect(result.hybridProcessing.source).toBe('tesseract_backup');
            expect(result.fullText).toBe('paella');
        });

        test('should keep Google Vision result when it has higher confidence than Tesseract backup', async () => {
            // Mock moderate confidence Google Vision result
            mockGoogleVision.processImage.mockResolvedValue({
                fullText: 'paella',
                confidence: 30, // Low but higher than Tesseract
                words: [],
                source: 'google_vision'
            });
            
            const result = await hybridProcessor.processImage(testImage);
            
            expect(mockGoogleVision.processImage).toHaveBeenCalled();
            expect(mockTesseract.processImage).toHaveBeenCalled();
            
            // Should keep Google Vision result (30% > backup threshold)
            expect(result.hybridProcessing.source).toBe('google_vision_primary');
            expect(result.fullText).toBe('paella');
        });

        test('should include processing metadata in result', async () => {
            const result = await hybridProcessor.processImage(testImage);
            
            expect(result.hybridProcessing).toEqual(
                expect.objectContaining({
                    source: expect.any(String),
                    processingTime: expect.any(Number),
                    hasGoogleVision: true,
                    timestamp: expect.any(String)
                })
            );
        });

        test('should update processing statistics', async () => {
            const initialStats = hybridProcessor.processingStats.totalProcessed;
            
            await hybridProcessor.processImage(testImage);
            
            expect(hybridProcessor.processingStats.totalProcessed).toBe(initialStats + 1);
            expect(hybridProcessor.processingStats.googleVisionUsed).toBe(1);
            expect(hybridProcessor.processingStats.lastProcessingTime).toBeGreaterThan(0);
        });

        test('should call progress callback during processing', async () => {
            const progressCallback = jest.fn();
            hybridProcessor.progressCallback = progressCallback;
            
            await hybridProcessor.processImage(testImage);
            
            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'processing',
                    message: expect.stringContaining('Processing with Google Vision'),
                    progress: expect.any(Number)
                })
            );
        });
    });

    describe('Processing Recommendations', () => {
        test('should recommend Tesseract when no Google Vision key', () => {
            hybridProcessor.hasGoogleVisionKey = false;
            
            const recommendation = hybridProcessor.getProcessingRecommendation();
            
            expect(recommendation.method).toBe('tesseract');
            expect(recommendation.reason).toBe('No Google Vision API key configured');
        });

        test('should recommend Tesseract when offline', () => {
            hybridProcessor.hasGoogleVisionKey = true;
            
            const recommendation = hybridProcessor.getProcessingRecommendation({ isOnline: false });
            
            expect(recommendation.method).toBe('tesseract');
            expect(recommendation.reason).toBe('Device is offline');
        });

        test('should recommend Tesseract in low power mode', () => {
            hybridProcessor.hasGoogleVisionKey = true;
            
            const recommendation = hybridProcessor.getProcessingRecommendation({ 
                isOnline: true,
                isLowPowerMode: true 
            });
            
            expect(recommendation.method).toBe('tesseract');
            expect(recommendation.reason).toBe('Low power mode or battery');
        });

        test('should recommend Google Vision under optimal conditions', () => {
            hybridProcessor.hasGoogleVisionKey = true;
            
            const recommendation = hybridProcessor.getProcessingRecommendation({
                isOnline: true,
                batteryLevel: 0.8,
                isLowPowerMode: false
            });
            
            expect(recommendation.method).toBe('google_vision');
            expect(recommendation.reason).toBe('Optimal conditions for cloud processing');
        });
    });

    describe('Engine Comparison', () => {
        beforeEach(async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
        });

        test('should compare both engines when available', async () => {
            const results = await hybridProcessor.compareEngines(testImage);
            
            expect(results.googleVision).toBeTruthy();
            expect(results.tesseract).toBeTruthy();
            expect(results.comparison).toBeTruthy();
            expect(results.comparison.recommended).toBe('google_vision'); // Higher confidence
        });

        test('should only test Tesseract when no Google Vision', async () => {
            const processor = new HybridOCRProcessor();
            await processor.initialize({}); // No API key
            
            const results = await processor.compareEngines(testImage);
            
            expect(results.googleVision).toBeNull();
            expect(results.tesseract).toBeTruthy();
            expect(results.comparison).toBeNull();
        });

        test('should handle comparison failures gracefully', async () => {
            mockGoogleVision.processImage.mockRejectedValue(new Error('Test error'));
            
            await expect(hybridProcessor.compareEngines(testImage))
                .rejects.toThrow('Engine comparison failed');
        });
    });

    describe('API Key Management', () => {
        test('should update Google Vision key successfully', async () => {
            await hybridProcessor.initialize({});
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            
            await hybridProcessor.updateGoogleVisionKey(validApiKey);
            
            expect(hybridProcessor.hasGoogleVisionKey).toBe(true);
            expect(mockGoogleVision.initialize).toHaveBeenCalledWith(validApiKey);
        });

        test('should disable Google Vision when key is cleared', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            expect(hybridProcessor.hasGoogleVisionKey).toBe(true);
            
            await hybridProcessor.updateGoogleVisionKey('');
            
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            expect(hybridProcessor.googleVisionOCR).toBeNull();
        });

        test('should handle invalid API key gracefully', async () => {
            mockGoogleVision.initialize.mockRejectedValue(new Error('Invalid key'));
            
            await expect(hybridProcessor.updateGoogleVisionKey('invalid'))
                .rejects.toThrow('Invalid key');
            
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
        });
    });

    describe('Status and Statistics', () => {
        test('should return correct status when uninitialized', () => {
            const status = hybridProcessor.getStatus();
            
            expect(status.isInitialized).toBe(false);
            expect(status.hasGoogleVision).toBe(false);
            expect(status.hasTesseract).toBe(false);
            expect(status.statistics.totalProcessed).toBe(0);
        });

        test('should return correct status when initialized', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            const status = hybridProcessor.getStatus();
            
            expect(status.isInitialized).toBe(true);
            expect(status.hasGoogleVision).toBe(true);
            expect(status.hasTesseract).toBe(true);
            expect(status.engines.googleVision).toBeTruthy();
            expect(status.engines.tesseract).toBeTruthy();
        });

        test('should track statistics correctly', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            // Process an image that will use Google Vision
            await hybridProcessor.processImage(testImage);
            
            const stats = hybridProcessor.processingStats;
            expect(stats.totalProcessed).toBe(1);
            expect(stats.googleVisionUsed).toBe(1);
            expect(stats.tesseractUsed).toBe(0);
            expect(stats.fallbackOccurred).toBe(0);
        });

        test('should track fallback statistics', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            mockGoogleVision.processImage.mockRejectedValue(new Error('Network error'));
            
            await hybridProcessor.processImage(testImage);
            
            const stats = hybridProcessor.processingStats;
            expect(stats.totalProcessed).toBe(1);
            expect(stats.googleVisionUsed).toBe(0);
            expect(stats.tesseractUsed).toBe(1);
            expect(stats.fallbackOccurred).toBe(1);
        });

        test('should calculate rolling average processing time', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            // Process first image
            await hybridProcessor.processImage(testImage);
            const firstAverage = hybridProcessor.processingStats.averageProcessingTime;
            
            // Process second image
            await hybridProcessor.processImage(testImage);
            const secondAverage = hybridProcessor.processingStats.averageProcessingTime;
            
            expect(firstAverage).toBeGreaterThan(0);
            expect(secondAverage).toBeGreaterThan(0);
            // Average should be updated (rolling average)
        });
    });

    describe('Cleanup', () => {
        test('should cleanup all resources', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            await hybridProcessor.cleanup();
            
            expect(mockGoogleVision.cleanup).toHaveBeenCalled();
            expect(mockTesseract.terminate).toHaveBeenCalled();
            expect(hybridProcessor.isInitialized).toBe(false);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(false);
            expect(hybridProcessor.googleVisionOCR).toBeNull();
            expect(hybridProcessor.tesseractOCR).toBeNull();
        });

        test('should handle cleanup when only Tesseract is initialized', async () => {
            await hybridProcessor.initialize({}); // No Google Vision
            
            await hybridProcessor.cleanup();
            
            expect(mockTesseract.terminate).toHaveBeenCalled();
            expect(hybridProcessor.isInitialized).toBe(false);
        });

        test('should handle cleanup gracefully when not initialized', async () => {
            // Should not throw error
            await expect(hybridProcessor.cleanup()).resolves.not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle processing failure gracefully', async () => {
            await hybridProcessor.initialize({});
            mockTesseract.processImage.mockRejectedValue(new Error('Processing failed'));
            
            await expect(hybridProcessor.processImage(testImage))
                .rejects.toThrow('OCR processing failed');
        });

        test('should handle both engines failing', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            mockGoogleVision.processImage.mockRejectedValue(new Error('Google failed'));
            mockTesseract.processImage.mockRejectedValue(new Error('Tesseract failed'));
            
            await expect(hybridProcessor.processImage(testImage))
                .rejects.toThrow('OCR processing failed');
        });

        test('should maintain state consistency after errors', async () => {
            await hybridProcessor.initialize({ googleVisionApiKey: validApiKey });
            
            try {
                mockTesseract.processImage.mockRejectedValue(new Error('Test error'));
                await hybridProcessor.processImage(testImage);
            } catch (error) {
                // Error expected
            }
            
            // Processor should still be initialized and functional
            expect(hybridProcessor.isInitialized).toBe(true);
            expect(hybridProcessor.hasGoogleVisionKey).toBe(true);
        });
    });
});