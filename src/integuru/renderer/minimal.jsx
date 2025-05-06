// Extremely minimal React app - bare minimum to verify React is working
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('[MINIMAL] Starting minimal React app');

// Super simple component with no state, no hooks, just pure rendering
const MinimalApp = () => (
  <div data-react-app="true" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <h1>React is Working!</h1>
    <p>This proves React can render properly in this environment.</p>
    <p>API Available: {window.api ? 'Yes' : 'No'}</p>
    <button 
      onClick={() => console.log('Button clicked!')}
      style={{ 
        padding: '10px 15px', 
        backgroundColor: '#4CAF50', 
        color: 'white', 
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Click Me
    </button>
  </div>
);

// Simplest possible initialization - synchronous with no error handling
try {
  console.log('[MINIMAL] Trying to find root element');
  const container = document.getElementById('root');
  console.log('[MINIMAL] Root element found:', !!container);
  
  console.log('[MINIMAL] Creating React root');
  const root = createRoot(container);
  
  console.log('[MINIMAL] Rendering minimal app');
  root.render(<MinimalApp />);
  
  console.log('[MINIMAL] Render method called');
} catch (error) {
  console.error('[MINIMAL] Error:', error);
}