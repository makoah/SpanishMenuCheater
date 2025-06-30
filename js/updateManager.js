/**
 * Update Manager - Handles app updates and version checking
 * Provides mechanism to check for new versions and update the PWA
 */

export class UpdateManager {
    constructor() {
        this.currentVersion = '1.0.0';
        this.updateAvailable = false;
        this.newServiceWorker = null;
        this.updateReady = false;
        
        // DOM elements for update UI
        this.updateBanner = null;
        this.updateButton = null;
        this.dismissButton = null;
        
        this.init();
    }
    
    /**
     * Initialize the update manager
     */
    init() {
        this.createUpdateUI();
        this.registerServiceWorkerUpdates();
        this.checkForUpdates();
        
        // Check for updates periodically (every 30 minutes)
        setInterval(() => {
            this.checkForUpdates();
        }, 30 * 60 * 1000);
    }
    
    /**
     * Create update notification UI
     */
    createUpdateUI() {
        // Create update banner
        this.updateBanner = document.createElement('div');
        this.updateBanner.id = 'update-banner';
        this.updateBanner.className = 'update-banner hidden';
        this.updateBanner.innerHTML = `
            <div class="update-content">
                <div class="update-icon">🔄</div>
                <div class="update-text">
                    <strong>New version available!</strong>
                    <br>Update for the latest features and improvements.
                </div>
                <div class="update-actions">
                    <button id="update-app-btn" class="update-btn primary">Update Now</button>
                    <button id="dismiss-update-btn" class="update-btn secondary">Later</button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(this.updateBanner);
        
        // Get button references
        this.updateButton = document.getElementById('update-app-btn');
        this.dismissButton = document.getElementById('dismiss-update-btn');
        
        // Add event listeners
        this.updateButton.addEventListener('click', () => this.applyUpdate());
        this.dismissButton.addEventListener('click', () => this.dismissUpdate());
    }
    
    /**
     * Register service worker update events
     */
    registerServiceWorkerUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[UpdateManager] New service worker activated');
                this.onUpdateReady();
            });
            
            // Listen for service worker updates
            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    console.log('[UpdateManager] Update found');
                    const newWorker = registration.installing;
                    
                    if (newWorker) {
                        this.newServiceWorker = newWorker;
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[UpdateManager] Update ready to install');
                                this.updateReady = true;
                                this.showUpdateBanner();
                            }
                        });
                    }
                });
            });
        }
    }
    
    /**
     * Check for application updates
     */
    async checkForUpdates() {
        try {
            // Check if service worker has updates
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.update();
                }
            }
            
            // Check for data updates
            await this.checkDataUpdates();
            
        } catch (error) {
            console.error('[UpdateManager] Error checking for updates:', error);
        }
    }
    
    /**
     * Check for data file updates
     */
    async checkDataUpdates() {
        try {
            const response = await fetch('/data/spanish_menu_items.csv', {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const lastModified = response.headers.get('Last-Modified');
                const currentDataVersion = localStorage.getItem('dataVersion');
                
                if (lastModified && lastModified !== currentDataVersion) {
                    console.log('[UpdateManager] Data update available');
                    localStorage.setItem('dataVersion', lastModified);
                    
                    // Clear data cache to force refresh
                    if ('caches' in window) {
                        const cache = await caches.open('spanish-menu-data-v1.0.0');
                        await cache.delete('/data/spanish_menu_items.csv');
                    }
                    
                    // Notify app of data update
                    this.dispatchUpdateEvent('data-update');
                }
            }
        } catch (error) {
            console.log('[UpdateManager] Could not check data updates (offline)');
        }
    }
    
    /**
     * Show update banner to user
     */
    showUpdateBanner() {
        if (this.updateBanner) {
            this.updateBanner.classList.remove('hidden');
            this.updateAvailable = true;
            
            // Auto-hide after 10 seconds if not interacted with
            setTimeout(() => {
                if (this.updateAvailable) {
                    this.dismissUpdate();
                }
            }, 10000);
        }
    }
    
    /**
     * Apply the available update
     */
    async applyUpdate() {
        if (this.updateReady && this.newServiceWorker) {
            try {
                // Show loading state
                this.updateButton.textContent = 'Updating...';
                this.updateButton.disabled = true;
                
                // Send message to service worker to skip waiting
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SKIP_WAITING'
                    });
                }
                
                // Wait for controller change
                await new Promise((resolve) => {
                    const handleControllerChange = () => {
                        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                        resolve();
                    };
                    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
                });
                
                // Reload the page to apply updates
                window.location.reload();
                
            } catch (error) {
                console.error('[UpdateManager] Error applying update:', error);
                this.updateButton.textContent = 'Update Failed';
            }
        }
    }
    
    /**
     * Dismiss the update notification
     */
    dismissUpdate() {
        if (this.updateBanner) {
            this.updateBanner.classList.add('hidden');
            this.updateAvailable = false;
        }
    }
    
    /**
     * Handle when update is ready
     */
    onUpdateReady() {
        console.log('[UpdateManager] Update has been applied');
        this.dismissUpdate();
        
        // Show success message
        this.showUpdateSuccessMessage();
    }
    
    /**
     * Show update success message
     */
    showUpdateSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'update-success-message';
        message.innerHTML = `
            <div class="success-content">
                ✅ App updated successfully!
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
    
    /**
     * Dispatch custom update events
     */
    dispatchUpdateEvent(type, data = {}) {
        const event = new CustomEvent('app-update', {
            detail: {
                type,
                ...data
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Force check for updates (can be called by app)
     */
    async forceUpdateCheck() {
        console.log('[UpdateManager] Forcing update check');
        await this.checkForUpdates();
    }
    
    /**
     * Get current app version
     */
    getVersion() {
        return this.currentVersion;
    }
    
    /**
     * Check if update is available
     */
    isUpdateAvailable() {
        return this.updateAvailable;
    }
}