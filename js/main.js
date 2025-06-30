/**
 * Spanish Menu Cheater - Main Application Entry Point
 * 
 * This is the main JavaScript file that initializes the PWA application.
 * It coordinates between different modules and handles the application lifecycle.
 */

// Import modules (will be created in subsequent tasks)
import { DataManager } from './dataManager.js';
import { SearchEngine } from './searchEngine.js';
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
        this.uiController = null;
        this.languageManager = null;
        this.pwaManager = null;
        
        // DOM elements
        this.elements = {
            searchInput: null,
            clearButton: null,
            languageToggle: null,
            offlineIndicator: null,
            welcomeMessage: null,
            loadingIndicator: null,
            noResults: null,
            resultsList: null,
            suggestions: null
        };
        
        // Application state
        this.state = {
            isOnline: navigator.onLine,
            isSearching: false,
            hasResults: false,
            currentQuery: '',
            searchResults: [],
            suggestions: []
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
            languageToggle: document.getElementById('language-toggle'),
            offlineIndicator: document.getElementById('offline-indicator'),
            welcomeMessage: document.getElementById('welcome-message'),
            loadingIndicator: document.getElementById('loading-indicator'),
            noResults: document.getElementById('no-results'),
            resultsList: document.getElementById('results-list'),
            suggestions: document.getElementById('suggestions')
        };
        
        // Validate that all required elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
            
        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
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
        
        // Initialize DataManager
        this.dataManager = new DataManager();
        
        // Initialize SearchEngine (after DataManager)
        this.searchEngine = new SearchEngine(this.dataManager);
        
        // TODO: Initialize other modules when they are created
        // this.uiController = new UIController();
        // this.languageManager = new LanguageManager();
        // this.pwaManager = new PWAManager();
        
        console.log('📦 Modules initialized');
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
        
        // Language toggle event listener
        if (this.elements.languageToggle) {
            this.elements.languageToggle.addEventListener('click', this.handleLanguageToggle.bind(this));
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
            if (query.length < 3) {
                // Show autocomplete suggestions for short queries
                this.hideAllSections();
                this.showWelcomeMessage();
                this.showAutocompleteSuggestions(query);
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
                
                // Perform search
                const searchResult = this.searchEngine.search(query);
                
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
        const visualExampleText = this.currentLanguage === 'nl' ? 'Bekijk Voorbeelden' : 'See Visual Examples';
        
        card.innerHTML = `
            <div class="result-header">
                <h3 class="result-spanish">${this.escapeHtml(item.spanishName)}</h3>
                ${item.priceRange ? `<span class="result-price">${this.escapeHtml(item.priceRange)}</span>` : ''}
            </div>
            <h4 class="result-english">${this.escapeHtml(translationName)}</h4>
            ${translationDescription ? `<p class="result-description">${this.escapeHtml(translationDescription)}</p>` : ''}
            ${dietaryTags.length > 0 ? `<div class="dietary-info">${dietaryTags.join('')}</div>` : ''}
            ${item.googleSearchUrl ? `
                <div class="result-actions">
                    <a href="${this.escapeHtml(item.googleSearchUrl)}" target="_blank" rel="noopener noreferrer" class="visual-example-link">
                        <span class="link-icon">🖼️</span>
                        ${visualExampleText}
                    </a>
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    /**
     * Show autocomplete suggestions (only when no results are shown)
     */
    showAutocompleteSuggestions(query) {
        if (!this.elements.suggestions || !this.searchEngine) return;
        
        try {
            const suggestions = this.searchEngine.getAutocompleteSuggestions(query, 5);
            
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
