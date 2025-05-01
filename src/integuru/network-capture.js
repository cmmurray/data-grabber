/**
 * Network capture module
 * Provides functionality to capture network requests using Playwright
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Capture network requests using Playwright
 * 
 * @param {Object} options - Capture options
 * @param {string} options.url - Starting URL for the capture session (optional)
 * @param {string} options.outputDir - Directory to save HAR file (optional)
 * @returns {Promise<Object>} - Capture results including paths to HAR and cookies files
 */
async function captureNetworkRequests(options = {}) {
  // Create output directory if not specified
  const outputDir = options.outputDir || path.join(os.tmpdir(), 'data-grabber', 'network-capture');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate output filenames
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const harPath = path.join(outputDir, `network_requests_${timestamp}.har`);
  const cookiesPath = path.join(outputDir, `cookies_${timestamp}.json`);
  
  // Log start of capture
  console.log('Starting network request capture');
  console.log(`HAR will be saved to: ${harPath}`);
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false // Show the browser for user interaction
  });
  
  // Create context with HAR recording enabled
  const context = await browser.newContext({
    recordHarPath: harPath,
    recordHarContent: 'embed' // Include request/response bodies
  });
  
  // Create new page
  const page = await context.newPage();
  
  try {
    // Navigate to starting URL if provided
    if (options.url) {
      await page.goto(options.url);
    } else {
      // Default to a blank page if no URL provided
      await page.goto('about:blank');
    }
    
    // Tell the user what to do
    console.log('Browser session started for network capture.');
    console.log('Please perform the actions you want to capture.');
    console.log('When finished, close the browser window.');
    
    // Wait for the browser to close
    await browser.waitForEvent('disconnected', { timeout: 0 }); // No timeout
    
    console.log('Browser closed. Processing captured data...');
    
    // Save cookies
    const cookies = await context.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    
    return {
      harPath,
      cookiesPath,
      timestamp,
      captureComplete: true
    };
  } catch (error) {
    console.error('Error during network capture:', error);
    
    // Attempt to close browser if still open
    try {
      if (browser) await browser.close();
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
    
    throw error;
  }
}

module.exports = {
  captureNetworkRequests
};