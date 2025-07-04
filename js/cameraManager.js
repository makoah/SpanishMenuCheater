class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.isInitialized = false;
    }

    async checkPermissions() {
        try {
            const permissions = await navigator.permissions.query({ name: 'camera' });
            return permissions.state;
        } catch (error) {
            return 'unsupported';
        }
    }

    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    async requestCameraAccess() {
        if (!this.isSupported()) {
            throw new Error('Camera API not supported in this browser');
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            return true;
        } catch (error) {
            this.handleCameraError(error);
            throw error;
        }
    }

    handleCameraError(error) {
        const errorInfo = this.getCameraErrorInfo(error);
        console.error('Camera error:', errorInfo.message);
        return errorInfo;
    }

    getCameraErrorInfo(error) {
        switch (error.name) {
            case 'NotAllowedError':
                return {
                    type: 'permission_denied',
                    message: 'Camera permission denied by user',
                    userMessage: 'Please allow camera access to take photos of menus',
                    canRetry: true,
                    fallbackOptions: ['manual_input']
                };
            case 'NotFoundError':
                return {
                    type: 'no_camera',
                    message: 'No camera found on device',
                    userMessage: 'No camera found on your device',
                    canRetry: false,
                    fallbackOptions: ['manual_input']
                };
            case 'NotSupportedError':
                return {
                    type: 'not_supported',
                    message: 'Camera not supported by browser',
                    userMessage: 'Camera not supported in this browser',
                    canRetry: false,
                    fallbackOptions: ['manual_input', 'browser_update']
                };
            case 'NotReadableError':
                return {
                    type: 'camera_busy',
                    message: 'Camera already in use by another application',
                    userMessage: 'Camera is being used by another app. Please close other camera apps and try again.',
                    canRetry: true,
                    fallbackOptions: ['manual_input']
                };
            case 'OverconstrainedError':
                return {
                    type: 'constraints_error',
                    message: 'Camera constraints cannot be satisfied',
                    userMessage: 'Camera settings not supported. Trying alternative settings.',
                    canRetry: true,
                    fallbackOptions: ['lower_quality', 'manual_input']
                };
            default:
                return {
                    type: 'unknown',
                    message: `Unknown camera error: ${error.message}`,
                    userMessage: 'Camera access failed. Please try again or enter text manually.',
                    canRetry: true,
                    fallbackOptions: ['manual_input']
                };
        }
    }

    async requestCameraAccessWithFallback() {
        const constraints = [
            {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            },
            {
                video: true
            }
        ];

        for (const constraint of constraints) {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraint);
                return { success: true, constraint };
            } catch (error) {
                if (error.name === 'OverconstrainedError' && constraint !== constraints[constraints.length - 1]) {
                    continue;
                }
                const errorInfo = this.handleCameraError(error);
                throw { ...error, errorInfo };
            }
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        this.isInitialized = false;
    }

    async initializeVideo(videoElement) {
        if (!this.stream) {
            await this.requestCameraAccess();
        }

        this.video = videoElement;
        this.video.srcObject = this.stream;
        
        return new Promise((resolve, reject) => {
            this.video.onloadedmetadata = () => {
                this.video.play()
                    .then(() => {
                        this.isInitialized = true;
                        resolve();
                    })
                    .catch(reject);
            };
            this.video.onerror = reject;
        });
    }

    async capturePhoto() {
        if (!this.isInitialized || !this.video) {
            throw new Error('Camera not initialized');
        }

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }

        const video = this.video;
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;

        const context = this.canvas.getContext('2d');
        context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

        return new Promise((resolve) => {
            this.canvas.toBlob((blob) => {
                resolve({
                    blob,
                    dataUrl: this.canvas.toDataURL('image/jpeg', 0.8),
                    width: this.canvas.width,
                    height: this.canvas.height
                });
            }, 'image/jpeg', 0.8);
        });
    }

    getVideoElement() {
        return this.video;
    }

    getStreamSettings() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        return videoTrack ? videoTrack.getSettings() : null;
    }

    cleanup() {
        this.stopCamera();
        this.video = null;
        this.canvas = null;
    }
}

export default CameraManager;