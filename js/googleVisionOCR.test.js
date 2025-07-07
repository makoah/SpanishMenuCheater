/**
 * Tests for GoogleVisionOCR - Google Cloud Vision API Integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import GoogleVisionOCR from './googleVisionOCR.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleVisionOCR', () => {
    let googleVisionOCR;
    const validApiKey = 'AIzaSyDmocvGJ7-fKvLV8hNOJjmFJVGsAlGKLMN'; // Example format
    const invalidApiKey = 'invalid';

    beforeEach(() => {
        googleVisionOCR = new GoogleVisionOCR();
        fetch.mockClear();
    });

    afterEach(() => {
        googleVisionOCR.cleanup();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(googleVisionOCR.apiKey).toBeNull();
            expect(googleVisionOCR.isInitialized).toBe(false);
            expect(googleVisionOCR.baseUrl).toBe('https://vision.googleapis.com/v1/images:annotate');
        });

        test('should initialize successfully with valid API key', async () => {
            await googleVisionOCR.initialize(validApiKey);
            
            expect(googleVisionOCR.apiKey).toBe(validApiKey);
            expect(googleVisionOCR.isInitialized).toBe(true);
        });

        test('should throw error with null API key', async () => {
            await expect(googleVisionOCR.initialize(null))
                .rejects.toThrow('Valid API key required for Google Vision OCR');
        });

        test('should throw error with empty API key', async () => {
            await expect(googleVisionOCR.initialize(''))
                .rejects.toThrow('Valid API key required for Google Vision OCR');
        });

        test('should throw error with short API key', async () => {
            await expect(googleVisionOCR.initialize('short'))
                .rejects.toThrow('API key appears to be invalid (too short)');
        });

        test('should trim API key whitespace', async () => {
            const keyWithSpaces = `  ${validApiKey}  `;
            await googleVisionOCR.initialize(keyWithSpaces);
            
            expect(googleVisionOCR.apiKey).toBe(validApiKey);
        });
    });

    describe('Image Processing', () => {
        beforeEach(async () => {
            await googleVisionOCR.initialize(validApiKey);
            // Mock image optimization to avoid canvas operations in test environment
            jest.spyOn(googleVisionOCR, 'optimizeImageForAPI').mockResolvedValue('data:image/png;base64,optimized');
        });

        test('should throw error when not initialized', async () => {
            const uninitializedOCR = new GoogleVisionOCR();
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            await expect(uninitializedOCR.processImage(testImage))
                .rejects.toThrow('Google Vision OCR not initialized');
        });

        test('should process image successfully with valid response', async () => {
            const mockResponse = {
                responses: [{
                    textAnnotations: [
                        {
                            description: 'paella valenciana',
                            boundingPoly: {
                                vertices: [
                                    { x: 10, y: 10 },
                                    { x: 100, y: 10 },
                                    { x: 100, y: 30 },
                                    { x: 10, y: 30 }
                                ]
                            }
                        },
                        {
                            description: 'paella',
                            boundingPoly: {
                                vertices: [
                                    { x: 10, y: 10 },
                                    { x: 50, y: 10 },
                                    { x: 50, y: 30 },
                                    { x: 10, y: 30 }
                                ]
                            },
                            score: 0.95
                        },
                        {
                            description: 'valenciana',
                            boundingPoly: {
                                vertices: [
                                    { x: 55, y: 10 },
                                    { x: 100, y: 10 },
                                    { x: 100, y: 30 },
                                    { x: 55, y: 30 }
                                ]
                            },
                            score: 0.90
                        }
                    ]
                }]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            const result = await googleVisionOCR.processImage(testImage);

            expect(result.fullText).toBe('paella valenciana');
            expect(result.source).toBe('google_vision');
            expect(result.words).toHaveLength(2);
            expect(result.words[0].text).toBe('paella');
            expect(result.words[0].confidence).toBe(95);
            expect(result.words[1].text).toBe('valenciana');
            expect(result.words[1].confidence).toBe(90);
            expect(result.averageConfidence).toBe(93); // (95 + 90) / 2
        });

        test('should handle empty response gracefully', async () => {
            const mockResponse = {
                responses: [{}]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            const result = await googleVisionOCR.processImage(testImage);

            expect(result.fullText).toBe('');
            expect(result.confidence).toBe(0);
            expect(result.words).toHaveLength(0);
            expect(result.wordCount).toBe(0);
            expect(result.source).toBe('google_vision');
        });

        test('should process image without preprocessing when disabled', async () => {
            const mockResponse = {
                responses: [{
                    textAnnotations: [{
                        description: 'test text'
                    }]
                }]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            // Spy on optimization method
            const optimizeSpy = jest.spyOn(googleVisionOCR, 'optimizeImageForAPI');
            
            await googleVisionOCR.processImage(testImage, { preprocessImage: false });
            
            expect(optimizeSpy).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await googleVisionOCR.initialize(validApiKey);
            // Mock image optimization to avoid canvas operations in test environment
            jest.spyOn(googleVisionOCR, 'optimizeImageForAPI').mockResolvedValue('data:image/png;base64,optimized');
        });

        test('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            await expect(googleVisionOCR.processImage(testImage))
                .rejects.toThrow('Network error: Please check your internet connection');
        });

        test('should handle 403 authentication errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: () => Promise.resolve({
                    error: { message: 'API key not valid' }
                })
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            await expect(googleVisionOCR.processImage(testImage))
                .rejects.toThrow('API key authentication failed');
        });

        test('should handle 429 quota exceeded errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: () => Promise.resolve({
                    error: { message: 'Quota exceeded' }
                })
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            await expect(googleVisionOCR.processImage(testImage))
                .rejects.toThrow('API quota exceeded');
        });

        test('should handle 400 bad request errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    error: { message: 'Invalid image format' }
                })
            });

            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            await expect(googleVisionOCR.processImage(testImage))
                .rejects.toThrow('Invalid image format');
        });

        test('should handle invalid image data', async () => {
            // Test convertToBase64 directly to avoid optimization complexity in tests
            await expect(googleVisionOCR.convertToBase64('invalid-image-data'))
                .rejects.toThrow('String image data must be a data URL');
        });
    });

    describe('Image Optimization', () => {
        beforeEach(async () => {
            await googleVisionOCR.initialize(validApiKey);
        });

        test('should calculate optimal size for small images', () => {
            const result = googleVisionOCR.calculateOptimalSize(512, 384, 4 * 1024 * 1024);
            
            // Should upscale to at least 1024px on longest side
            expect(result.width).toBeGreaterThanOrEqual(1024);
            expect(result.scale).toBeGreaterThan(1);
        });

        test('should calculate optimal size for large images', () => {
            const result = googleVisionOCR.calculateOptimalSize(8192, 6144, 4 * 1024 * 1024);
            
            // Should downscale to max 4096px on longest side
            expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(4096);
            expect(result.scale).toBeLessThan(1);
        });

        test('should maintain aspect ratio', () => {
            const originalWidth = 1600;
            const originalHeight = 1200;
            const originalRatio = originalWidth / originalHeight;
            
            const result = googleVisionOCR.calculateOptimalSize(originalWidth, originalHeight, 4 * 1024 * 1024);
            const newRatio = result.width / result.height;
            
            expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
        });

        test('should ensure even dimensions', () => {
            const result = googleVisionOCR.calculateOptimalSize(1003, 777, 4 * 1024 * 1024);
            
            expect(result.width % 2).toBe(0);
            expect(result.height % 2).toBe(0);
        });
    });

    describe('Base64 Conversion', () => {
        beforeEach(async () => {
            await googleVisionOCR.initialize(validApiKey);
        });

        test('should extract base64 from data URL', async () => {
            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            const base64 = await googleVisionOCR.convertToBase64(dataUrl);
            
            expect(base64).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        });

        test('should reject invalid string data', async () => {
            await expect(googleVisionOCR.convertToBase64('not-a-data-url'))
                .rejects.toThrow('String image data must be a data URL');
        });
    });

    describe('API Key Testing', () => {
        test('should test API key successfully', async () => {
            await googleVisionOCR.initialize(validApiKey);
            // Mock image optimization to avoid canvas operations in test environment
            jest.spyOn(googleVisionOCR, 'optimizeImageForAPI').mockResolvedValue('data:image/png;base64,optimized');
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    responses: [{}]
                })
            });

            const isValid = await googleVisionOCR.testAPIKey();
            expect(isValid).toBe(true);
        });

        test('should fail API key test on error', async () => {
            await googleVisionOCR.initialize(validApiKey);
            // Mock image optimization to avoid canvas operations in test environment
            jest.spyOn(googleVisionOCR, 'optimizeImageForAPI').mockResolvedValue('data:image/png;base64,optimized');
            
            fetch.mockRejectedValueOnce(new Error('Invalid API key'));

            const isValid = await googleVisionOCR.testAPIKey();
            expect(isValid).toBe(false);
        });

        test('should throw error when testing uninitialized OCR', async () => {
            await expect(googleVisionOCR.testAPIKey())
                .rejects.toThrow('Google Vision OCR not initialized');
        });
    });

    describe('Status and Cleanup', () => {
        test('should return correct status when uninitialized', () => {
            const status = googleVisionOCR.getStatus();
            
            expect(status.isInitialized).toBe(false);
            expect(status.hasAPIKey).toBe(false);
            expect(status.apiKeyValid).toBe(false);
            expect(status.lastProcessingTime).toBe(0);
        });

        test('should return correct status when initialized', async () => {
            await googleVisionOCR.initialize(validApiKey);
            const status = googleVisionOCR.getStatus();
            
            expect(status.isInitialized).toBe(true);
            expect(status.hasAPIKey).toBe(true);
            expect(status.apiKeyValid).toBe(true);
        });

        test('should cleanup resources', () => {
            googleVisionOCR.apiKey = validApiKey;
            googleVisionOCR.isInitialized = true;
            googleVisionOCR.lastProcessingTime = 1000;
            
            googleVisionOCR.cleanup();
            
            expect(googleVisionOCR.apiKey).toBeNull();
            expect(googleVisionOCR.isInitialized).toBe(false);
            expect(googleVisionOCR.lastProcessingTime).toBe(0);
        });
    });

    describe('Line Grouping', () => {
        beforeEach(async () => {
            await googleVisionOCR.initialize(validApiKey);
        });

        test('should group words into lines correctly', () => {
            const words = [
                { text: 'Hello', confidence: 95, bbox: { x0: 10, y0: 10, x1: 50, y1: 30 } },
                { text: 'World', confidence: 90, bbox: { x0: 60, y0: 12, x1: 100, y1: 32 } },
                { text: 'Next', confidence: 85, bbox: { x0: 10, y0: 50, x1: 40, y1: 70 } },
                { text: 'Line', confidence: 88, bbox: { x0: 50, y0: 52, x1: 80, y1: 72 } }
            ];
            
            const lines = googleVisionOCR.groupWordsIntoLines(words);
            
            expect(lines).toHaveLength(2);
            expect(lines[0].text).toBe('Hello World');
            expect(lines[0].confidence).toBe(93); // (95 + 90) / 2
            expect(lines[1].text).toBe('Next Line');
            expect(lines[1].confidence).toBe(87); // (85 + 88) / 2
        });

        test('should handle empty words array', () => {
            const lines = googleVisionOCR.groupWordsIntoLines([]);
            expect(lines).toHaveLength(0);
        });

        test('should handle words without bounding boxes', () => {
            const words = [
                { text: 'Hello', confidence: 95 },
                { text: 'World', confidence: 90 }
            ];
            
            const lines = googleVisionOCR.groupWordsIntoLines(words);
            expect(lines).toHaveLength(0);
        });
    });
});