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
            this.worker = await Tesseract.createWorker();

            await this.worker.loadLanguage('spa');
            await this.worker.initialize('spa');
            
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ0123456789€$.,;:()[]{}¿?¡!-_/\\ ',
                tessedit_pageseg_mode: '3', // PSM.AUTO equivalent
                preserve_interword_spaces: '1'
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
            confidence = 30,
            maxTime = 30000
        } = options;

        try {
            if (this.progressCallback) {
                this.progressCallback({
                    status: 'starting',
                    progress: 0,
                    message: 'Starting text recognition...'
                });
            }

            let processedImage = imageData;
            if (preprocessImage) {
                processedImage = await this.preprocessImage(imageData);
            }

            const result = await Promise.race([
                this.worker.recognize(processedImage),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('OCR timeout')), maxTime)
                )
            ]);

            if (this.progressCallback) {
                this.progressCallback({
                    status: 'complete',
                    progress: 100,
                    message: 'Text recognition complete!'
                });
            }

            return this.formatOCRResult(result, confidence);
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
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
                    
                    data[i] = enhanced;
                    data[i + 1] = enhanced;
                    data[i + 2] = enhanced;
                }
                
                ctx.putImageData(imageDataObj, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            
            if (typeof imageData === 'string') {
                img.src = imageData;
            } else if (imageData instanceof File || imageData instanceof Blob) {
                img.src = URL.createObjectURL(imageData);
            } else {
                img.src = imageData;
            }
        });
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