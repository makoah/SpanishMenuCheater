/**
 * Jest Test Setup
 * Global test configuration and mocks for Spanish Menu Cheater PWA
 */

// Mock DOM globals that may not be available in jsdom
global.console = {
  ...console,
  // Suppress console.log during tests unless needed
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Mock navigator properties
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({
      scope: '/',
      active: null,
      installing: null,
      waiting: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })),
    ready: Promise.resolve({
      scope: '/',
      active: {
        scriptURL: '/sw.js',
        state: 'activated'
      }
    }),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  reload: jest.fn(),
  assign: jest.fn(),
  replace: jest.fn()
};

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Helper function to create mock DOM elements
global.createMockElement = (tag, attributes = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

// Helper function to setup DOM for tests
global.setupTestDOM = () => {
  document.body.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">Spanish Menu Cheater</h1>
        <div class="header-controls">
          <button id="language-toggle" class="language-toggle">
            <span class="language-label">EN</span>
          </button>
          <div id="offline-indicator" class="offline-indicator hidden">
            Offline
          </div>
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <section class="search-section">
        <div class="search-container">
          <div class="search-input-wrapper">
            <input 
              type="search" 
              id="search-input" 
              class="search-input"
              placeholder="Type a Spanish menu item..."
            >
            <button id="clear-search" class="clear-search hidden">×</button>
          </div>
          <div id="suggestions" class="suggestions hidden"></div>
        </div>
      </section>
      
      <section class="results-section">
        <div id="search-results" class="search-results">
          <div id="welcome-message" class="welcome-message">
            <h2>Welcome to Spanish Menu Cheater</h2>
          </div>
          <div id="loading-indicator" class="loading-indicator hidden">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
          <div id="no-results" class="no-results hidden">
            <h3>No results found</h3>
          </div>
          <div id="results-list" class="results-list hidden"></div>
        </div>
      </section>
    </main>
    
    <footer class="app-footer">
      <div class="footer-content">
        <p class="app-info">Spanish Menu Cheater - Free offline menu translator</p>
      </div>
    </footer>
  `;
};

// Helper function to clean up after tests
global.cleanupTestDOM = () => {
  document.body.innerHTML = '';
  // Clear all mocks
  jest.clearAllMocks();
  localStorageMock.clear();
};

// Setup before each test
beforeEach(() => {
  // Reset localStorage
  localStorageMock.clear();
  
  // Reset navigator.onLine
  navigator.onLine = true;
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  });
});

// Cleanup after each test
afterEach(() => {
  cleanupTestDOM();
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Trigger events
  fireEvent: (element, eventType, eventInit = {}) => {
    const event = new Event(eventType, { bubbles: true, ...eventInit });
    element.dispatchEvent(event);
    return event;
  },
  
  // Simulate user input
  userInput: (element, value) => {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  },
  
  // Simulate user click
  userClick: (element) => {
    element.dispatchEvent(new Event('click', { bubbles: true }));
  },
  
  // Check if element has class
  hasClass: (element, className) => {
    return element.classList.contains(className);
  },
  
  // Wait for condition to be true
  waitFor: async (condition, timeout = 1000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) {
        return true;
      }
      await global.testUtils.wait(10);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

console.log('🧪 Jest test setup completed');
