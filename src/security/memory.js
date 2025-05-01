/**
 * Memory protection features to prevent data leakage
 * Provides utilities for secure memory handling and protection
 */

const os = require('os');
const crypto = require('crypto');
const v8 = require('v8');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * Class providing memory protection utilities
 */
class MemoryProtection {
  /**
   * Initialize memory protection features
   * 
   * @param {Object} options - Configuration options
   * @param {boolean} options.disableCoreDumps - Whether to disable core dumps (default: true)
   * @param {boolean} options.disableDebugging - Whether to attempt to prevent debugging (default: true)
   */
  constructor(options = {}) {
    this.disableCoreDumps = options.disableCoreDumps !== false; // Default to true
    this.disableDebugging = options.disableDebugging !== false; // Default to true
    this.platform = os.platform();
    this.protectionsActive = false;
  }
  
  /**
   * Activate memory protections
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async activate() {
    if (this.protectionsActive) {
      return true; // Already active
    }
    
    try {
      // Disable core dumps
      if (this.disableCoreDumps) {
        await this._disableCoreDumps();
      }
      
      // Attempt to prevent debugging
      if (this.disableDebugging) {
        this._preventDebugging();
      }
      
      // Schedule regular garbage collection
      this._scheduleGarbageCollection();
      
      this.protectionsActive = true;
      return true;
    } catch (error) {
      console.error('Error activating memory protections:', error);
      throw error;
    }
  }
  
  /**
   * Securely zero a buffer in memory
   * 
   * @param {Buffer} buffer - Buffer to zero
   * @returns {Buffer} - Zeroed buffer
   */
  secureZeroBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Argument must be a Buffer');
    }
    
    // Fill with zeros
    buffer.fill(0);
    
    return buffer;
  }
  
  /**
   * Securely zero a string's memory
   * This is a best-effort approach since strings are immutable in JavaScript
   * 
   * @param {string} str - String to zero (will become empty)
   * @returns {string} - Empty string
   */
  secureZeroString(str) {
    if (typeof str !== 'string') {
      throw new TypeError('Argument must be a string');
    }
    
    // Best effort to clear the string from memory
    // Create a new string reference, and hope the GC cleans up the old one
    str = '';
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
    
    return str;
  }
  
  /**
   * Clear sensitive data from closures
   * 
   * @param {Object} obj - Object containing sensitive data
   * @returns {Object} - Object with cleared data
   */
  clearObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    
    // For each property in the object
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = '';
      } else if (Buffer.isBuffer(obj[key])) {
        this.secureZeroBuffer(obj[key]);
      } else if (typeof obj[key] === 'object') {
        this.clearObject(obj[key]);
      }
      
      // Try to delete the property
      try {
        delete obj[key];
      } catch (e) {
        // If deletion fails, at least null it
        obj[key] = null;
      }
    });
    
    return null;
  }
  
  /**
   * Create a self-destructing buffer that will zero itself when garbage collected
   * 
   * @param {number} size - Size of the buffer
   * @returns {Object} - Object containing the buffer and a clear function
   */
  createProtectedBuffer(size) {
    const buffer = Buffer.alloc(size);
    
    // Create a finalizer to zero the buffer when it's garbage collected
    const finalizationRegistry = new FinalizationRegistry((buf) => {
      // This will run when the buffer is garbage collected
      if (Buffer.isBuffer(buf)) {
        buf.fill(0);
      }
    });
    
    // Register the buffer with the finalizer
    const token = {};
    finalizationRegistry.register(buffer, buffer, token);
    
    // Return an object with the buffer and a clear method
    return {
      buffer,
      clear: () => {
        this.secureZeroBuffer(buffer);
        finalizationRegistry.unregister(token);
      }
    };
  }
  
  /**
   * Force a full garbage collection
   * Only works if Node.js was started with --expose-gc
   * 
   * @returns {boolean} - Whether garbage collection was triggered
   */
  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      return true;
    }
    
    console.warn('Cannot force garbage collection. Start Node.js with --expose-gc to enable this feature.');
    return false;
  }
  
  /**
   * Protect against heap dumps
   * This is a best-effort approach
   * 
   * @returns {boolean} - Success status
   */
  protectAgainstHeapDumps() {
    try {
      // Overwrite heap snapshot function to prevent heap dumps
      const originalHeapSnapshot = v8.getHeapSnapshot;
      
      v8.getHeapSnapshot = function() {
        throw new Error('Heap snapshots are disabled for security reasons');
      };
      
      // Restore original function when requested
      this.restoreHeapDumps = () => {
        v8.getHeapSnapshot = originalHeapSnapshot;
        return true;
      };
      
      return true;
    } catch (error) {
      console.warn('Could not protect against heap dumps:', error.message);
      return false;
    }
  }
  
  /**
   * Stop scheduled garbage collection and cleanup
   * 
   * @returns {boolean} - Success status
   */
  cleanup() {
    try {
      // Clear garbage collection interval
      if (this._gcInterval) {
        clearInterval(this._gcInterval);
        this._gcInterval = null;
      }
      
      // Restore heap dumps if they were disabled
      if (this.restoreHeapDumps) {
        this.restoreHeapDumps();
        this.restoreHeapDumps = null;
      }
      
      this.protectionsActive = false;
      return true;
    } catch (error) {
      console.error('Error cleaning up memory protections:', error);
      return false;
    }
  }
  
  /**
   * Disable core dumps
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _disableCoreDumps() {
    try {
      if (this.platform === 'linux' || this.platform === 'darwin') {
        // For Unix-like systems
        await exec('ulimit -c 0');
      } else if (this.platform === 'win32') {
        // Windows doesn't have a simple command-line way to disable core dumps
        // But process.exit below will help prevent debugging
      }
      
      // Register a signal handler to exit immediately on crashes
      // This helps prevent core dumps
      ['SIGSEGV', 'SIGILL', 'SIGFPE', 'SIGABRT'].forEach(signal => {
        process.on(signal, () => {
          process.exit(1);
        });
      });
    } catch (error) {
      console.warn('Could not disable core dumps:', error.message);
    }
  }
  
  /**
   * Attempt to prevent debugging of the process
   * This is a best-effort approach
   * 
   * @private
   */
  _preventDebugging() {
    try {
      // Check if a debugger is connected
      if (process.execArgv.some(arg => 
          arg.startsWith('--inspect') || 
          arg.startsWith('--debug'))) {
        console.error('Debugging is not allowed for security reasons');
        process.exit(1);
      }
      
      // Set up a handler to exit if a debugger is attached
      // Not 100% reliable but provides some protection
      let lastMemoryUsage = process.memoryUsage().heapUsed;
      
      // Check periodically for debugger
      this._debuggerCheckInterval = setInterval(() => {
        // Most debuggers will cause unusual memory patterns
        const currentMemoryUsage = process.memoryUsage().heapUsed;
        const delta = Math.abs(currentMemoryUsage - lastMemoryUsage);
        lastMemoryUsage = currentMemoryUsage;
        
        // If there's a suspiciously large change, check more carefully
        if (delta > 50 * 1024 * 1024) { // 50MB threshold
          if (this._isDebuggerAttached()) {
            console.error('Debugger detected, exiting for security');
            process.exit(1);
          }
        }
      }, 1000);
    } catch (error) {
      console.warn('Error setting up anti-debugging measures:', error.message);
    }
  }
  
  /**
   * Check if a debugger is attached
   * 
   * @private
   * @returns {boolean} - Whether a debugger is attached
   */
  _isDebuggerAttached() {
    // Best-effort detection of debuggers
    try {
      const inspector = require('inspector');
      
      try {
        inspector.open(0);
        inspector.close();
        // If we can open the inspector, it's not currently in use
        return false;
      } catch (e) {
        // If opening fails, someone else might be using it
        return true;
      }
    } catch (e) {
      // Inspector not available
      return false;
    }
  }
  
  /**
   * Schedule regular garbage collection
   * 
   * @private
   */
  _scheduleGarbageCollection() {
    // Only works if Node.js was started with --expose-gc
    if (global.gc) {
      // Run garbage collection every 30 seconds
      this._gcInterval = setInterval(() => {
        global.gc();
      }, 30000);
    }
  }
}

module.exports = {
  MemoryProtection
};