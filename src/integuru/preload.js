/**
 * Preload script for Electron
 * Exposes APIs to the renderer process in a secure way
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Network capture
    captureNetworkRequests: (options) => {
      return ipcRenderer.invoke('capture-network-requests', options);
    },
    
    // Integration management
    listIntegrations: () => {
      return ipcRenderer.invoke('list-integrations');
    },
    getIntegration: (id) => {
      return ipcRenderer.invoke('get-integration', id);
    },
    saveIntegration: (integration) => {
      return ipcRenderer.invoke('save-integration', integration);
    },
    deleteIntegration: (id) => {
      return ipcRenderer.invoke('delete-integration', id);
    },
    
    // Integration execution
    runIntegration: (id, params, securityOptions) => {
      return ipcRenderer.invoke('run-integration', { id, params, securityOptions });
    },
    
    // OpenAI API
    generateIntegrationCode: (harData, description, model) => {
      return ipcRenderer.invoke('generate-integration-code', { harData, description, model });
    }
  }
);