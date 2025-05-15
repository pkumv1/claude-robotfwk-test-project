/**
 * Self-healing test utilities for Puppeteer tests
 */
class SelfHealingElement {
    constructor(page, selectors) {
        this.page = page;
        this.selectors = Array.isArray(selectors) ? selectors : [selectors];
        this.lastUsedSelector = null;
    }
    
    /**
     * Try to find an element using multiple selectors
     * @returns {Promise<ElementHandle|null>} Found element or null
     */
    async find() {
        // First try the last successful selector if available
        if (this.lastUsedSelector) {
            try {
                const element = await this.page.$(this.lastUsedSelector);
                if (element) {
                    return element;
                }
            } catch (error) {
                // Last used selector no longer works, continue to try others
            }
        }
        
        // Try each selector in order
        for (const selector of this.selectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    this.lastUsedSelector = selector;
                    console.log(`Found element using selector: ${selector}`);
                    return element;
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        // If we reached here, all selectors failed
        console.error(`Failed to find element with any of these selectors: ${this.selectors.join(', ')}`);
        return null;
    }
    
    /**
     * Click on the element
     * @returns {Promise<boolean>} Success or failure
     */
    async click() {
        const element = await this.find();
        if (element) {
            await element.click();
            return true;
        }
        return false;
    }
    
    /**
     * Type into the element
     * @param {string} text - Text to type
     * @returns {Promise<boolean>} Success or failure
     */
    async type(text) {
        const element = await this.find();
        if (element) {
            await element.type(text);
            return true;
        }
        return false;
    }
    
    /**
     * Get text content of the element
     * @returns {Promise<string|null>} Text content or null
     */
    async getText() {
        const element = await this.find();
        if (element) {
            return await this.page.evaluate(el => el.textContent.trim(), element);
        }
        return null;
    }
    
    /**
     * Check if element exists
     * @returns {Promise<boolean>} Whether element exists
     */
    async exists() {
        const element = await this.find();
        return element !== null;
    }
    
    /**
     * Wait for element to be visible
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} Success or failure
     */
    async waitForVisible(timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = await this.find();
            if (element) {
                const isVisible = await this.page.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                }, element);
                
                if (isVisible) {
                    return true;
                }
            }
            
            // Wait a bit before next attempt
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error(`Element not visible after ${timeout}ms with selectors: ${this.selectors.join(', ')}`);
        return false;
    }
    
    /**
     * Add a new selector to the list of selectors
     * @param {string} selector - New selector to add
     */
    addSelector(selector) {
        if (!this.selectors.includes(selector)) {
            this.selectors.push(selector);
        }
    }
}

/**
 * Self-healing element factory for a page
 */
class SelfHealingPage {
    constructor(page) {
        this.page = page;
        this.elements = new Map();
    }
    
    /**
     * Get or create a self-healing element
     * @param {string} name - Element name/identifier
     * @param {string|string[]} selectors - CSS selector(s) for the element
     * @returns {SelfHealingElement} Self-healing element
     */
    element(name, selectors) {
        if (!this.elements.has(name)) {
            this.elements.set(name, new SelfHealingElement(this.page, selectors));
        } else if (selectors) {
            // If new selectors are provided, add them to existing element
            const element = this.elements.get(name);
            if (Array.isArray(selectors)) {
                selectors.forEach(selector => element.addSelector(selector));
            } else {
                element.addSelector(selectors);
            }
        }
        
        return this.elements.get(name);
    }
    
    /**
     * Navigate to URL
     * @param {string} url - URL to navigate to
     * @returns {Promise<Response>} Navigation response
     */
    async goto(url) {
        return await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    
    /**
     * Take a screenshot
     * @param {string} path - Path to save screenshot
     * @returns {Promise<void>}
     */
    async screenshot(path) {
        await this.page.screenshot({ path });
    }
    
    /**
     * Get the page title
     * @returns {Promise<string>} Page title
     */
    async getTitle() {
        return await this.page.title();
    }
    
    /**
     * Get the page URL
     * @returns {Promise<string>} Page URL
     */
    async getUrl() {
        return await this.page.url();
    }
}

module.exports = {
    SelfHealingElement,
    SelfHealingPage
};
