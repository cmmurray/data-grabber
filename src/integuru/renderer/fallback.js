/**
 * Fallback script for when React fails to load properly
 * This provides a basic UI when the main app.js fails
 */

console.log('Fallback script loaded');

// Wait a bit to see if React initializes
console.log('[FALLBACK] Will check for React initialization in 15 seconds');
if (window.addLoadInfo) {
  window.addLoadInfo('[FALLBACK] Scheduled check after 15s');
}

setTimeout(() => {
  console.log('[FALLBACK] Checking if React app has initialized after timeout');
  if (window.addLoadInfo) {
    window.addLoadInfo('[FALLBACK] Checking React initialization status');
  }
  
  const rootElement = document.getElementById('root');
  console.log('[FALLBACK] Root element exists:', !!rootElement);
  console.log('[FALLBACK] data-react-app exists:', rootElement && !!rootElement.querySelector('[data-react-app]'));
  console.log('[FALLBACK] window.React available:', !!window.React);
  console.log('[FALLBACK] Document ready state:', document.readyState);
  
  if (window.addLoadInfo) {
    window.addLoadInfo(`[FALLBACK] React mounted: ${rootElement && !!rootElement.querySelector('[data-react-app]')}`);
  }
  
  // Check if the React app has mounted (looking for our data-react-app attribute)
  if (rootElement && !rootElement.querySelector('[data-react-app]')) {
    console.log('[FALLBACK] React app did not initialize - activating fallback UI');
    if (window.addLoadInfo) {
      window.addLoadInfo('[FALLBACK] Activating fallback UI due to React initialization failure');
    }
    
    // Fallback UI
    rootElement.innerHTML = `
      <div style="max-width: 800px; margin: 20px auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <h1 style="color: #2c3e50; margin-top: 0;">Data Grabber (Fallback Mode)</h1>
        <p>The main application failed to load properly. This is a fallback interface.</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
          <h3>API Test</h3>
          <p>Result: <span id="api-test-result" style="font-weight: bold;">Not tested</span></p>
          <button id="test-api-btn" style="background-color: #4caf50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Test API Connection
          </button>
        </div>
        
        <div style="margin-top: 20px;">
          <h3>Debug Information</h3>
          <ul style="background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
            <li>Window API Available: <span id="api-available"></span></li>
            <li>Current Time: ${new Date().toLocaleTimeString()}</li>
            <li>Using: Fallback JavaScript UI</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px;">
          <button id="reload-btn" style="background-color: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Reload Application
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('reload-btn').addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('test-api-btn').addEventListener('click', () => {
      const resultElement = document.getElementById('api-test-result');
      resultElement.textContent = 'Testing...';
      
      try {
        if (window.api && typeof window.api.test === 'function') {
          const result = window.api.test();
          resultElement.textContent = result;
        } else {
          resultElement.textContent = 'API or test method not available';
        }
      } catch (error) {
        resultElement.textContent = `Error: ${error.message}`;
      }
    });
    
    // Display API availability
    document.getElementById('api-available').textContent = 
      window.api ? 'Yes' : 'No';
  }
}, 15000); // Wait 15 seconds to see if React initializes