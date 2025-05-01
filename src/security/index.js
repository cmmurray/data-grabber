/**
 * Security module for data-grabber
 * Provides a unified API for all security features
 */

const { secureDelete, secureDeleteDirectory, isPathOnSSD } = require('./secure-delete');
const { SecureTemporaryStorage } = require('./secure-storage');
const { IsolatedEnvironment, NetworkBlocker } = require('./isolation');
const { MemoryProtection } = require('./memory');

/**
 * Creates a secure processing environment for sensitive data
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.name - Name for the secure environment
 * @param {boolean} options.blockNetwork - Whether to block network access
 * @param {boolean} options.protectMemory - Whether to enable memory protections
 * @returns {Promise<Object>} - The secure environment interface
 */
async function createSecureEnvironment(options = {}) {
  // Create isolated environment
  const isolatedEnv = new IsolatedEnvironment({
    name: options.name,
    blockNetwork: options.blockNetwork !== false, // Default to true
    restrictFileSystem: options.restrictFileSystem !== false, // Default to true
  });
  
  // Create memory protection if requested
  const memoryProtection = options.protectMemory !== false ? 
    new MemoryProtection() : null;
  
  // Initialize both components
  await isolatedEnv.initialize();
  
  if (memoryProtection) {
    await memoryProtection.activate();
  }
  
  // Return a simplified API for the secure environment
  return {
    /**
     * Store data securely in the isolated environment
     * 
     * @param {string} key - Identifier for the data
     * @param {Buffer|string} data - Data to store
     * @returns {Promise<string>} - Path to the stored data
     */
    storeData: (key, data) => isolatedEnv.storeData(key, data),
    
    /**
     * Retrieve data from the isolated environment
     * 
     * @param {string} key - Identifier for the data
     * @returns {Promise<Buffer>} - The retrieved data
     */
    retrieveData: (key) => isolatedEnv.retrieveData(key),
    
    /**
     * Execute a function within the secure environment
     * 
     * @param {Function} fn - Function to execute
     * @param {Array} args - Arguments to pass to the function
     * @returns {Promise<any>} - Result of the function
     */
    execute: (fn, ...args) => isolatedEnv.execute(fn, ...args),
    
    /**
     * Clean up and destroy the secure environment
     * 
     * @returns {Promise<boolean>} - Success status
     */
    destroy: async () => {
      let success = true;
      
      // Clean up the isolated environment
      try {
        await isolatedEnv.cleanup();
      } catch (error) {
        console.error('Error cleaning up isolated environment:', error);
        success = false;
      }
      
      // Clean up memory protection
      if (memoryProtection) {
        try {
          memoryProtection.cleanup();
        } catch (error) {
          console.error('Error cleaning up memory protection:', error);
          success = false;
        }
      }
      
      return success;
    },
    
    /**
     * Zero out a buffer securely
     * 
     * @param {Buffer} buffer - Buffer to zero
     * @returns {Buffer} - Zeroed buffer
     */
    zeroBuffer: (buffer) => memoryProtection ? 
      memoryProtection.secureZeroBuffer(buffer) : buffer.fill(0),
    
    /**
     * Clear sensitive data from an object
     * 
     * @param {Object} obj - Object containing sensitive data
     * @returns {Object} - Object with cleared data
     */
    clearObject: (obj) => memoryProtection ? 
      memoryProtection.clearObject(obj) : null
  };
}

/**
 * Verify that data has been securely deleted
 * 
 * @param {string} path - Path that should no longer exist
 * @returns {Promise<Object>} - Verification results
 */
async function verifyDeletion(path) {
  const fs = require('fs');
  const results = {
    path,
    exists: false,
    containsData: false,
    recoveryAttempted: false,
    recovered: false,
    details: []
  };
  
  // Check if the file or directory still exists
  try {
    await fs.promises.access(path, fs.constants.F_OK);
    results.exists = true;
    results.details.push(`WARNING: Path ${path} still exists`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      results.details.push(`Path ${path} does not exist (good)`);
    } else {
      results.details.push(`Error checking path: ${error.message}`);
    }
  }
  
  // If it's an SSD, recovery is less likely, but still possible
  const isSSD = await isPathOnSSD(path);
  results.details.push(`Storage type: ${isSSD ? 'SSD' : 'HDD or unknown'}`);
  
  if (isSSD) {
    results.details.push('SSDs use wear leveling which means deleted data might still exist in other blocks');
    results.details.push('However, secure deletion with TRIM commands is generally effective');
  }
  
  return results;
}

// Export all security components
module.exports = {
  createSecureEnvironment,
  secureDelete,
  secureDeleteDirectory,
  verifyDeletion,
  SecureTemporaryStorage,
  IsolatedEnvironment,
  NetworkBlocker,
  MemoryProtection
};