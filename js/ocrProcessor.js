// Tesseract will be loaded via CDN script tag

class OCRProcessor {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.currentProgress = 0;
        this.progressCallback = null;
    }

    async initialize(progressCallback = null) {
        if (this.isInitialized) {
            return;
        }

        this.progressCallback = progressCallback;

        try {
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js not loaded. Please ensure the CDN script is included.');
            }

            console.log('🔧 Initializing Tesseract OCR worker...');
            this.worker = await Tesseract.createWorker('spa', 1, {
                // Initialize with LSTM engine mode during creation
                corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core-simd.wasm.js'
            });
            
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ0123456789€$.,;:()[]{}¿?¡!-_/\\ ',
                tessedit_pageseg_mode: '6', // Single uniform block of text
                preserve_interword_spaces: '1',
                tessedit_enable_dict_correction: '1',
                tessedit_enable_bigram_correction: '1',
                classify_enable_learning: '0',
                classify_enable_adaptive_matcher: '1',
                textord_really_old_xheight: '1',
                segment_penalty_dict_nonword: '1.25',
                language_model_penalty_non_freq_dict_word: '0.1',
                language_model_penalty_non_dict_word: '0.15'
            });

            this.isInitialized = true;
            console.log('✅ OCR processor initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OCR processor:', error);
            throw new Error(`OCR initialization failed: ${error.message}`);
        }
    }

    handleProgress(m) {
        if (m.status === 'recognizing text') {
            this.currentProgress = Math.round(m.progress * 100);
            if (this.progressCallback) {
                this.progressCallback({
                    status: 'processing',
                    progress: this.currentProgress,
                    message: `Processing image... ${this.currentProgress}%`
                });
            }
        } else if (m.status) {
            if (this.progressCallback) {
                this.progressCallback({
                    status: 'loading',
                    progress: 0,
                    message: `Loading OCR engine... (${m.status})`
                });
            }
        }
    }

    async processImage(imageData, options = {}) {
        if (!this.isInitialized) {
            throw new Error('OCR processor not initialized. Call initialize() first.');
        }

        const {
            preprocessImage = true,
            confidence = 20,
            maxTime = 45000,
            useMultipleAttempts = true
        } = options;

        try {
            if (this.progressCallback) {
                this.progressCallback({
                    status: 'starting',
                    progress: 0,
                    message: 'Starting text recognition...'
                });
            }

            let bestResult = null;
            let bestConfidence = 0;

            if (useMultipleAttempts) {
                // Try multiple preprocessing approaches (reduced for speed)
                const attempts = [
                    { preprocess: false, label: 'original' },
                    { preprocess: true, label: 'enhanced' },
                    { preprocess: 'high_contrast', label: 'high_contrast' }
                ];

                for (const attempt of attempts) {
                    try {
                        let processedImage = imageData;
                        if (attempt.preprocess === true) {
                            processedImage = await this.preprocessImage(imageData);
                        } else if (attempt.preprocess === 'high_contrast') {
                            processedImage = await this.preprocessImageHighContrast(imageData);
                        }

                        const result = await Promise.race([
                            this.worker.recognize(processedImage),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('OCR timeout')), maxTime)
                            )
                        ]);

                        const avgConfidence = result.data.confidence;
                        console.log(`🔍 OCR attempt (${attempt.label}): ${avgConfidence.toFixed(1)}% confidence`);

                        if (avgConfidence > bestConfidence) {
                            bestResult = result;
                            bestConfidence = avgConfidence;
                        }

                        // If we get very high confidence, use it immediately
                        if (avgConfidence > 85) {
                            console.log(`✅ High confidence result found with ${attempt.label}`);
                            break;
                        }
                    } catch (error) {
                        console.warn(`⚠️ OCR attempt (${attempt.label}) failed:`, error.message);
                    }
                }

                if (!bestResult) {
                    throw new Error('All OCR attempts failed');
                }
            } else {
                let processedImage = imageData;
                if (preprocessImage) {
                    processedImage = await this.preprocessImage(imageData);
                }

                bestResult = await Promise.race([
                    this.worker.recognize(processedImage),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('OCR timeout')), maxTime)
                    )
                ]);
            }

            if (this.progressCallback) {
                this.progressCallback({
                    status: 'complete',
                    progress: 100,
                    message: 'Text recognition complete!'
                });
            }

            return this.formatOCRResult(bestResult, confidence);
        } catch (error) {
            console.error('OCR processing failed:', error);
            throw new Error(`Text recognition failed: ${error.message}`);
        }
    }

    async preprocessImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale up for better OCR (2x)
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                // Enhanced preprocessing: grayscale + contrast enhancement
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Convert to grayscale
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    
                    // Enhanced contrast with adaptive thresholding
                    const enhanced = gray < 128 ? Math.max(0, gray - 20) : Math.min(255, gray + 40);
                    
                    data[i] = enhanced;
                    data[i + 1] = enhanced;
                    data[i + 2] = enhanced;
                }
                
                ctx.putImageData(imageDataObj, 0, 0);
                resolve(canvas.toDataURL('image/png', 1.0)); // PNG for better quality
            };
            
            this.loadImage(img, imageData);
        });
    }

    async preprocessImageHighContrast(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                // High contrast black/white conversion
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const binary = gray > 140 ? 255 : 0; // Aggressive thresholding
                    
                    data[i] = binary;
                    data[i + 1] = binary;
                    data[i + 2] = binary;
                }
                
                ctx.putImageData(imageDataObj, 0, 0);
                resolve(canvas.toDataURL('image/png', 1.0));
            };
            
            this.loadImage(img, imageData);
        });
    }

    async preprocessImageDenoise(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                const width = canvas.width;
                const height = canvas.height;
                
                // Simple noise reduction with median filter
                const newData = new Uint8ClampedArray(data);
                
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = (y * width + x) * 4;
                        
                        // Get surrounding pixels for median filter
                        const values = [];
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const sampleIdx = ((y + dy) * width + (x + dx)) * 4;
                                const gray = Math.round(0.299 * data[sampleIdx] + 0.587 * data[sampleIdx + 1] + 0.114 * data[sampleIdx + 2]);
                                values.push(gray);
                            }
                        }
                        
                        values.sort((a, b) => a - b);
                        const median = values[4]; // Middle value of 9 samples
                        
                        newData[idx] = median;
                        newData[idx + 1] = median;
                        newData[idx + 2] = median;
                    }
                }
                
                const newImageData = new ImageData(newData, width, height);
                ctx.putImageData(newImageData, 0, 0);
                resolve(canvas.toDataURL('image/png', 1.0));
            };
            
            this.loadImage(img, imageData);
        });
    }

    loadImage(img, imageData) {
        if (typeof imageData === 'string') {
            img.src = imageData;
        } else if (imageData instanceof File || imageData instanceof Blob) {
            img.src = URL.createObjectURL(imageData);
        } else {
            img.src = imageData;
        }
    }

    formatOCRResult(result, minConfidence) {
        const words = result.data.words
            .filter(word => word.confidence >= minConfidence)
            .map(word => ({
                text: word.text.trim(),
                confidence: Math.round(word.confidence),
                bbox: word.bbox
            }))
            .filter(word => word.text.length > 0);

        const lines = result.data.lines
            .filter(line => line.confidence >= minConfidence)
            .map(line => ({
                text: line.text.trim(),
                confidence: Math.round(line.confidence),
                words: line.words.length
            }))
            .filter(line => line.text.length > 0);

        return {
            fullText: result.data.text.trim(),
            confidence: Math.round(result.data.confidence),
            words: words,
            lines: lines,
            processingTime: Date.now(),
            wordCount: words.length,
            averageConfidence: words.length > 0 
                ? Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length)
                : 0
        };
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            console.log('OCR processor terminated');
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentProgress: this.currentProgress,
            hasWorker: !!this.worker
        };
    }
}

export default OCRProcessor;