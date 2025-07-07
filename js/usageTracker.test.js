/**
 * Tests for UsageTracker - Google Vision API Usage Monitoring and Cost Control
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import UsageTracker from './usageTracker.js';

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

describe('UsageTracker', () => {
    let usageTracker;
    let mockCallbacks;

    beforeEach(() => {
        usageTracker = new UsageTracker();
        mockCallbacks = {
            onUsageUpdate: jest.fn(),
            onWarning: jest.fn(),
            onLimitReached: jest.fn()
        };
        
        // Clear localStorage
        localStorageMock.clear();
        jest.clearAllMocks();
        
        // Mock Date to have consistent tests
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-06-15T10:00:00Z')); // Mid-month for testing
    });

    afterEach(() => {
        jest.useRealTimers();
        usageTracker.cleanup();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(usageTracker.isInitialized).toBe(false);
            expect(usageTracker.settings.monthlyLimit).toBe(500);
            expect(usageTracker.settings.costPerCall).toBe(0.0015);
            expect(usageTracker.currentUsage.apiCalls).toBe(0);
        });

        test('should initialize successfully with default settings', async () => {
            await usageTracker.initialize();
            
            expect(usageTracker.isInitialized).toBe(true);
            expect(usageTracker.currentUsage.month).toBe(5); // June (0-indexed)
            expect(usageTracker.currentUsage.year).toBe(2024);
        });

        test('should initialize with custom monthly limit', async () => {
            await usageTracker.initialize({ monthlyLimit: 1000 });
            
            expect(usageTracker.settings.monthlyLimit).toBe(1000);
        });

        test('should initialize with callbacks', async () => {
            await usageTracker.initialize({ callbacks: mockCallbacks });
            
            expect(usageTracker.callbacks.onUsageUpdate).toBe(mockCallbacks.onUsageUpdate);
            expect(usageTracker.callbacks.onWarning).toBe(mockCallbacks.onWarning);
            expect(usageTracker.callbacks.onLimitReached).toBe(mockCallbacks.onLimitReached);
        });

        test('should load existing usage data from storage', async () => {
            // Pre-populate localStorage with usage data
            const existingUsage = {
                month: 5,
                year: 2024,
                apiCalls: 50,
                successfulCalls: 45,
                failedCalls: 5
            };
            localStorageMock.setItem.mockReturnValue(undefined);
            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingUsage));
            
            await usageTracker.initialize();
            
            expect(usageTracker.currentUsage.apiCalls).toBe(50);
            expect(usageTracker.currentUsage.successfulCalls).toBe(45);
            expect(usageTracker.currentUsage.failedCalls).toBe(5);
        });

        test('should handle corrupted storage data gracefully', async () => {
            localStorageMock.getItem.mockReturnValue('invalid-json');
            
            await usageTracker.initialize();
            
            expect(usageTracker.isInitialized).toBe(true);
            expect(usageTracker.currentUsage.apiCalls).toBe(0);
        });
    });

    describe('Monthly Reset', () => {
        test('should reset usage for new month', () => {
            usageTracker.currentUsage = {
                month: 4, // May
                year: 2024,
                apiCalls: 100,
                successfulCalls: 95,
                failedCalls: 5
            };
            
            usageTracker.checkMonthlyReset();
            
            expect(usageTracker.currentUsage.month).toBe(5); // June
            expect(usageTracker.currentUsage.year).toBe(2024);
            expect(usageTracker.currentUsage.apiCalls).toBe(0);
            expect(usageTracker.currentUsage.successfulCalls).toBe(0);
            expect(usageTracker.currentUsage.failedCalls).toBe(0);
        });

        test('should not reset if already current month', () => {
            usageTracker.currentUsage = {
                month: 5, // June (current)
                year: 2024,
                apiCalls: 100
            };
            
            usageTracker.checkMonthlyReset();
            
            expect(usageTracker.currentUsage.apiCalls).toBe(100); // Should not reset
        });

        test('should reset for new year', () => {
            // Set fake date to January of next year
            jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
            
            usageTracker.currentUsage = {
                month: 11, // December 2024
                year: 2024,
                apiCalls: 100
            };
            
            usageTracker.checkMonthlyReset();
            
            expect(usageTracker.currentUsage.month).toBe(0); // January
            expect(usageTracker.currentUsage.year).toBe(2025);
            expect(usageTracker.currentUsage.apiCalls).toBe(0);
        });

        test('should archive previous month data', async () => {
            usageTracker.currentUsage = {
                month: 4, // May
                year: 2024,
                apiCalls: 150,
                successfulCalls: 140,
                failedCalls: 10
            };
            
            await usageTracker.archivePreviousMonth(usageTracker.currentUsage);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'google_vision_usage_archive',
                expect.stringContaining('"apiCalls":150')
            );
        });
    });

    describe('API Call Recording', () => {
        beforeEach(async () => {
            await usageTracker.initialize({ callbacks: mockCallbacks });
        });

        test('should record successful API call', async () => {
            await usageTracker.recordAPICall({
                success: true,
                processingTime: 1500,
                confidence: 85
            });
            
            expect(usageTracker.currentUsage.apiCalls).toBe(1);
            expect(usageTracker.currentUsage.successfulCalls).toBe(1);
            expect(usageTracker.currentUsage.failedCalls).toBe(0);
            expect(usageTracker.currentUsage.totalProcessingTime).toBe(1500);
        });

        test('should record failed API call', async () => {
            await usageTracker.recordAPICall({
                success: false,
                errorType: 'network_error'
            });
            
            expect(usageTracker.currentUsage.apiCalls).toBe(1);
            expect(usageTracker.currentUsage.successfulCalls).toBe(0);
            expect(usageTracker.currentUsage.failedCalls).toBe(1);
        });

        test('should call usage update callback', async () => {
            await usageTracker.recordAPICall({ success: true });
            
            expect(mockCallbacks.onUsageUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiCalls: 1,
                    percentage: expect.any(Number),
                    estimatedCost: expect.any(Number)
                })
            );
        });

        test('should save usage data to localStorage', async () => {
            await usageTracker.recordAPICall({ success: true });
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'google_vision_usage',
                expect.stringContaining('"apiCalls":1')
            );
        });

        test('should handle recording when not initialized', async () => {
            const uninitializedTracker = new UsageTracker();
            
            // Should not throw error
            await expect(uninitializedTracker.recordAPICall({ success: true }))
                .resolves.not.toThrow();
        });
    });

    describe('Usage Limits and Warnings', () => {
        beforeEach(async () => {
            await usageTracker.initialize({ 
                callbacks: mockCallbacks,
                monthlyLimit: 100 // Lower limit for easier testing
            });
        });

        test('should trigger warning at 50% usage', async () => {
            // Record 50 API calls (50% of 100 limit)
            for (let i = 0; i < 50; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            expect(mockCallbacks.onWarning).toHaveBeenCalledWith(
                expect.objectContaining({
                    threshold: 50,
                    currentUsage: 50,
                    limit: 100,
                    percentage: 50
                })
            );
        });

        test('should trigger warning at 80% usage', async () => {
            // Record 80 API calls (80% of 100 limit)
            for (let i = 0; i < 80; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            expect(mockCallbacks.onWarning).toHaveBeenCalledWith(
                expect.objectContaining({
                    threshold: 80,
                    percentage: 80
                })
            );
        });

        test('should trigger limit reached callback', async () => {
            // Record 100 API calls (100% of limit)
            for (let i = 0; i < 100; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            expect(mockCallbacks.onLimitReached).toHaveBeenCalledWith(
                expect.objectContaining({
                    currentUsage: 100,
                    limit: 100,
                    percentage: 100
                })
            );
        });

        test('should not show same warning twice in same month', async () => {
            // Trigger 50% warning
            for (let i = 0; i < 50; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            // Record one more call - should not trigger 50% warning again
            await usageTracker.recordAPICall({ success: true });
            
            expect(mockCallbacks.onWarning).toHaveBeenCalledTimes(1);
        });

        test('should respect usage limit', async () => {
            // Record calls up to limit
            for (let i = 0; i < 100; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            expect(usageTracker.isUsageAllowed()).toBe(false);
        });

        test('should allow usage when under limit', async () => {
            await usageTracker.recordAPICall({ success: true });
            
            expect(usageTracker.isUsageAllowed()).toBe(true);
        });

        test('should disable warnings when notifications disabled', async () => {
            await usageTracker.updateSettings({ notifications: false });
            
            // Record 50 API calls - should not trigger warning
            for (let i = 0; i < 50; i++) {
                await usageTracker.recordAPICall({ success: true });
            }
            
            expect(mockCallbacks.onWarning).not.toHaveBeenCalled();
        });
    });

    describe('Usage Statistics', () => {
        beforeEach(async () => {
            await usageTracker.initialize();
        });

        test('should calculate usage percentage correctly', () => {
            usageTracker.currentUsage.apiCalls = 250;
            
            expect(usageTracker.getUsagePercentage()).toBe(50);
        });

        test('should calculate estimated cost correctly', () => {
            usageTracker.currentUsage.apiCalls = 1000;
            
            expect(usageTracker.getEstimatedCost()).toBe(1.5); // 1000 * 0.0015
        });

        test('should calculate average processing time', () => {
            usageTracker.currentUsage.apiCalls = 4;
            usageTracker.currentUsage.totalProcessingTime = 8000;
            
            expect(usageTracker.getAverageProcessingTime()).toBe(2000);
        });

        test('should calculate success rate', () => {
            usageTracker.currentUsage.apiCalls = 100;
            usageTracker.currentUsage.successfulCalls = 95;
            
            expect(usageTracker.getSuccessRate()).toBe(95);
        });

        test('should handle zero usage gracefully', () => {
            expect(usageTracker.getUsagePercentage()).toBe(0);
            expect(usageTracker.getEstimatedCost()).toBe(0);
            expect(usageTracker.getAverageProcessingTime()).toBe(0);
            expect(usageTracker.getSuccessRate()).toBe(100);
        });

        test('should get current usage summary', () => {
            usageTracker.currentUsage.apiCalls = 100;
            usageTracker.currentUsage.successfulCalls = 95;
            usageTracker.currentUsage.failedCalls = 5;
            
            const usage = usageTracker.getCurrentUsage();
            
            expect(usage).toEqual(
                expect.objectContaining({
                    apiCalls: 100,
                    percentage: 20, // 100/500
                    remaining: 400,
                    estimatedCost: 0.15,
                    successRate: 95
                })
            );
        });
    });

    describe('Projected Usage', () => {
        beforeEach(async () => {
            await usageTracker.initialize();
        });

        test('should calculate projected monthly usage', () => {
            // Mock date to 15th of month (mid-month)
            jest.setSystemTime(new Date('2024-06-15T10:00:00Z'));
            usageTracker.currentUsage.apiCalls = 150; // 150 calls in 15 days
            
            const projected = usageTracker.getProjectedMonthlyUsage();
            
            // 150 calls in 15 days = 300 calls projected for 30 days
            expect(projected).toBe(300);
        });

        test('should get days remaining in month', () => {
            jest.setSystemTime(new Date('2024-06-15T10:00:00Z')); // June 15th
            
            const daysRemaining = usageTracker.getDaysRemainingInMonth();
            
            expect(daysRemaining).toBe(15); // June has 30 days, 30-15=15
        });

        test('should get comprehensive usage summary', () => {
            jest.setSystemTime(new Date('2024-06-15T10:00:00Z'));
            usageTracker.currentUsage.apiCalls = 150;
            usageTracker.currentUsage.successfulCalls = 140;
            usageTracker.currentUsage.failedCalls = 10;
            usageTracker.currentUsage.totalProcessingTime = 300000;
            
            const summary = usageTracker.getUsageSummary();
            
            expect(summary).toEqual(
                expect.objectContaining({
                    current: {
                        calls: 150,
                        percentage: 30,
                        cost: 0.23
                    },
                    limit: 500,
                    remaining: {
                        calls: 350,
                        days: 15
                    },
                    projected: {
                        calls: 300,
                        cost: 0.45,
                        overLimit: false
                    },
                    performance: {
                        successRate: 93,
                        averageTime: 2000
                    }
                })
            );
        });
    });

    describe('Settings Management', () => {
        beforeEach(async () => {
            await usageTracker.initialize();
        });

        test('should update settings', async () => {
            await usageTracker.updateSettings({
                monthlyLimit: 1000,
                costPerCall: 0.002
            });
            
            expect(usageTracker.settings.monthlyLimit).toBe(1000);
            expect(usageTracker.settings.costPerCall).toBe(0.002);
        });

        test('should save settings to localStorage', async () => {
            await usageTracker.updateSettings({ monthlyLimit: 1000 });
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'google_vision_settings',
                expect.stringContaining('"monthlyLimit":1000')
            );
        });

        test('should load settings from localStorage', async () => {
            const savedSettings = {
                monthlyLimit: 1000,
                costPerCall: 0.002
            };
            localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));
            
            await usageTracker.loadSettings();
            
            expect(usageTracker.settings.monthlyLimit).toBe(1000);
            expect(usageTracker.settings.costPerCall).toBe(0.002);
        });
    });

    describe('Data Management', () => {
        beforeEach(async () => {
            await usageTracker.initialize();
        });

        test('should reset all usage data', async () => {
            usageTracker.currentUsage.apiCalls = 100;
            
            await usageTracker.resetAllUsage();
            
            expect(usageTracker.currentUsage.apiCalls).toBe(0);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_vision_usage_warnings');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('google_vision_usage_archive');
        });

        test('should get historical usage data', () => {
            const mockHistory = [
                { month: 4, year: 2024, apiCalls: 300 },
                { month: 3, year: 2024, apiCalls: 250 }
            ];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));
            
            const history = usageTracker.getHistoricalUsage();
            
            expect(history).toEqual(mockHistory);
        });

        test('should handle missing historical data', () => {
            localStorageMock.getItem.mockReturnValue(null);
            
            const history = usageTracker.getHistoricalUsage();
            
            expect(history).toEqual([]);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources', () => {
            usageTracker.callbacks = mockCallbacks;
            usageTracker.isInitialized = true;
            
            usageTracker.cleanup();
            
            expect(usageTracker.callbacks.onUsageUpdate).toBeNull();
            expect(usageTracker.callbacks.onWarning).toBeNull();
            expect(usageTracker.callbacks.onLimitReached).toBeNull();
            expect(usageTracker.isInitialized).toBe(false);
        });
    });
});