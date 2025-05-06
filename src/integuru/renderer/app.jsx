import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Add debug helper
function debugLog(message) {
  console.log(`[REACT-DEBUG] ${message}`);
  // Also try to add to the UI debug area if it exists
  try {
    if (typeof window !== 'undefined' && window.addLoadInfo) {
      window.addLoadInfo(message);
    }
  } catch (e) {
    console.error('Could not add to UI debug:', e);
  }
}

// Make debug function global to help troubleshooting
if (typeof window !== 'undefined') {
  window.debugLog = debugLog;
}

// Log React version for debugging
debugLog(`React app starting to initialize - React version: ${React.version}`);
debugLog(`CreateRoot available: ${typeof createRoot === 'function'}`);
debugLog(`Module system working: imports loaded successfully`);

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({
      errorMessage: error.message,
      errorStack: error.stack
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{ 
          color: 'red', 
          margin: '20px', 
          padding: '20px', 
          border: '1px solid red',
          borderRadius: '5px',
          backgroundColor: '#ffebee'
        }}>
          <h2>Something went wrong.</h2>
          <p><strong>Error:</strong> {this.state.errorMessage}</p>
          <details>
            <summary>Error Details</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.errorStack}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '20px',
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Very simple app component
const SimpleApp = () => {
  console.log('SimpleApp rendering');
  const [apiTestResult, setApiTestResult] = useState('Not tested');
  
  // Test if the API is available
  const testApi = () => {
    try {
      console.log('Testing API connection...');
      if (window.api && typeof window.api.test === 'function') {
        const result = window.api.test();
        console.log('API test result:', result);
        setApiTestResult(result);
      } else {
        console.error('API or test method not available');
        setApiTestResult('API or test method not available');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      setApiTestResult(`Error: ${error.message}`);
    }
  };
  
  return (
    <div 
      data-react-app="true"
      style={{ 
        maxWidth: '800px', 
        margin: '20px auto', 
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <h1 style={{ color: '#2c3e50', marginTop: 0 }}>React App is Working!</h1>
      <p>If you can see this content, React is rendering successfully.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>API Test</h3>
        <p>Result: <span style={{ fontWeight: 'bold' }}>{apiTestResult}</span></p>
        <button 
          onClick={testApi}
          style={{ 
            backgroundColor: '#4caf50', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Test API Connection
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Debug Information</h3>
        <ul style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
          <li>Window API Available: {window.api ? 'Yes' : 'No'}</li>
          <li>React Version: {React.version}</li>
          <li>Current Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
    </div>
  );
};

// App wrapper with error boundary
const App = () => {
  return (
    <ErrorBoundary>
      <SimpleApp />
    </ErrorBoundary>
  );
};

// Initialize the app - Delay to ensure DOM is fully loaded
const initApp = () => {
  try {
    debugLog('Initializing React application');
    debugLog(`Document readyState: ${document.readyState}`);
    debugLog(`React version available: ${React.version}`);
    debugLog(`createRoot available: ${typeof createRoot === 'function'}`);
    
    const container = document.getElementById('root');
    debugLog(`Root element found: ${!!container}`);
    
    if (!container) {
      throw new Error('Root element not found');
    }
    
    debugLog('Root element contents length: ' + (container.innerHTML ? container.innerHTML.length : 0) + ' chars');
    
    try {
      debugLog('Creating React root with createRoot');
      const root = createRoot(container);
      
      debugLog('About to render App component');
      root.render(<App />);
      
      debugLog('React render method called - App should be mounting');
      
      // Verify the app mounted correctly after a short delay
      setTimeout(() => {
        const appMounted = !!document.querySelector('[data-react-app]');
        debugLog(`Verification check - React app mounted: ${appMounted}`);
        
        // If React didn't mount by now, there's a deeper problem
        if (!appMounted) {
          debugLog('WARNING: React app did not mount even after render() call');
        }
      }, 500);
      
    } catch (error) {
      debugLog(`Error creating/rendering React root: ${error.message}`);
      console.error('Error rendering React app:', error);
      
      // Display error in DOM as fallback
      container.innerHTML = `
        <div style="color: red; padding: 20px; border: 1px solid red; border-radius: 5px; margin: 20px; background-color: #fff0f0;">
          <h3>Error Rendering React App</h3>
          <p>${error.message}</p>
          <pre style="background-color: #f5f5f5; padding: 10px; overflow-x: auto;">${error.stack}</pre>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload App
          </button>
        </div>
      `;
    }
  } catch (error) {
    debugLog(`Critical initialization error: ${error.message}`);
    console.error('Critical initialization error:', error);
    
    // Try to show error in body if possible
    try {
      document.body.innerHTML = `
        <div style="color: red; padding: 20px; border: 1px solid red; border-radius: 5px; margin: 20px; background-color: #fff0f0;">
          <h3>Critical Initialization Error</h3>
          <p>${error.message}</p>
          <pre style="background-color: #f5f5f5; padding: 10px; overflow-x: auto;">${error.stack}</pre>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload App
          </button>
        </div>
      `;
    } catch (e) {
      debugLog(`Failed to display error in DOM: ${e.message}`);
    }
  }
};

// Register both ways of initializing to be safe
if (document.readyState === 'loading') {
  debugLog('Document still loading, registering DOMContentLoaded listener');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  debugLog('Document already loaded, initializing immediately');
  setTimeout(initApp, 0);
}

// Also try window.onload as a last resort
window.addEventListener('load', () => {
  debugLog('Window load event fired');
  const appMounted = !!document.querySelector('[data-react-app]');
  
  if (!appMounted) {
    debugLog('React app not mounted after window.load event, trying one last time');
    setTimeout(initApp, 0);
  }
});