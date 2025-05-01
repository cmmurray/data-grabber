/**
 * Main entry point for the Integuru UI application
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { secureStorage } = require('../security');
const { captureNetworkRequests } = require('./network-capture');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Store for integrations
const integrationsDir = path.join(app.getPath('userData'), 'integrations');
if (!fs.existsSync(integrationsDir)) {
  fs.mkdirSync(integrationsDir, { recursive: true });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // For security reasons
      contextIsolation: true, // Protect against prototype pollution
      preload: path.join(__dirname, 'preload.js') // Use a preload script
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, recreate a window when the dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Set up IPC handlers for communication with renderer process

// Handle network request capture
ipcMain.handle('capture-network-requests', async (event, options) => {
  try {
    const result = await captureNetworkRequests(options);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error capturing network requests:', error);
    return { success: false, error: error.message };
  }
});

// List all available integrations
ipcMain.handle('list-integrations', async () => {
  try {
    const files = fs.readdirSync(integrationsDir);
    const integrations = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(integrationsDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const integration = JSON.parse(data);
        
        // Don't include code in the list view for security
        const { code, ...safeIntegration } = integration;
        integrations.push(safeIntegration);
      }
    }
    
    return { success: true, data: integrations };
  } catch (error) {
    console.error('Error listing integrations:', error);
    return { success: false, error: error.message };
  }
});

// Get a specific integration
ipcMain.handle('get-integration', async (event, id) => {
  try {
    const filePath = path.join(integrationsDir, `${id}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    const integration = JSON.parse(data);
    
    return { success: true, data: integration };
  } catch (error) {
    console.error(`Error getting integration ${id}:`, error);
    return { success: false, error: error.message };
  }
});

// Save an integration
ipcMain.handle('save-integration', async (event, integration) => {
  try {
    const { id } = integration;
    if (!id) {
      return { success: false, error: 'Integration ID is required' };
    }
    
    const filePath = path.join(integrationsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(integration, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving integration:', error);
    return { success: false, error: error.message };
  }
});

// Delete an integration
ipcMain.handle('delete-integration', async (event, id) => {
  try {
    const filePath = path.join(integrationsDir, `${id}.json`);
    fs.unlinkSync(filePath);
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting integration ${id}:`, error);
    return { success: false, error: error.message };
  }
});

// Run an integration
ipcMain.handle('run-integration', async (event, { id, params, securityOptions }) => {
  try {
    const filePath = path.join(integrationsDir, `${id}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    const integration = JSON.parse(data);
    
    // For security, we'll implement a proper sandbox later
    // For now, this is a stub
    return { 
      success: true, 
      message: 'Integration executed successfully',
      // Stub result
      result: {
        processedItems: 100,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error running integration ${id}:`, error);
    return { success: false, error: error.message };
  }
});