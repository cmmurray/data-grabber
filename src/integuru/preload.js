/**
 * Preload script for Electron
 * Exposes APIs to the renderer process in a secure way
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing');

// Add a simple test method to check if API is working
function testMethod() {
  console.log('Test method called from renderer');
  return 'API is working!';
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log('Exposing API to renderer process');
  
  // Define our API object
  const apiObject = {
    // Simple test method
    test: testMethod,
    
    // Network capture
    captureNetworkRequests: (options) => {
      console.log('captureNetworkRequests called with:', options);
      return ipcRenderer.invoke('capture-network-requests', options);
    },
    
    // Integration management
    listIntegrations: () => {
      console.log('listIntegrations called');
      return ipcRenderer.invoke('list-integrations');
    },
    getIntegration: (id) => {
      console.log('getIntegration called with:', id);
      return ipcRenderer.invoke('get-integration', id);
    },
    saveIntegration: (integration) => {
      console.log('saveIntegration called');
      return ipcRenderer.invoke('save-integration', integration);
    },
    deleteIntegration: (id) => {
      console.log('deleteIntegration called with:', id);
      return ipcRenderer.invoke('delete-integration', id);
    },
    
    // Integration execution
    runIntegration: (id, params, securityOptions) => {
      console.log('runIntegration called with:', id);
      return ipcRenderer.invoke('run-integration', { id, params, securityOptions });
    },
    
    // OpenAI API
    generateIntegrationCode: (harData, description, model) => {
      console.log('generateIntegrationCode called');
      return ipcRenderer.invoke('generate-integration-code', { harData, description, model });
    }
  };
  
  // Expose the API object to the window
  contextBridge.exposeInMainWorld('api', apiObject);
  
  // Add a debug property to verify API is working
  contextBridge.exposeInMainWorld('apiDebug', {
    isLoaded: true,
    timestamp: Date.now()
  });
  
  console.log('API successfully exposed to renderer process');
} catch (error) {
  console.error('Failed to expose API to renderer process:', error);
  
  // Even if the main API fails, try to expose a minimal API for debugging
  try {
    contextBridge.exposeInMainWorld('apiDebug', {
      error: error.message,
      isLoaded: false,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Failed to expose even debug API:', e);
  }
}

// For debugging: log when preload is done
console.log('Preload script completed');

// For debugging: register ready event
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload: DOM content loaded');
  
  // Try to log the API status after a short delay
  setTimeout(() => {
    console.log('API check after delay: window.api available:', !!window.api);
    console.log('API debug info:', window.apiDebug);
  }, 100);
});