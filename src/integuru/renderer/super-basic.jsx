/**
 * Super basic React app without any dependencies other than React and ReactDOM
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Super basic React app starting - React version:', React.version);

// Simple component
const App = () => {
  const [count, setCount] = React.useState(0);
  const [apiStatus, setApiStatus] = React.useState('Not tested');

  // Test the API connection immediately when component mounts
  React.useEffect(() => {
    console.log('Component mounted, testing API connection');
    testApi();
  }, []);

  const testApi = () => {
    try {
      console.log('Testing API connection');
      console.log('Window API available:', !!window.api);
      
      if (window.api && typeof window.api.test === 'function') {
        console.log('API test method found, calling it');
        const result = window.api.test();
        console.log('API test result:', result);
        setApiStatus(result);
      } else {
        console.error('API or test method not available');
        setApiStatus('API not available');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      setApiStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div 
      data-react-app="true"
      style={{
        fontFamily: 'sans-serif',
        maxWidth: '800px',
        margin: '20px auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}
    >
      <h1>Data Grabber</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>State Test</h2>
        <p>Count: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            backgroundColor: '#4CAF50',
            border: 'none',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Increment
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>API Test</h2>
        <p>Status: {apiStatus}</p>
        <button 
          onClick={testApi}
          style={{
            backgroundColor: '#2196F3',
            border: 'none',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Connection
        </button>
      </div>
    </div>
  );
};

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({
      errorMessage: error.message,
      errorStack: error.stack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: 'red',
          border: '1px solid red',
          padding: '20px',
          margin: '20px',
          borderRadius: '5px'
        }}>
          <h2>React Error</h2>
          <p>{this.state.errorMessage}</p>
          <pre style={{
            background: '#f5f5f5',
            padding: '10px',
            overflow: 'auto'
          }}>
            {this.state.errorStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe initialization function with additional error handling
function initializeReact() {
  try {
    console.log('Initializing React application');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('Root element found, creating React root');
    const root = createRoot(rootElement);
    
    console.log('Rendering app with error boundary');
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Failed to initialize React app:', error);
    
    // Fallback to show error in DOM
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="color: red; border: 1px solid red; padding: 20px; margin: 20px; border-radius: 5px;">
          <h2>React Initialization Error</h2>
          <p>${error.message}</p>
          <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">${error.stack}</pre>
          <button onclick="window.location.reload()" 
            style="background-color: #2196F3; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px">
            Reload Application
          </button>
        </div>
      `;
    }
  }
}

// Make sure window.React is available globally for debugging
window.React = React;

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeReact);
} else {
  // DOM already loaded, initialize now
  setTimeout(initializeReact, 0);
}