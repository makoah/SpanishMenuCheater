import { jest } from '@jest/globals';
import CameraManager from './cameraManager.js';

describe('CameraManager', () => {
    let cameraManager;
    let mockStream;
    let mockVideoTrack;
    let mockPermissions;

    beforeEach(() => {
        cameraManager = new CameraManager();
        
        mockVideoTrack = {
            stop: jest.fn(),
            getSettings: jest.fn(() => ({ width: 1280, height: 720 }))
        };
        
        mockStream = {
            getTracks: jest.fn(() => [mockVideoTrack]),
            getVideoTracks: jest.fn(() => [mockVideoTrack])
        };

        mockPermissions = {
            query: jest.fn()
        };

        Object.defineProperty(global.navigator, 'permissions', {
            value: mockPermissions,
            configurable: true
        });

        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: {
                getUserMedia: jest.fn()
            },
            configurable: true
        });
    });

    afterEach(() => {
        cameraManager.cleanup();
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with correct default state', () => {
            expect(cameraManager.stream).toBeNull();
            expect(cameraManager.video).toBeNull();
            expect(cameraManager.canvas).toBeNull();
            expect(cameraManager.isInitialized).toBe(false);
        });
    });

    describe('checkPermissions', () => {
        test('should return camera permission state when supported', async () => {
            mockPermissions.query.mockResolvedValue({ state: 'granted' });
            
            const result = await cameraManager.checkPermissions();
            
            expect(result).toBe('granted');
            expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'camera' });
        });

        test('should return unsupported when permissions API not available', async () => {
            mockPermissions.query.mockRejectedValue(new Error('Not supported'));
            
            const result = await cameraManager.checkPermissions();
            
            expect(result).toBe('unsupported');
        });
    });

    describe('isSupported', () => {
        test('should return true when MediaDevices API is available', () => {
            expect(cameraManager.isSupported()).toBe(true);
        });

        test('should return false when MediaDevices API is not available', () => {
            Object.defineProperty(global.navigator, 'mediaDevices', {
                value: undefined,
                configurable: true
            });
            
            expect(cameraManager.isSupported()).toBe(false);
        });
    });

    describe('requestCameraAccess', () => {
        test('should successfully request camera access', async () => {
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            
            const result = await cameraManager.requestCameraAccess();
            
            expect(result).toBe(true);
            expect(cameraManager.stream).toBe(mockStream);
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
        });

        test('should throw error when camera API not supported', async () => {
            Object.defineProperty(global.navigator, 'mediaDevices', {
                value: undefined,
                configurable: true
            });
            
            await expect(cameraManager.requestCameraAccess())
                .rejects.toThrow('Camera API not supported in this browser');
        });

        test('should handle permission denied error', async () => {
            const permissionError = new Error('Permission denied');
            permissionError.name = 'NotAllowedError';
            navigator.mediaDevices.getUserMedia.mockRejectedValue(permissionError);
            
            await expect(cameraManager.requestCameraAccess()).rejects.toThrow();
        });
    });

    describe('getCameraErrorInfo', () => {
        test('should return correct error info for NotAllowedError', () => {
            const error = new Error('Permission denied');
            error.name = 'NotAllowedError';
            
            const errorInfo = cameraManager.getCameraErrorInfo(error);
            
            expect(errorInfo.type).toBe('permission_denied');
            expect(errorInfo.canRetry).toBe(true);
            expect(errorInfo.fallbackOptions).toContain('manual_input');
        });

        test('should return correct error info for NotFoundError', () => {
            const error = new Error('No camera');
            error.name = 'NotFoundError';
            
            const errorInfo = cameraManager.getCameraErrorInfo(error);
            
            expect(errorInfo.type).toBe('no_camera');
            expect(errorInfo.canRetry).toBe(false);
        });

        test('should return default error info for unknown errors', () => {
            const error = new Error('Unknown error');
            error.name = 'UnknownError';
            
            const errorInfo = cameraManager.getCameraErrorInfo(error);
            
            expect(errorInfo.type).toBe('unknown');
            expect(errorInfo.canRetry).toBe(true);
        });
    });

    describe('stopCamera', () => {
        test('should stop all tracks and reset stream', () => {
            cameraManager.stream = mockStream;
            cameraManager.isInitialized = true;
            
            cameraManager.stopCamera();
            
            expect(mockVideoTrack.stop).toHaveBeenCalled();
            expect(cameraManager.stream).toBeNull();
            expect(cameraManager.isInitialized).toBe(false);
        });

        test('should handle null stream gracefully', () => {
            cameraManager.stream = null;
            
            expect(() => cameraManager.stopCamera()).not.toThrow();
        });
    });

    describe('cleanup', () => {
        test('should clean up all resources', () => {
            cameraManager.stream = mockStream;
            cameraManager.video = document.createElement('video');
            cameraManager.canvas = document.createElement('canvas');
            
            cameraManager.cleanup();
            
            expect(cameraManager.stream).toBeNull();
            expect(cameraManager.video).toBeNull();
            expect(cameraManager.canvas).toBeNull();
        });
    });

    describe('getStreamSettings', () => {
        test('should return video track settings when stream exists', () => {
            cameraManager.stream = mockStream;
            
            const settings = cameraManager.getStreamSettings();
            
            expect(settings).toEqual({ width: 1280, height: 720 });
            expect(mockVideoTrack.getSettings).toHaveBeenCalled();
        });

        test('should return null when no stream exists', () => {
            cameraManager.stream = null;
            
            const settings = cameraManager.getStreamSettings();
            
            expect(settings).toBeNull();
        });
    });
});