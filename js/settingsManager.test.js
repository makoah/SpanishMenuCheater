/**
 * Tests for SettingsManager - OCR Settings Interface Controller
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import SettingsManager from './settingsManager.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

// Mock DOM elements
const createMockElement = (id, type = 'div') => {
    const element = {
        id,
        type,
        value: '',
        textContent: '',
        innerHTML: '',
        className: '',
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        },
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        focus: jest.fn(),
        click: jest.fn(),
        dispatchEvent: jest.fn(),
        querySelector: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        parentNode: null,
        checked: false,
        disabled: false
    };
    return element;
};

// Mock document
const documentMock = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    createElement: jest.fn(() => createMockElement('mock')),
    body: createMockElement('body'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

Object.defineProperty(global, 'document', {
    value: documentMock,
    writable: true
});

// Mock URL and Blob for file downloads
global.URL = {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
};

global.Blob = jest.fn().mockImplementation((content, options) => ({
    content,
    options,
    size: content[0].length,
    type: options.type
}));

describe('SettingsManager', () => {
    let settingsManager;
    let mockElements;
    let mockUsageTracker;
    let mockGoogleVisionOCR;

    beforeEach(() => {
        settingsManager = new SettingsManager();
        
        // Create mock DOM elements
        mockElements = {
            modal: createMockElement('ocr-settings-modal'),
            settingsBtn: createMockElement('settings-btn', 'button'),
            closeBtn: createMockElement('settings-close', 'button'),
            saveBtn: createMockElement('settings-save', 'button'),
            apiKeyInput: createMockElement('google-vision-api-key', 'input'),
            toggleVisibilityBtn: createMockElement('toggle-api-key-visibility', 'button'),
            testApiKeyBtn: createMockElement('test-api-key', 'button'),
            clearApiKeyBtn: createMockElement('clear-api-key', 'button'),
            apiKeyStatus: createMockElement('api-key-status'),
            usagePercentage: createMockElement('usage-percentage'),
            usageProgress: createMockElement('usage-progress'),
            usageCurrent: createMockElement('usage-current'),
            usageLimit: createMockElement('usage-limit'),
            usageCost: createMockElement('usage-cost'),
            monthlyLimitInput: createMockElement('monthly-limit', 'input'),
            limitCost: createMockElement('limit-cost'),
            enableNotifications: createMockElement('enable-notifications', 'checkbox'),
            autoFallback: createMockElement('auto-fallback', 'checkbox'),
            showProcessingSource: createMockElement('show-processing-source', 'checkbox'),
            statSuccessRate: createMockElement('stat-success-rate'),
            statAvgTime: createMockElement('stat-avg-time'),
            statTotalProcessed: createMockElement('stat-total-processed'),
            statDaysRemaining: createMockElement('stat-days-remaining'),
            resetUsageBtn: createMockElement('reset-usage-btn', 'button'),
            exportStatsBtn: createMockElement('export-stats-btn', 'button')
        };

        // Mock document.getElementById
        documentMock.getElementById.mockImplementation((id) => {
            return mockElements[id.replace(/[-]/g, '').replace('google', '').replace('vision', '').replace('api', '').replace('key', '')] || 
                   mockElements[id.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] ||
                   mockElements.modal;
        });

        // Mock usage tracker
        mockUsageTracker = {
            isInitialized: true,
            settings: {
                monthlyLimit: 500,
                notifications: true
            },
            getCurrentUsage: jest.fn(() => ({
                apiCalls: 150,
                percentage: 30,
                estimatedCost: 0.23,
                successRate: 95,
                averageProcessingTime: 2000,
                settings: { monthlyLimit: 500 }
            })),
            getUsageSummary: jest.fn(() => ({
                remaining: { days: 15 }
            })),
            updateSettings: jest.fn(),
            resetAllUsage: jest.fn(),
            getHistoricalUsage: jest.fn(() => [])
        };

        // Mock Google Vision OCR
        mockGoogleVisionOCR = {
            processImage: jest.fn()
        };

        // Clear localStorage and mocks
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        settingsManager.cleanup();
    });

    describe('Initialization', () => {
        test('should initialize successfully with dependencies', async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });

            expect(settingsManager.usageTracker).toBe(mockUsageTracker);
            expect(settingsManager.googleVisionOCR).toBe(mockGoogleVisionOCR);
        });

        test('should initialize DOM elements', async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });

            expect(documentMock.getElementById).toHaveBeenCalledWith('ocr-settings-modal');
            expect(documentMock.getElementById).toHaveBeenCalledWith('settings-btn');
        });

        test('should handle initialization without dependencies', async () => {
            await expect(settingsManager.initialize()).resolves.not.toThrow();
        });
    });

    describe('Modal Controls', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should open modal', async () => {
            await settingsManager.openModal();

            expect(mockElements.modal.classList.remove).toHaveBeenCalledWith('hidden');
        });

        test('should close modal', () => {
            settingsManager.closeModal();

            expect(mockElements.modal.classList.add).toHaveBeenCalledWith('hidden');
        });

        test('should focus API key input when opening modal if empty', async () => {
            mockElements.apiKeyInput.value = '';

            await settingsManager.openModal();

            // Wait for setTimeout
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockElements.apiKeyInput.focus).toHaveBeenCalled();
        });
    });

    describe('API Key Management', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should validate API key format', () => {
            expect(settingsManager.isValidApiKeyFormat('AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
            expect(settingsManager.isValidApiKeyFormat('invalid-key')).toBe(false);
            expect(settingsManager.isValidApiKeyFormat('')).toBe(false);
        });

        test('should handle API key changes', () => {
            mockElements.apiKeyInput.value = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            
            settingsManager.onApiKeyChange();

            expect(mockElements.testApiKeyBtn.disabled).toBe(false);
        });

        test('should toggle API key visibility', () => {
            mockElements.apiKeyInput.type = 'password';

            settingsManager.toggleApiKeyVisibility();

            expect(mockElements.apiKeyInput.type).toBe('text');
            expect(mockElements.toggleVisibilityBtn.textContent).toBe('🙈');

            settingsManager.toggleApiKeyVisibility();

            expect(mockElements.apiKeyInput.type).toBe('password');
            expect(mockElements.toggleVisibilityBtn.textContent).toBe('👁️');
        });

        test('should clear API key', () => {
            mockElements.apiKeyInput.value = 'test-key';

            settingsManager.clearApiKey();

            expect(mockElements.apiKeyInput.value).toBe('');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_vision_api_key');
        });

        test('should store and retrieve API key', () => {
            const testKey = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

            settingsManager.storeApiKey(testKey);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('google_vision_api_key', testKey);

            localStorageMock.getItem.mockReturnValue(testKey);
            const retrievedKey = settingsManager.getStoredApiKey();
            expect(retrievedKey).toBe(testKey);
        });

        test('should handle API key storage errors gracefully', () => {
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            expect(() => settingsManager.storeApiKey('test')).toThrow('Failed to save API key');
        });
    });

    describe('API Key Testing', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should test valid API key', async () => {
            const mockGoogleVisionOCR = {
                processImage: jest.fn().mockResolvedValue({ text: 'test', confidence: 95 })
            };

            // Mock dynamic import
            jest.doMock('./googleVisionOCR.js', () => ({
                default: jest.fn().mockImplementation(() => ({
                    initialize: jest.fn(),
                    processImage: mockGoogleVisionOCR.processImage
                }))
            }));

            mockElements.apiKeyInput.value = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

            await settingsManager.testApiKey();

            expect(settingsManager.isApiKeyValid).toBe(true);
        });

        test('should handle API key test errors', async () => {
            // Mock dynamic import that throws error
            jest.doMock('./googleVisionOCR.js', () => ({
                default: jest.fn().mockImplementation(() => ({
                    initialize: jest.fn(),
                    processImage: jest.fn().mockRejectedValue(new Error('API_KEY_INVALID'))
                }))
            }));

            mockElements.apiKeyInput.value = 'invalid-key';

            await settingsManager.testApiKey();

            expect(settingsManager.isApiKeyValid).toBe(false);
        });

        test('should prevent multiple simultaneous tests', async () => {
            settingsManager.isTestingApiKey = true;

            await settingsManager.testApiKey();

            expect(mockElements.testApiKeyBtn.disabled).not.toHaveBeenCalled();
        });
    });

    describe('Usage Display', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should update usage display', async () => {
            await settingsManager.updateUsageDisplay();

            expect(mockElements.usagePercentage.textContent).toBe('30%');
            expect(mockElements.usageCurrent.textContent).toBe('150');
            expect(mockElements.usageLimit.textContent).toBe('500');
            expect(mockElements.usageCost.textContent).toBe('$0.23');
            expect(mockElements.statSuccessRate.textContent).toBe('95%');
            expect(mockElements.statTotalProcessed.textContent).toBe('150');
        });

        test('should handle missing usage tracker gracefully', async () => {
            settingsManager.usageTracker = null;

            await expect(settingsManager.updateUsageDisplay()).resolves.not.toThrow();
        });

        test('should update limit cost calculation', () => {
            mockElements.monthlyLimitInput.value = '1000';
            mockUsageTracker.settings.costPerCall = 0.0015;

            settingsManager.updateLimitCost();

            expect(mockElements.limitCost.textContent).toBe('$1.50');
        });
    });

    describe('Settings Persistence', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should save settings', async () => {
            mockElements.apiKeyInput.value = 'test-key';
            mockElements.monthlyLimitInput.value = '1000';
            mockElements.enableNotifications.checked = false;
            mockElements.autoFallback.checked = true;
            mockElements.showProcessingSource.checked = true;

            await settingsManager.saveSettings();

            expect(localStorageMock.setItem).toHaveBeenCalledWith('google_vision_api_key', 'test-key');
            expect(mockUsageTracker.updateSettings).toHaveBeenCalledWith({
                monthlyLimit: 1000,
                notifications: false
            });
        });

        test('should load settings', async () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'google_vision_api_key') return 'stored-key';
                if (key === 'ocr_processing_options') return JSON.stringify({
                    autoFallback: false,
                    showProcessingSource: true
                });
                return null;
            });

            await settingsManager.loadSettings();

            expect(mockElements.apiKeyInput.value).toBe('stored-key');
            expect(mockElements.autoFallback.checked).toBe(false);
            expect(mockElements.showProcessingSource.checked).toBe(true);
        });

        test('should handle corrupted settings gracefully', async () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'ocr_processing_options') return 'invalid-json';
                return null;
            });

            await expect(settingsManager.loadSettings()).resolves.not.toThrow();
        });
    });

    describe('Statistics Management', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should reset usage data with confirmation', async () => {
            global.confirm = jest.fn(() => true);

            await settingsManager.resetUsageData();

            expect(mockUsageTracker.resetAllUsage).toHaveBeenCalled();
        });

        test('should not reset usage data without confirmation', async () => {
            global.confirm = jest.fn(() => false);

            await settingsManager.resetUsageData();

            expect(mockUsageTracker.resetAllUsage).not.toHaveBeenCalled();
        });

        test('should export statistics', () => {
            // Mock Date
            const mockDate = new Date('2024-06-15T10:00:00Z');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

            const mockAnchor = createMockElement('a');
            documentMock.createElement.mockImplementation((tag) => {
                if (tag === 'a') return mockAnchor;
                return createMockElement('mock');
            });

            settingsManager.exportStatistics();

            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(mockAnchor.download).toBe('ocr-usage-stats-2024-06-15.json');
            expect(documentMock.body.appendChild).toHaveBeenCalledWith(mockAnchor);
            expect(mockAnchor.click).toHaveBeenCalled();
            expect(documentMock.body.removeChild).toHaveBeenCalledWith(mockAnchor);

            // Restore Date
            global.Date.mockRestore();
        });

        test('should handle export errors gracefully', () => {
            settingsManager.usageTracker = null;

            expect(() => settingsManager.exportStatistics()).not.toThrow();
        });
    });

    describe('Notifications', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should show notification', () => {
            const mockNotification = createMockElement('notification');
            documentMock.createElement.mockReturnValue(mockNotification);

            settingsManager.showNotification('Test message', 'success');

            expect(documentMock.body.appendChild).toHaveBeenCalledWith(mockNotification);
            expect(mockNotification.innerHTML).toContain('Test message');
        });

        test('should auto-remove notifications', (done) => {
            const mockNotification = createMockElement('notification');
            mockNotification.parentNode = documentMock.body;
            documentMock.createElement.mockReturnValue(mockNotification);

            settingsManager.showNotification('Test message');

            // Fast-forward time for auto-removal
            setTimeout(() => {
                expect(mockNotification.classList.remove).toHaveBeenCalledWith('show');
                done();
            }, 3100);
        }, 5000);
    });

    describe('Event Listeners', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should attach event listeners', () => {
            expect(mockElements.settingsBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockElements.closeBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockElements.apiKeyInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
            expect(mockElements.testApiKeyBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should clean up event listeners', () => {
            settingsManager.cleanup();

            expect(settingsManager.eventListeners).toEqual([]);
            expect(settingsManager.usageTracker).toBeNull();
            expect(settingsManager.googleVisionOCR).toBeNull();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await settingsManager.initialize({
                usageTracker: mockUsageTracker,
                googleVisionOCR: mockGoogleVisionOCR
            });
        });

        test('should handle API key status update errors gracefully', () => {
            // Simulate DOM element not found
            settingsManager.elements.apiKeyStatus = null;

            expect(() => settingsManager.updateApiKeyStatus('success', 'Test')).not.toThrow();
        });

        test('should handle settings save errors gracefully', async () => {
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage error');
            });

            await expect(settingsManager.saveSettings()).resolves.not.toThrow();
        });

        test('should handle initialization errors gracefully', async () => {
            documentMock.getElementById.mockImplementation(() => {
                throw new Error('DOM error');
            });

            await expect(settingsManager.initialize()).rejects.toThrow();
        });
    });
});