/**
 * Spanish Menu Cheater - Main Application Entry Point
 * 
 * This is the main JavaScript file that initializes the PWA application.
 * It coordinates between different modules and handles the application lifecycle.
 */

// Import modules (will be created in subsequent tasks)
import { DataManager } from './dataManager.js';
import { SearchEngine } from './searchEngine.js';
import { UpdateManager } from './updateManager.js';
import { PreferencesManager } from './preferencesManager.js';
import CameraManager from './cameraManager.js';
import OCRProcessor from './ocrProcessor.js';
import TextProcessor from './textProcessor.js';
import HybridOCRProcessor from './hybridOCRProcessor.js';
import SettingsManager from './settingsManager.js';
import UsageTracker from './usageTracker.js';
// import { UIController } from './uiController.js';
// import { LanguageManager } from './languageManager.js';
// import { PWAManager } from './pwaManager.js';

/**
 * Main Application Class
 * Coordinates all modules and manages application state
 */
class SpanishMenuCheater {
    constructor() {
        this.isInitialized = false;
        this.isDataLoaded = false;
        this.currentLanguage = 'en'; // Default to English
        
        // Module instances (will be initialized later)
        this.dataManager = null;
        this.searchEngine = null;
        this.updateManager = null;
        this.preferencesManager = null;
        this.cameraManager = null;
        this.ocrProcessor = null; // Legacy OCR processor (Tesseract.js only)
        this.hybridOCRProcessor = null; // New hybrid OCR processor
        this.textProcessor = null;
        this.settingsManager = null; // OCR settings interface
        this.usageTracker = null; // API usage tracking
        this.uiController = null;
        this.languageManager = null;
        this.pwaManager = null;
        
        // DOM elements
        this.elements = {
            searchInput: null,
            clearButton: null,
            shareButton: null,
            cameraButton: null,
            languageToggle: null,
            offlineIndicator: null,
            welcomeMessage: null,
            loadingIndicator: null,
            noResults: null,
            resultsList: null,
            suggestions: null,
            // Camera modal elements
            cameraModal: null,
            cameraVideo: null,
            cameraCanvas: null,
            cameraClose: null,
            cameraCapture: null,
            cameraRetake: null,
            cameraProcess: null,
            cameraLoading: null,
            cameraResults: null,
            cameraError: null,
            textSuggestions: null
        };
        
        // Application state
        this.state = {
            isOnline: navigator.onLine,
            isSearching: false,
            hasResults: false,
            currentQuery: '',
            searchResults: [],
            suggestions: [],
            preferences: {
                showOnlyLiked: false,
                hideDislikes: false
            },
            camera: {
                isModalOpen: false,
                isProcessing: false,
                currentPhoto: null,
                detectedText: null,
                suggestions: []
            }
        };
        
        // Bind methods to preserve context
        this.handleDOMContentLoaded = this.handleDOMContentLoaded.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        this.handleOfflineStatus = this.handleOfflineStatus.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }
    
    /**
     * Initialize the application
     * Sets up event listeners and starts the initialization process
     */
    async init() {
        try {
            console.log('🚀 Spanish Menu Cheater - Starting initialization...');
            
            // Add event listeners for application lifecycle
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this.handleDOMContentLoaded);
            } else {
                await this.handleDOMContentLoaded();
            }
            
            // Add online/offline listeners
            window.addEventListener('online', this.handleOnlineStatus);
            window.addEventListener('offline', this.handleOfflineStatus);
            window.addEventListener('beforeunload', this.handleBeforeUnload);
            
            // Add update event listener
            document.addEventListener('app-update', this.handleAppUpdate.bind(this));
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Handle DOM content loaded event
     * Main initialization sequence after DOM is ready
     */
    async handleDOMContentLoaded() {
        try {
            console.log('📋 DOM loaded, starting application setup...');
            
            // Get DOM elements
            this.initializeDOMElements();
            
            // Initialize basic UI state
            this.initializeUI();
            
            // Show loading state
            this.showLoadingState('Initializing application...');
            
            // Initialize modules (placeholder for now)
            await this.initializeModules();
            
            // Load menu data
            await this.loadMenuData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading state and show welcome
            this.hideLoadingState();
            this.showWelcomeMessage();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Application initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to handle DOM content loaded:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Initialize DOM element references
     */
    initializeDOMElements() {
        this.elements = {
            searchInput: document.getElementById('search-input'),
            clearButton: document.getElementById('clear-search'),
            shareButton: document.getElementById('share-btn'),
            cameraButton: document.getElementById('camera-btn'),
            languageToggle: document.getElementById('language-toggle'),
            offlineIndicator: document.getElementById('offline-indicator'),
            welcomeMessage: document.getElementById('welcome-message'),
            loadingIndicator: document.getElementById('loading-indicator'),
            noResults: document.getElementById('no-results'),
            resultsList: document.getElementById('results-list'),
            suggestions: document.getElementById('suggestions'),
            preferenceFilters: document.getElementById('preference-filters'),
            showLikedFilter: document.getElementById('show-liked-filter'),
            hideDislikedFilter: document.getElementById('hide-disliked-filter'),
            // Camera modal elements
            cameraModal: document.getElementById('camera-modal'),
            cameraVideo: document.getElementById('camera-video'),
            cameraCanvas: document.getElementById('camera-canvas'),
            cameraClose: document.getElementById('camera-close'),
            cameraCapture: document.getElementById('camera-capture'),
            cameraRetake: document.getElementById('camera-retake'),
            cameraProcess: document.getElementById('camera-process'),
            cameraLoading: document.querySelector('.camera-loading'),
            cameraResults: document.querySelector('.camera-results'),
            cameraError: document.querySelector('.camera-error'),
            textSuggestions: document.querySelector('.text-suggestions')
        };
        
        // Validate critical elements only - don't fail on missing optional elements
        const criticalElements = ['searchInput', 'languageToggle', 'welcomeMessage', 'resultsList'];
        const missingCritical = criticalElements.filter(key => !this.elements[key]);
        
        if (missingCritical.length > 0) {
            throw new Error(`Missing critical DOM elements: ${missingCritical.join(', ')}`);
        }
        
        // Log warnings for missing optional elements
        const optionalElements = Object.entries(this.elements)
            .filter(([key, element]) => !element && !criticalElements.includes(key))
            .map(([key]) => key);
            
        if (optionalElements.length > 0) {
            console.log(`ℹ️ Optional elements missing: ${optionalElements.join(', ')}`);
        }
        
        console.log('📍 DOM elements initialized successfully');
    }
    
    /**
     * Initialize basic UI state
     */
    initializeUI() {
        // Set initial language indicator
        if (this.elements.languageToggle) {
            const languageLabel = this.elements.languageToggle.querySelector('.language-label');
            if (languageLabel) {
                languageLabel.textContent = this.currentLanguage.toUpperCase();
            }
        }
        
        // Set initial online/offline state
        this.updateOnlineStatus();
        
        // Ensure proper initial visibility states
        this.hideAllSections();
        
        console.log('🎨 Basic UI state initialized');
    }
    
    /**
     * Initialize application modules
     */
    async initializeModules() {
        console.log('🔧 Initializing modules...');
        
        try {
            // Initialize DataManager
            this.dataManager = new DataManager();
            
            // Initialize SearchEngine (after DataManager)
            this.searchEngine = new SearchEngine(this.dataManager);
            
            // Initialize UpdateManager
            this.updateManager = new UpdateManager();
            
            // Initialize PreferencesManager
            this.preferencesManager = new PreferencesManager();
            
            // Initialize Camera modules
            this.cameraManager = new CameraManager();
            this.textProcessor = new TextProcessor();
            
            // Initialize OCR settings and usage tracking
            this.usageTracker = new UsageTracker();
            this.settingsManager = new SettingsManager();
            
            // Initialize OCR processors (but don't await initialization here to avoid blocking)
            this.ocrProcessor = new OCRProcessor(); // Keep legacy for backwards compatibility
            this.hybridOCRProcessor = new HybridOCRProcessor(); // New hybrid system
            
            // TODO: Initialize other modules when they are created
            // this.uiController = new UIController();
            // this.languageManager = new LanguageManager();
            // this.pwaManager = new PWAManager();
            
            console.log('📦 Modules initialized');
        } catch (error) {
            console.error('❌ Module initialization error:', error);
            // Continue with partial functionality instead of failing completely
        }
    }
    
    /**
     * Load menu data using DataManager
     */
    async loadMenuData() {
        console.log('📊 Loading menu data...');
        
        try {
            await this.dataManager.loadMenuData();
            this.isDataLoaded = true;
            
            // Update UI with data statistics
            const stats = this.dataManager.getStats();
            console.log(`✅ Loaded ${stats.totalItems} menu items:`, {
                vegetarian: stats.vegetarianItems,
                pork: stats.porkItems,
                dairy: stats.dairyItems,
                meat: stats.meatItems,
                seafood: stats.seafoodItems
            });
            
            // Build search index after data is loaded
            this.searchEngine.buildSearchIndex();
            console.log('🔍 Search index built successfully');
            
            // Test autocomplete functionality
            console.log('🧪 Testing autocomplete with "p"...');
            const testSuggestions = this.searchEngine.getAutocompleteSuggestions('p', 3);
            console.log('🧪 Test suggestions:', testSuggestions);
            
        } catch (error) {
            console.error('❌ Failed to load menu data:', error);
            this.isDataLoaded = false;
            
            // Show appropriate error message based on online/offline status
            this.showDataLoadError(error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search input event listeners
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            this.elements.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
            this.elements.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
            this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
            this.elements.searchInput.addEventListener('keyup', this.handleSearchKeyup.bind(this));
        }
        
        // Clear button event listener
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', this.handleClearSearch.bind(this));
        }
        
        // Share button event listener
        if (this.elements.shareButton) {
            this.elements.shareButton.addEventListener('click', this.handleShareButton.bind(this));
        }
        
        // Camera button event listener
        if (this.elements.cameraButton) {
            this.elements.cameraButton.addEventListener('click', this.handleCameraClick.bind(this));
            console.log('📷 Camera button event listener attached successfully');
        } else {
            console.warn('❌ Camera button not found - camera functionality disabled');
        }
        
        // Camera modal event listeners
        if (this.elements.cameraClose) {
            this.elements.cameraClose.addEventListener('click', this.handleCameraClose.bind(this));
        }
        if (this.elements.cameraCapture) {
            this.elements.cameraCapture.addEventListener('click', this.handleCameraCapture.bind(this));
        }
        if (this.elements.cameraRetake) {
            this.elements.cameraRetake.addEventListener('click', this.handleCameraRetake.bind(this));
        }
        if (this.elements.cameraProcess) {
            this.elements.cameraProcess.addEventListener('click', this.handleCameraProcess.bind(this));
        }
        
        // Language toggle event listener
        if (this.elements.languageToggle) {
            this.elements.languageToggle.addEventListener('click', this.handleLanguageToggle.bind(this));
        }
        
        // Preference button event listener (using event delegation)
        document.addEventListener('click', this.handlePreferenceClick.bind(this));
        
        // Filter button event listeners
        if (this.elements.showLikedFilter) {
            this.elements.showLikedFilter.addEventListener('click', this.handleFilterClick.bind(this));
        }
        if (this.elements.hideDislikedFilter) {
            this.elements.hideDislikedFilter.addEventListener('click', this.handleFilterClick.bind(this));
        }
        
        console.log('🎯 Event listeners set up successfully');
    }
    
    /**
     * Handle search input changes
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        this.state.currentQuery = query;
        
        // Show/hide clear button
        if (this.elements.clearButton) {
            if (query.length > 0) {
                this.elements.clearButton.classList.remove('hidden');
            } else {
                this.elements.clearButton.classList.add('hidden');
            }
        }
        
        // Handle search
        if (query.length > 0) {
            // Show autocomplete suggestions for short queries, search for longer ones
            if (query.length <= 2) {
                // Show autocomplete suggestions for 1-2 character queries
                this.hideAllSections();
                this.showWelcomeMessage();
                this.showAutocompleteSuggestions(query);
            } else if (query.length === 3) {
                // Show both suggestions and search results for 3 character queries
                this.showAutocompleteSuggestions(query);
                this.performSearch(query);
            } else {
                // Hide suggestions and perform full search for longer queries
                this.hideSuggestions();
                this.performSearch(query);
            }
        } else {
            this.clearSearch();
        }
    }
    
    /**
     * Handle search input focus
     */
    handleSearchFocus() {
        console.log('🔍 Search input focused');
        // Show autocomplete suggestions only when no results are displayed
        const query = this.state.currentQuery;
        if (query.length > 0 && !this.state.hasResults && this.searchEngine) {
            this.showAutocompleteSuggestions(query);
        }
    }
    
    /**
     * Handle search input blur
     */
    handleSearchBlur() {
        console.log('🔍 Search input blurred');
        // Hide suggestions after a short delay to allow for clicking
        setTimeout(() => {
            this.hideSuggestions();
        }, 150);
    }
    
    /**
     * Handle search input keydown events
     */
    handleSearchKeydown(event) {
        const key = event.key;
        
        // Handle Enter key
        if (key === 'Enter') {
            event.preventDefault();
            const query = this.elements.searchInput.value.trim();
            if (query.length > 0) {
                // Force full search on Enter, regardless of query length
                this.hideSuggestions();
                this.performSearch(query);
            }
            // Blur input to hide mobile keyboard if desired
            if (this.isMobileDevice()) {
                this.elements.searchInput.blur();
            }
        }
        
        // Handle Escape key
        else if (key === 'Escape') {
            event.preventDefault();
            if (this.state.currentQuery) {
                this.clearSearch();
            } else {
                this.elements.searchInput.blur();
            }
        }
        
        // Handle Arrow keys for suggestion navigation
        else if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();
            this.navigateSuggestions(key === 'ArrowDown' ? 1 : -1);
        }
    }
    
    /**
     * Handle search input keyup events
     */
    handleSearchKeyup() {
        // Additional keyup handling if needed
        // Currently used for potential future enhancements
    }
    
    /**
     * Navigate through suggestions with arrow keys
     */
    navigateSuggestions(direction) {
        const suggestions = this.elements.suggestions;
        if (!suggestions || suggestions.classList.contains('hidden')) return;
        
        const items = suggestions.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;
        
        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('highlighted')) {
                currentIndex = index;
                item.classList.remove('highlighted');
            }
        });
        
        // Calculate new index
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = items.length - 1;
        if (currentIndex >= items.length) currentIndex = 0;
        
        // Highlight new item
        items[currentIndex].classList.add('highlighted');
        items[currentIndex].scrollIntoView({ block: 'nearest' });
        
        // Update input value with highlighted suggestion
        const suggestionText = items[currentIndex].querySelector('.suggestion-match')?.textContent;
        if (suggestionText) {
            this.elements.searchInput.value = suggestionText;
        }
    }
    
    /**
     * Detect if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    /**
     * Handle clear search button click
     */
    handleClearSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.elements.searchInput.focus();
        }
        this.clearSearch();
    }
    
    /**
     * Handle share button click
     */
    async handleShareButton() {
        const shareData = {
            title: 'Spanish Menu Cheater',
            text: 'Check out Spanish Menu Cheater - a free offline Spanish menu translator! Perfect for traveling in Spain 🇪🇸',
            url: window.location.href
        };

        try {
            // Check if Web Share API is supported
            if (navigator.share) {
                await navigator.share(shareData);
                console.log('📤 App shared successfully via native share');
            } else {
                // Fallback: copy to clipboard
                const shareText = `${shareData.text}\n${shareData.url}`;
                await navigator.clipboard.writeText(shareText);
                
                // Show feedback to user
                this.showShareFeedback('Link copied to clipboard!');
                console.log('📋 Share link copied to clipboard');
            }
        } catch (error) {
            // Handle share cancellation or errors gracefully
            if (error.name !== 'AbortError') {
                console.error('❌ Error sharing app:', error);
                this.showShareFeedback('Unable to share. Please try again.');
            }
        }
    }

    /**
     * Show feedback message for share action
     */
    showShareFeedback(message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-success);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(feedback);
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    /**
     * Handle language toggle button click
     */
    handleLanguageToggle() {
        // Toggle between English and Dutch
        this.currentLanguage = this.currentLanguage === 'en' ? 'nl' : 'en';
        
        // Update UI
        const languageLabel = this.elements.languageToggle?.querySelector('.language-label');
        if (languageLabel) {
            languageLabel.textContent = this.currentLanguage.toUpperCase();
        }
        
        console.log(`🌐 Language switched to: ${this.currentLanguage}`);
        
        // Refresh current search results to show in new language
        if (this.state.hasResults && this.state.searchResults.length > 0) {
            this.displaySearchResults(this.state.searchResults);
        }
        
        // Update search placeholder text
        if (this.elements.searchInput) {
            const placeholder = this.currentLanguage === 'nl' 
                ? 'Typ een Spaans gerecht...' 
                : 'Type a Spanish menu item...';
            this.elements.searchInput.placeholder = placeholder;
        }
    }
    
    /**
     * Handle preference button clicks (like/dislike)
     */
    handlePreferenceClick(event) {
        // Check if the clicked element is a preference button
        const button = event.target.closest('.preference-btn');
        if (!button) return;
        
        const itemId = button.getAttribute('data-item-id');
        const action = button.getAttribute('data-action');
        
        if (!itemId || !action || !this.preferencesManager) return;
        
        // Get current preference
        const currentPreference = this.preferencesManager.getPreference(itemId);
        let newPreference;
        
        // Toggle logic: if clicking the same preference, set to neutral
        if (action === 'like') {
            newPreference = currentPreference === 'like' ? 'neutral' : 'like';
        } else if (action === 'dislike') {
            newPreference = currentPreference === 'dislike' ? 'neutral' : 'dislike';
        }
        
        // Update preference
        this.preferencesManager.setPreference(itemId, newPreference);
        
        // Update UI immediately - find the result card and update button states
        const resultCard = button.closest('.result-card');
        if (resultCard) {
            this.updatePreferenceButtonsInCard(resultCard, itemId, newPreference);
        }
        
        // Optional: Add visual feedback
        this.showPreferenceFeedback(button, newPreference, action);
        
        // Update filter UI (counts, visibility)
        this.updatePreferenceFilterUI();
        
        console.log(`🎯 Preference updated: ${itemId} -> ${newPreference}`);
    }
    
    /**
     * Update preference buttons in a specific result card
     */
    updatePreferenceButtonsInCard(card, itemId, preference) {
        const likeBtn = card.querySelector('.like-btn');
        const dislikeBtn = card.querySelector('.dislike-btn');
        const likeIcon = likeBtn?.querySelector('.preference-icon');
        const dislikeIcon = dislikeBtn?.querySelector('.preference-icon');
        
        if (!likeBtn || !dislikeBtn || !likeIcon || !dislikeIcon) return;
        
        // Reset classes
        likeBtn.className = 'preference-btn like-btn';
        dislikeBtn.className = 'preference-btn dislike-btn';
        
        // Set states based on preference
        switch (preference) {
            case 'like':
                likeBtn.className += ' active';
                likeIcon.textContent = '❤️';
                dislikeIcon.textContent = '👎';
                break;
            case 'dislike':
                dislikeBtn.className += ' active';
                likeIcon.textContent = '🤍';
                dislikeIcon.textContent = '👎';
                break;
            case 'neutral':
            default:
                likeIcon.textContent = '🤍';
                dislikeIcon.textContent = '👎';
                break;
        }
    }
    
    /**
     * Show brief visual feedback when preference changes
     */
    showPreferenceFeedback(button, preference, action) {
        // Add immediate visual feedback
        button.classList.add('preference-feedback');
        
        // Add haptic feedback for mobile devices (if supported)
        if ('vibrate' in navigator) {
            navigator.vibrate(50); // Short vibration
        }
        
        // Show temporary feedback toast
        this.showPreferenceToast(preference, action);
        
        // Remove the animation class after completion
        setTimeout(() => {
            button.classList.remove('preference-feedback');
        }, 300);
    }
    
    /**
     * Show brief toast message for preference changes
     */
    showPreferenceToast(preference, action) {
        // Create or get existing toast element
        let toast = document.getElementById('preference-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'preference-toast';
            toast.className = 'preference-toast';
            document.body.appendChild(toast);
        }
        
        // Set toast message based on preference
        let message = '';
        let icon = '';
        switch (preference) {
            case 'like':
                message = 'Added to liked items';
                icon = '❤️';
                break;
            case 'dislike':
                message = 'Added to disliked items';
                icon = '👎';
                break;
            case 'neutral':
                message = action === 'like' ? 'Removed from liked' : 'Removed from disliked';
                icon = '↩️';
                break;
        }
        
        toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
        
        // Show toast with animation
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        // Hide toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 1500);
    }
    
    /**
     * Handle filter button clicks
     */
    handleFilterClick(event) {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        
        const filterType = button.getAttribute('data-filter');
        if (!filterType) return;
        
        // Toggle filter state
        this.state.preferences[filterType] = !this.state.preferences[filterType];
        
        // Update button visual state
        this.updateFilterButtonState(button, this.state.preferences[filterType]);
        
        // Update preference counts and show/hide filters
        this.updatePreferenceFilterUI();
        
        // Re-run current search with new filters
        if (this.state.currentQuery) {
            this.performSearch(this.state.currentQuery);
        }
        
        console.log(`🔍 Filter toggled: ${filterType} = ${this.state.preferences[filterType]}`);
    }
    
    /**
     * Update filter button visual state
     */
    updateFilterButtonState(button, isActive) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
    
    /**
     * Update preference filter UI (counts, visibility)
     */
    updatePreferenceFilterUI() {
        if (!this.preferencesManager || !this.elements.preferenceFilters) return;
        
        const counts = this.preferencesManager.getPreferenceCounts();
        
        // Update liked count in the button
        const likedCountElement = this.elements.showLikedFilter?.querySelector('.filter-count');
        if (likedCountElement) {
            likedCountElement.textContent = `(${counts.liked})`;
        }
        
        // Show/hide filter controls based on whether user has any preferences
        if (counts.total > 0) {
            this.elements.preferenceFilters.classList.remove('hidden');
        } else {
            this.elements.preferenceFilters.classList.add('hidden');
            // Reset filter states when no preferences exist
            this.state.preferences.showOnlyLiked = false;
            this.state.preferences.hideDislikes = false;
            this.updateFilterButtonState(this.elements.showLikedFilter, false);
            this.updateFilterButtonState(this.elements.hideDislikedFilter, false);
        }
    }
    
    /**
     * Perform search using SearchEngine
     */
    performSearch(query) {
        console.log(`🔍 Searching for: "${query}"`);
        
        this.state.isSearching = true;
        this.hideAllSections();
        this.showLoadingState('Searching menu items...');
        
        // Use a short delay to ensure smooth UI updates
        setTimeout(() => {
            try {
                if (!this.isDataLoaded || !this.searchEngine) {
                    throw new Error('Search not ready - data not loaded');
                }
                
                // Perform search with preference filters
                const filters = { ...this.state.preferences };
                const searchResult = this.searchEngine.search(query, filters, this.preferencesManager);
                
                this.hideLoadingState();
                
                if (searchResult.results.length > 0) {
                    this.displaySearchResults(searchResult.results);
                    console.log(`Found ${searchResult.results.length} results in ${searchResult.searchTime.toFixed(2)}ms`);
                } else {
                    this.showNoResults();
                    console.log('No results found');
                }
                
                // Don't show suggestions when we have results to avoid overlap
                
                this.state.searchResults = searchResult.results;
                this.state.hasResults = searchResult.results.length > 0;
                
            } catch (error) {
                console.error('Search error:', error);
                this.hideLoadingState();
                this.showNoResults();
            }
            
            this.state.isSearching = false;
        }, 100);
    }
    
    /**
     * Clear search and reset UI
     */
    clearSearch() {
        this.state.currentQuery = '';
        this.state.searchResults = [];
        this.state.hasResults = false;
        
        if (this.elements.clearButton) {
            this.elements.clearButton.classList.add('hidden');
        }
        
        this.hideAllSections();
        this.showWelcomeMessage();
        
        console.log('🗑️ Search cleared');
    }
    
    /**
     * UI State Management Methods
     */
    hideAllSections() {
        const sections = [
            this.elements.welcomeMessage,
            this.elements.loadingIndicator,
            this.elements.noResults,
            this.elements.resultsList
        ];
        
        sections.forEach(section => {
            if (section) {
                section.classList.add('hidden');
            }
        });
        
        // Hide suggestions separately since they should stay visible during search
        // this.hideSuggestions();
    }
    
    showWelcomeMessage() {
        if (this.elements.welcomeMessage) {
            this.elements.welcomeMessage.classList.remove('hidden');
        }
    }
    
    showLoadingState(message = 'Loading...') {
        if (this.elements.loadingIndicator) {
            const messageElement = this.elements.loadingIndicator.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            this.elements.loadingIndicator.classList.remove('hidden');
        }
    }
    
    hideLoadingState() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }
    
    showNoResults() {
        if (this.elements.noResults) {
            this.elements.noResults.classList.remove('hidden');
        }
    }
    
    /**
     * Display search results
     */
    displaySearchResults(results) {
        if (!this.elements.resultsList) return;
        
        // Clear previous results
        this.elements.resultsList.innerHTML = '';
        
        results.forEach(result => {
            const resultCard = this.createResultCard(result.item);
            this.elements.resultsList.appendChild(resultCard);
        });
        
        this.elements.resultsList.classList.remove('hidden');
    }
    
    /**
     * Create a result card element
     */
    createResultCard(item) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        // Build dietary tags with warnings prioritized first
        const warningTags = [];
        const infoTags = [];
        
        // Get dietary tag text based on current language
        const getDietaryText = (englishText, dutchText) => {
            return this.currentLanguage === 'nl' ? dutchText : englishText;
        };
        
        // Priority 1: Warning tags (pork/dairy alerts)
        if (item.hasPork) warningTags.push(`<span class="dietary-tag pork">${getDietaryText('Contains Pork', 'Bevat Varkensvlees')}</span>`);
        if (item.hasDairy) warningTags.push(`<span class="dietary-tag dairy">${getDietaryText('Contains Dairy', 'Bevat Zuivel')}</span>`);
        
        // Priority 2: Other dietary information
        if (item.isVegetarian) infoTags.push(`<span class="dietary-tag vegetarian">${getDietaryText('Vegetarian', 'Vegetarisch')}</span>`);
        if (item.hasOtherMeat) infoTags.push(`<span class="dietary-tag meat">${getDietaryText('Contains Meat', 'Bevat Vlees')}</span>`);
        if (item.hasSeafood) infoTags.push(`<span class="dietary-tag seafood">${getDietaryText('Contains Seafood', 'Bevat Zeevruchten')}</span>`);
        
        // Combine with warnings first for visual prominence
        const dietaryTags = [...warningTags, ...infoTags];
        
        // Use appropriate language based on current setting
        const translationName = this.currentLanguage === 'nl' ? item.dutchName : item.englishName;
        const translationDescription = this.currentLanguage === 'nl' ? item.dutchDescription : item.description;
        const visualExampleText = this.currentLanguage === 'nl' ? 'Bekijk' : 'View';
        const likeText = this.currentLanguage === 'nl' ? 'Vind ik leuk' : 'Like';
        const dislikeText = this.currentLanguage === 'nl' ? 'Niet leuk' : 'Pass';
        
        // Get current preference state
        const currentPreference = this.preferencesManager ? this.preferencesManager.getPreference(item.id) : 'neutral';
        
        // Preference button states
        const likeButtonClass = currentPreference === 'like' ? 'preference-btn like-btn active' : 'preference-btn like-btn';
        const dislikeButtonClass = currentPreference === 'dislike' ? 'preference-btn dislike-btn active' : 'preference-btn dislike-btn';
        const likeIcon = currentPreference === 'like' ? '❤️' : '🤍';
        const dislikeIcon = currentPreference === 'dislike' ? '👎' : '👎';
        
        card.innerHTML = `
            <div class="result-header">
                <h3 class="result-spanish">${this.escapeHtml(item.spanishName)}</h3>
                ${item.priceRange ? `<span class="result-price">${this.escapeHtml(item.priceRange)}</span>` : ''}
            </div>
            <h4 class="result-english">${this.escapeHtml(translationName)}</h4>
            ${translationDescription ? `<p class="result-description">${this.escapeHtml(translationDescription)}</p>` : ''}
            ${dietaryTags.length > 0 ? `<div class="dietary-info">${dietaryTags.join('')}</div>` : ''}
            <div class="result-actions">
                <button class="${likeButtonClass}" data-item-id="${this.escapeHtml(item.id)}" data-action="like" aria-label="Like this item">
                    <span class="preference-icon">${likeIcon}</span>
                    <span class="preference-text">${likeText}</span>
                </button>
                <button class="${dislikeButtonClass}" data-item-id="${this.escapeHtml(item.id)}" data-action="dislike" aria-label="Dislike this item">
                    <span class="preference-icon">${dislikeIcon}</span>
                    <span class="preference-text">${dislikeText}</span>
                </button>
                ${item.googleSearchUrl ? `
                    <a href="${this.escapeHtml(item.googleSearchUrl)}" target="_blank" rel="noopener noreferrer" class="visual-example-link">
                        <span class="link-icon">🔍</span>
                        <span class="link-text">${visualExampleText}</span>
                    </a>
                ` : ''}
            </div>
        `;
        
        return card;
    }
    
    /**
     * Show autocomplete suggestions (only when no results are shown)
     */
    showAutocompleteSuggestions(query) {
        if (!this.elements.suggestions || !this.searchEngine) {
            console.log('🔍 Autocomplete blocked: suggestions element or searchEngine missing');
            return;
        }
        
        if (!this.isDataLoaded) {
            console.log('🔍 Autocomplete blocked: data not loaded yet');
            return;
        }
        
        try {
            console.log(`🔍 Getting autocomplete suggestions for: "${query}"`);
            const suggestions = this.searchEngine.getAutocompleteSuggestions(query, 5);
            console.log(`🔍 Found ${suggestions.length} suggestions:`, suggestions);
            
            // Clear previous suggestions
            this.elements.suggestions.innerHTML = '';
            
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.innerHTML = `
                    <span class="suggestion-match">${this.escapeHtml(suggestion.text)}</span>
                    <small class="suggestion-context">${this.escapeHtml(suggestion.context)}</small>
                `;
                
                // Add click handler
                suggestionItem.addEventListener('click', () => {
                    if (this.elements.searchInput) {
                        this.elements.searchInput.value = suggestion.text;
                        this.performSearch(suggestion.text);
                        this.hideSuggestions();
                    }
                });
                
                this.elements.suggestions.appendChild(suggestionItem);
            });
            
            if (suggestions.length > 0) {
                this.elements.suggestions.classList.remove('hidden');
            } else {
                this.hideSuggestions();
            }
            
        } catch (error) {
            console.warn('Error showing autocomplete suggestions:', error);
            this.hideSuggestions();
        }
    }
    
    /**
     * Display search suggestions (legacy method - now unused to avoid overlap)
     */
    displaySuggestions(suggestions) {
        // This method is no longer used to prevent suggestions from covering results
        // Use showAutocompleteSuggestions instead for autocomplete
        console.log('Suggestions available but hidden to prevent overlap:', suggestions.length);
    }
    
    /**
     * Hide suggestions
     */
    hideSuggestions() {
        if (this.elements.suggestions) {
            this.elements.suggestions.classList.add('hidden');
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Online/Offline Status Handlers
     */
    handleOnlineStatus() {
        this.state.isOnline = true;
        this.updateOnlineStatus();
        console.log('🌐 Application is online');
    }
    
    handleOfflineStatus() {
        this.state.isOnline = false;
        this.updateOnlineStatus();
        console.log('📴 Application is offline');
    }
    
    updateOnlineStatus() {
        if (this.elements.offlineIndicator) {
            if (this.state.isOnline) {
                this.elements.offlineIndicator.classList.add('hidden');
                this.elements.offlineIndicator.textContent = 'Offline';
                this.elements.offlineIndicator.setAttribute('aria-label', 'Application is online');
            } else {
                this.elements.offlineIndicator.classList.remove('hidden');
                
                // Check if app is ready for offline use
                this.checkOfflineReadiness().then(isReady => {
                    if (isReady) {
                        this.elements.offlineIndicator.textContent = '📴 Offline - All features available';
                        this.elements.offlineIndicator.setAttribute('aria-label', 'Application is offline but fully functional');
                        this.elements.offlineIndicator.style.backgroundColor = 'var(--color-success)';
                    } else {
                        this.elements.offlineIndicator.textContent = '⚠️ Offline - Limited functionality';
                        this.elements.offlineIndicator.setAttribute('aria-label', 'Application is offline with limited functionality');
                        this.elements.offlineIndicator.style.backgroundColor = 'var(--color-warning)';
                    }
                });
            }
        }
        
        // Update search functionality messaging
        this.updateSearchPlaceholder();
    }
    
    /**
     * Check if the app is ready for offline use
     */
    async checkOfflineReadiness() {
        // Check if service worker is available and data is cached
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                // Create a message channel to communicate with the service worker
                const messageChannel = new MessageChannel();
                
                return new Promise((resolve) => {
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data && event.data.type === 'OFFLINE_READY_STATUS') {
                            resolve(event.data.isReady);
                        } else {
                            resolve(false);
                        }
                    };
                    
                    // Send message to service worker to check offline readiness
                    navigator.serviceWorker.controller.postMessage(
                        { type: 'CHECK_OFFLINE_READY' },
                        [messageChannel.port2]
                    );
                    
                    // Timeout after 2 seconds
                    setTimeout(() => resolve(false), 2000);
                });
            } catch (error) {
                console.warn('Failed to check offline readiness:', error);
                return false;
            }
        }
        
        // Fallback: check if data is loaded in memory
        return this.isDataLoaded && this.dataManager && this.dataManager.getMenuItems().length > 0;
    }
    
    /**
     * Update search input placeholder based on online/offline status
     */
    updateSearchPlaceholder() {
        if (!this.elements.searchInput) return;
        
        const basePlaceholder = "Type a Spanish menu item...";
        
        if (!this.state.isOnline) {
            this.checkOfflineReadiness().then(isReady => {
                if (isReady) {
                    this.elements.searchInput.placeholder = basePlaceholder + " (offline mode)";
                } else {
                    this.elements.searchInput.placeholder = "Limited offline functionality";
                }
            });
        } else {
            this.elements.searchInput.placeholder = basePlaceholder;
        }
    }
    
    /**
     * Show appropriate error message when data fails to load
     */
    showDataLoadError(error) {
        const welcomeMessage = this.elements.welcomeMessage;
        if (!welcomeMessage) return;
        
        // Hide loading indicator if showing
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.add('hidden');
        }
        
        const isOffline = !this.state.isOnline;
        const isNetworkError = error.name === 'TypeError' || error.message.includes('Failed to fetch');
        
        if (isOffline || isNetworkError) {
            welcomeMessage.innerHTML = `
                <h2>📴 Offline Mode</h2>
                <div class="offline-message">
                    <p><strong>No internet connection detected.</strong></p>
                    <p>Spanish Menu Cheater is designed to work completely offline once the data has been downloaded.</p>
                    
                    <div class="offline-instructions">
                        <h3>To use offline features:</h3>
                        <ol>
                            <li>Connect to the internet temporarily</li>
                            <li>Refresh this page to download menu data</li>
                            <li>Once loaded, the app works fully offline</li>
                        </ol>
                    </div>
                    
                    <div class="offline-benefits">
                        <h3>When fully cached, you can:</h3>
                        <ul>
                            <li>✅ Search 200+ Spanish menu items</li>
                            <li>✅ View English and Dutch translations</li>
                            <li>✅ Check dietary information (pork, dairy, etc.)</li>
                            <li>✅ Use fuzzy search with typo tolerance</li>
                            <li>✅ Switch between languages</li>
                        </ul>
                    </div>
                    
                    <p class="retry-message">
                        <button id="retry-data-load" class="btn btn-primary">
                            🔄 Try Again
                        </button>
                    </p>
                </div>
            `;
            
            // Add retry functionality
            const retryButton = document.getElementById('retry-data-load');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.initializeAfterDOM();
                });
            }
        } else {
            welcomeMessage.innerHTML = `
                <h2>⚠️ Data Loading Error</h2>
                <div class="error-message">
                    <p>Failed to load Spanish menu data.</p>
                    <p>Please check your internet connection and try again.</p>
                    
                    <p class="retry-message">
                        <button id="retry-data-load" class="btn btn-primary">
                            🔄 Retry
                        </button>
                    </p>
                </div>
            `;
            
            // Add retry functionality
            const retryButton = document.getElementById('retry-data-load');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.initializeAfterDOM();
                });
            }
        }
        
        welcomeMessage.classList.remove('hidden');
    }
    
    /**
     * Error Handling
     */
    handleInitializationError(error) {
        console.error('💥 Application initialization failed:', error);
        
        // Show error message to user
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #DC143C;">
                <h1>Application Error</h1>
                <p>Failed to initialize Spanish Menu Cheater.</p>
                <p style="font-size: 0.875rem; margin-top: 1rem;">
                    Please refresh the page to try again.
                </p>
                <button onclick="window.location.reload()" 
                        style="margin-top: 1rem; padding: 0.5rem 1rem; 
                               background: #D2691E; color: white; 
                               border: none; border-radius: 0.25rem; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
    
    /**
     * Handle before unload (cleanup)
     */
    handleBeforeUnload() {
        console.log('👋 Application shutting down...');
        // TODO: Cleanup resources, save state if needed
    }
    
    /**
     * Handle app update events
     */
    handleAppUpdate(event) {
        console.log('🔄 App update event received:', event.detail);
        
        const { type } = event.detail;
        
        switch (type) {
            case 'data-update':
                console.log('📊 Data update available - reloading data...');
                this.handleDataUpdate();
                break;
                
            case 'app-update':
                console.log('🚀 App update available - will be handled by UpdateManager');
                break;
                
            default:
                console.log('Unknown update type:', type);
        }
    }
    
    /**
     * Handle data updates
     */
    async handleDataUpdate() {
        try {
            // Show loading state
            this.showLoadingState('Updating menu data...');
            
            // Reload data
            await this.dataManager.loadMenuData();
            
            // Rebuild search index
            this.searchEngine.buildSearchIndex();
            
            // Hide loading state
            this.hideLoadingState();
            
            // Show success message
            this.showUpdateMessage('Menu data updated successfully! 🍽️');
            
            console.log('✅ Data update completed');
            
        } catch (error) {
            console.error('❌ Failed to update data:', error);
            this.hideLoadingState();
            this.showUpdateMessage('Failed to update menu data. Please try again later.', 'error');
        }
    }
    
    /**
     * Show update message to user
     */
    showUpdateMessage(message, type = 'success') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `update-message ${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: var(--space-lg);
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#DC2626' : '#059669'};
            color: white;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-lg);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            z-index: 1002;
            animation: slideDown 0.3s ease-out;
            font-weight: 500;
            text-align: center;
            max-width: 90vw;
        `;
        
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideUp 0.3s ease-in forwards';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // ===== CAMERA METHODS =====
    
    /**
     * Handle camera button click
     */
    async handleCameraClick() {
        try {
            console.log('📷 Camera button clicked');
            
            // Check if camera is supported
            if (!this.cameraManager.isSupported()) {
                this.showCameraError('Camera not supported', 'Your browser does not support camera access');
                return;
            }
            
            // Open camera modal
            this.openCameraModal();
            
            // Initialize camera
            await this.initializeCamera();
            
        } catch (error) {
            console.error('Failed to open camera:', error);
            this.showCameraError('Camera Error', error.message || 'Failed to access camera');
        }
    }
    
    /**
     * Open camera modal
     */
    openCameraModal() {
        if (this.elements.cameraModal) {
            this.elements.cameraModal.classList.remove('hidden');
            this.state.camera.isModalOpen = true;
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }
    
    /**
     * Close camera modal
     */
    closeCameraModal() {
        if (this.elements.cameraModal) {
            this.elements.cameraModal.classList.add('hidden');
            this.state.camera.isModalOpen = false;
            document.body.style.overflow = ''; // Restore scrolling
            
            // Clean up camera resources
            this.cameraManager.cleanup();
            this.resetCameraState();
        }
    }
    
    /**
     * Initialize camera
     */
    async initializeCamera() {
        try {
            this.showCameraSection('preview');
            
            // Initialize camera with video element
            await this.cameraManager.initializeVideo(this.elements.cameraVideo);
            
            console.log('📷 Camera initialized successfully');
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            
            const errorInfo = this.cameraManager.getCameraErrorInfo(error);
            this.showCameraError(errorInfo.userMessage, this.getCameraErrorSuggestion(errorInfo));
        }
    }
    
    /**
     * Handle camera close button
     */
    handleCameraClose() {
        this.closeCameraModal();
    }
    
    /**
     * Handle camera capture button
     */
    async handleCameraCapture() {
        try {
            console.log('📸 Capturing photo...');
            
            // Capture photo
            const photoData = await this.cameraManager.capturePhoto();
            this.state.camera.currentPhoto = photoData;
            
            // Show captured photo
            this.showCapturedPhoto(photoData);
            
            // Update UI state
            this.showCameraSection('captured');
            
        } catch (error) {
            console.error('Photo capture failed:', error);
            this.showCameraError('Capture Failed', 'Failed to capture photo. Please try again.');
        }
    }
    
    /**
     * Handle camera retake button
     */
    handleCameraRetake() {
        console.log('🔄 Retaking photo...');
        
        // Reset to preview mode
        this.showCameraSection('preview');
        this.state.camera.currentPhoto = null;
        
        // Hide captured photo
        if (this.elements.cameraCanvas) {
            this.elements.cameraCanvas.classList.add('hidden');
        }
        if (this.elements.cameraVideo) {
            this.elements.cameraVideo.classList.remove('hidden');
        }
    }
    
    /**
     * Get Google Vision API key from local storage
     * @returns {string|null} API key or null if not set
     */
    getGoogleVisionApiKey() {
        try {
            return localStorage.getItem('google_vision_api_key');
        } catch (error) {
            console.warn('Failed to get Google Vision API key from storage:', error);
            return null;
        }
    }

    /**
     * Get icon for OCR source
     * @param {string} source - OCR source identifier
     * @returns {string} Icon for the source
     */
    getOCRSourceIcon(source) {
        switch (source) {
            case 'google_vision':
            case 'google_vision_primary':
                return '🌐';
            case 'tesseract_fallback':
            case 'tesseract_backup':
                return '🔄';
            case 'tesseract_only':
            case 'tesseract':
                return '🔧';
            default:
                return '📷';
        }
    }

    /**
     * Get display name for OCR source
     * @param {string} source - OCR source identifier
     * @returns {string} Display name for the source
     */
    getOCRSourceName(source) {
        switch (source) {
            case 'google_vision':
            case 'google_vision_primary':
                return 'Google Vision';
            case 'tesseract_fallback':
                return 'Local OCR (Fallback)';
            case 'tesseract_backup':
                return 'Local OCR (Backup)';
            case 'tesseract_only':
            case 'tesseract':
                return 'Local OCR';
            default:
                return 'OCR Processing';
        }
    }

    /**
     * Handle camera process button
     */
    async handleCameraProcess() {
        if (!this.state.camera.currentPhoto) {
            return;
        }
        
        try {
            console.log('🔍 Processing photo for text...');
            this.state.camera.isProcessing = true;
            
            // Show loading state
            this.showCameraSection('loading');
            
            // Initialize usage tracker if needed
            if (!this.usageTracker.isInitialized) {
                await this.usageTracker.initialize({
                    monthlyLimit: 500,
                    callbacks: {
                        onUsageUpdate: (usage) => {
                            console.log(`📊 Usage updated: ${usage.apiCalls}/${usage.settings.monthlyLimit} (${usage.percentage}%)`);
                        },
                        onWarning: (warning) => {
                            console.warn(`⚠️ Usage warning: ${warning.percentage}% of monthly limit reached`);
                        },
                        onLimitReached: (info) => {
                            console.error(`🚫 Usage limit reached: ${info.currentUsage}/${info.limit} API calls`);
                        }
                    }
                });
            }
            
            // Initialize hybrid OCR processor if needed
            if (!this.hybridOCRProcessor.isInitialized) {
                // Get Google Vision API key from local storage or settings
                const googleVisionApiKey = this.getGoogleVisionApiKey();
                
                await this.hybridOCRProcessor.initialize({
                    googleVisionApiKey: googleVisionApiKey,
                    usageTracker: this.usageTracker, // Pass usage tracker to hybrid processor
                    progressCallback: (progress) => {
                        this.updateCameraProgress(progress);
                    }
                });
            }
            
            // Initialize settings manager if needed (after hybrid OCR processor is ready)
            if (!this.settingsManager.isInitialized) {
                await this.settingsManager.initialize({
                    usageTracker: this.usageTracker,
                    googleVisionOCR: this.hybridOCRProcessor.googleVisionOCR
                });
            }
            
            // Process image with hybrid OCR (Google Vision first, Tesseract fallback)
            const ocrResult = await this.hybridOCRProcessor.processImage(
                this.state.camera.currentPhoto.dataUrl,
                {
                    confidence: 20,
                    maxTime: 45000,
                    useMultipleAttempts: false // Use single best method for speed
                }
            );
            
            // Process text to find Spanish words
            const textResult = this.textProcessor.processOCRText(ocrResult, {
                minWordLength: 2,
                maxWordLength: 25,
                minConfidence: 30,
                includePartialMatches: true,
                fuzzyThreshold: 0.7
            });
            
            this.state.camera.detectedText = textResult;
            this.state.camera.suggestions = textResult.suggestions;
            
            // Show results
            if (textResult.suggestions.length > 0) {
                this.showCameraResults(textResult, ocrResult.hybridProcessing);
            } else {
                this.showCameraError('No Text Found', 'No Spanish menu items detected. Try a clearer photo or enter text manually.');
            }
            
        } catch (error) {
            console.error('Text processing failed:', error);
            this.showCameraError('Processing Failed', 'Failed to process image. Please try again or enter text manually.');
        } finally {
            this.state.camera.isProcessing = false;
        }
    }
    
    /**
     * Show captured photo
     */
    showCapturedPhoto(photoData) {
        if (this.elements.cameraCanvas && this.elements.cameraVideo) {
            // Hide video, show canvas
            this.elements.cameraVideo.classList.add('hidden');
            this.elements.cameraCanvas.classList.remove('hidden');
            
            // Draw captured image to canvas
            const ctx = this.elements.cameraCanvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                this.elements.cameraCanvas.width = img.width;
                this.elements.cameraCanvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = photoData.dataUrl;
        }
    }
    
    /**
     * Show camera section
     */
    showCameraSection(section) {
        const sections = ['preview', 'captured', 'loading', 'results', 'error'];
        
        sections.forEach(s => {
            const element = this.elements[`camera${s.charAt(0).toUpperCase() + s.slice(1)}`] || 
                           document.querySelector(`.camera-${s}`);
            if (element) {
                if (s === section) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        });
        
        // Show/hide camera controls based on section
        this.updateCameraControls(section);
    }
    
    /**
     * Update camera controls visibility
     */
    updateCameraControls(section) {
        const controls = {
            cameraCapture: section === 'preview',
            cameraRetake: section === 'captured',
            cameraProcess: section === 'captured'
        };
        
        Object.entries(controls).forEach(([controlId, visible]) => {
            const element = this.elements[controlId];
            if (element) {
                if (visible) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        });
    }
    
    /**
     * Update camera processing progress
     */
    updateCameraProgress(progress) {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress.progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress.progress}%`;
        }
        if (loadingText) {
            loadingText.textContent = progress.message;
        }
    }
    
    /**
     * Show camera results
     */
    showCameraResults(textResult, hybridProcessing = null) {
        this.showCameraSection('results');
        
        if (this.elements.textSuggestions) {
            this.elements.textSuggestions.innerHTML = '';
            
            // Add OCR source information if available
            if (hybridProcessing) {
                const sourceInfo = document.createElement('div');
                sourceInfo.className = 'ocr-source-info';
                
                const sourceIcon = this.getOCRSourceIcon(hybridProcessing.source);
                const sourceName = this.getOCRSourceName(hybridProcessing.source);
                const processingTime = Math.round(hybridProcessing.processingTime);
                
                sourceInfo.innerHTML = `
                    <span class="ocr-source-badge">
                        ${sourceIcon} ${sourceName} • ${processingTime}ms
                    </span>
                    ${hybridProcessing.fallbackReason ? `<span class="fallback-reason">${hybridProcessing.fallbackReason}</span>` : ''}
                `;
                
                this.elements.textSuggestions.appendChild(sourceInfo);
            }
            
            textResult.suggestions.forEach(suggestion => {
                const chip = document.createElement('button');
                chip.className = 'suggestion-chip';
                chip.textContent = suggestion.text;
                chip.title = `Confidence: ${suggestion.confidence}% | Type: ${suggestion.type}`;
                
                chip.addEventListener('click', () => {
                    this.handleSuggestionClick(suggestion.text);
                });
                
                this.elements.textSuggestions.appendChild(chip);
            });
        }
    }
    
    /**
     * Handle suggestion chip click
     */
    handleSuggestionClick(text) {
        // Populate search input with selected text
        if (this.elements.searchInput) {
            this.elements.searchInput.value = text;
            this.state.currentQuery = text;
            
            // Trigger search
            this.performSearch(text);
        }
        
        // Close camera modal
        this.closeCameraModal();
    }
    
    /**
     * Show camera error
     */
    showCameraError(title, message) {
        this.showCameraSection('error');
        
        const errorTitle = document.querySelector('.error-title');
        const errorMessage = document.querySelector('.error-message');
        
        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
        
        // Set up error action handlers
        const retryBtn = document.querySelector('.error-retry-btn');
        const manualBtn = document.querySelector('.error-manual-btn');
        
        if (retryBtn) {
            retryBtn.onclick = () => this.initializeCamera();
        }
        if (manualBtn) {
            manualBtn.onclick = () => this.closeCameraModal();
        }
    }
    
    /**
     * Get camera error suggestion
     */
    getCameraErrorSuggestion(errorInfo) {
        const suggestions = {
            permission_denied: 'Please allow camera access in your browser settings and try again.',
            no_camera: 'Connect a camera to your device or use manual text entry.',
            not_supported: 'Try using a different browser that supports camera access.',
            camera_busy: 'Close other apps that might be using the camera.',
            constraints_error: 'Your camera may not support the required settings.'
        };
        
        return suggestions[errorInfo.type] || 'Please try again or enter text manually.';
    }
    
    /**
     * Reset camera state
     */
    resetCameraState() {
        this.state.camera = {
            isModalOpen: false,
            isProcessing: false,
            currentPhoto: null,
            detectedText: null,
            suggestions: []
        };
    }
    
    /**
     * Get Google Vision API key from settings manager or localStorage
     * @returns {string} API key or empty string
     */
    getGoogleVisionApiKey() {
        try {
            // Try to get from settings manager first
            if (this.settingsManager) {
                return this.settingsManager.getStoredApiKey();
            }
            
            // Fallback to direct localStorage access
            return localStorage.getItem('google_vision_api_key') || '';
        } catch (error) {
            console.warn('Failed to retrieve Google Vision API key:', error);
            return '';
        }
    }

    /**
     * Public API methods for external access
     */
    getState() {
        return { ...this.state };
    }
    
    isReady() {
        return this.isInitialized && this.isDataLoaded;
    }
}

/**
 * Create and initialize the application
 */
const app = new SpanishMenuCheater();

// Start the application
app.init().catch(error => {
    console.error('Failed to start application:', error);
});

// Export for potential testing or external access
window.SpanishMenuCheater = app;

console.log('📱 Spanish Menu Cheater - Main module loaded');
