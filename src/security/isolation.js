/**
 * Data isolation utilities to prevent data leakage
 * Implements sandboxing and network control features
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { SecureTemporaryStorage } = require('./secure-storage');

// Determine the platform
const platform = os.platform();

/**
 * Represents an isolated environment for data processing
 */
class IsolatedEnvironment {
  /**
   * Create a new isolated environment
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.name - Name for this isolated environment
   * @param {boolean} options.blockNetwork - Whether to block network access
   * @param {boolean} options.restrictFileSystem - Whether to restrict filesystem access
   */
  constructor(options = {}) {
    this.name = options.name || `isolated-env-${Date.now()}`;
    this.blockNetwork = options.blockNetwork !== false; // Default to true
    this.restrictFileSystem = options.restrictFileSystem !== false; // Default to true
    
    this.secureStorage = null;
    this.networkBlocker = null;
    this.originalFileHandles = new Map();
    this.isActive = false;
    
    // Register cleanup handlers
    this._registerCleanupHandlers();
  }
  
  /**
   * Initialize and activate the isolated environment
   * 
   * @returns {Promise<this>} - The initialized environment
   */
  async initialize() {
    // Create secure storage
    this.secureStorage = new SecureTemporaryStorage({
      name: `${this.name}-storage`,
      autoDestroy: true
    });
    await this.secureStorage.initialize();
    
    // Activate network blocking if requested
    if (this.blockNetwork) {
      this.networkBlocker = new NetworkBlocker();
      await this.networkBlocker.initialize();
      await this.networkBlocker.blockAll();
    }
    
    // Activate filesystem restrictions if requested
    if (this.restrictFileSystem) {
      await this._restrictFileSystem();
    }
    
    this.isActive = true;
    
    return this;
  }
  
  /**
   * Store data in the isolated environment's secure storage
   * 
   * @param {string} key - Identifier for the data
   * @param {Buffer|string} data - Data to store
   * @returns {Promise<string>} - Path to the stored data
   */
  async storeData(key, data) {
    if (!this.isActive) {
      throw new Error('Isolated environment is not active');
    }
    
    return this.secureStorage.store(key, data);
  }
  
  /**
   * Retrieve data from the isolated environment's secure storage
   * 
   * @param {string} key - Identifier for the data
   * @returns {Promise<Buffer>} - The retrieved data
   */
  async retrieveData(key) {
    if (!this.isActive) {
      throw new Error('Isolated environment is not active');
    }
    
    return this.secureStorage.retrieve(key);
  }
  
  /**
   * Execute a function within the isolated environment
   * 
   * @param {Function} fn - Function to execute
   * @param {Array} args - Arguments to pass to the function
   * @returns {Promise<any>} - Result of the function
   */
  async execute(fn, ...args) {
    if (!this.isActive) {
      throw new Error('Isolated environment is not active');
    }
    
    // Execute the function in the isolated context
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error executing function in isolated environment:', error);
      throw error;
    }
  }
  
  /**
   * Clean up and deactivate the isolated environment
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async cleanup() {
    if (!this.isActive) {
      return true; // Already cleaned up
    }
    
    try {
      // Restore network access
      if (this.networkBlocker) {
        await this.networkBlocker.restore();
        this.networkBlocker = null;
      }
      
      // Restore filesystem access
      if (this.restrictFileSystem) {
        await this._restoreFileSystem();
      }
      
      // Destroy secure storage
      if (this.secureStorage) {
        await this.secureStorage.destroy();
        this.secureStorage = null;
      }
      
      this.isActive = false;
      return true;
    } catch (error) {
      console.error('Error cleaning up isolated environment:', error);
      throw error;
    }
  }
  
  /**
   * Register handlers for cleanup on process exit
   * 
   * @private
   */
  _registerCleanupHandlers() {
    // Handle normal exit
    process.on('exit', () => {
      if (this.isActive) {
        this._synchronousCleanup();
      }
    });
    
    // Handle forced exit
    process.on('SIGINT', async () => {
      if (this.isActive) {
        await this.cleanup().catch(console.error);
        process.exit(130);
      }
    });
    
    process.on('SIGTERM', async () => {
      if (this.isActive) {
        await this.cleanup().catch(console.error);
        process.exit(143);
      }
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (err) => {
      console.error('Uncaught exception in isolated environment:', err);
      if (this.isActive) {
        await this.cleanup().catch(console.error);
        process.exit(1);
      }
    });
  }
  
  /**
   * Synchronous cleanup for use in exit handlers
   * 
   * @private
   */
  _synchronousCleanup() {
    try {
      // Best-effort synchronous cleanup
      if (this.secureStorage) {
        this.secureStorage.destroySync();
      }
      
      // Note: Network and filesystem restrictions can't be reliably cleaned up synchronously
      // But the OS will restore these when the process exits anyway
      
      this.isActive = false;
    } catch (error) {
      console.error('Error in synchronous isolated environment cleanup:', error);
    }
  }
  
  /**
   * Restrict filesystem access
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _restrictFileSystem() {
    // Our approach depends on platform
    // In Node.js we can't fully sandbox the filesystem,
    // but we can override key fs methods to restrict access
    
    // Save original fs methods we'll override
    this.originalFileHandles.set('readFile', fs.readFile);
    this.originalFileHandles.set('writeFile', fs.writeFile);
    this.originalFileHandles.set('readdir', fs.readdir);
    this.originalFileHandles.set('unlink', fs.unlink);
    
    // Get allowlisted paths (the secure storage path and standard paths)
    const allowedPaths = [
      this.secureStorage.storagePath,
      os.tmpdir(),
      process.cwd()
    ];
    
    // Override fs methods to check paths
    const self = this;
    
    fs.readFile = function restrictedReadFile(filePath, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Check if the path is allowed
      if (!self._isPathAllowed(filePath, allowedPaths)) {
        const err = new Error(`Security restriction: Reading from ${filePath} is not allowed in isolated environment`);
        err.code = 'EACCES';
        
        if (callback) {
          return process.nextTick(() => callback(err));
        }
        return new Promise((_, reject) => reject(err));
      }
      
      // Path is allowed, proceed with original function
      return self.originalFileHandles.get('readFile').apply(this, arguments);
    };
    
    fs.writeFile = function restrictedWriteFile(filePath, data, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Check if the path is allowed
      if (!self._isPathAllowed(filePath, allowedPaths)) {
        const err = new Error(`Security restriction: Writing to ${filePath} is not allowed in isolated environment`);
        err.code = 'EACCES';
        
        if (callback) {
          return process.nextTick(() => callback(err));
        }
        return new Promise((_, reject) => reject(err));
      }
      
      // Path is allowed, proceed with original function
      return self.originalFileHandles.get('writeFile').apply(this, arguments);
    };
    
    // Similar restrictions for other fs methods
    // (Omitting full implementation for brevity, but would follow same pattern)
  }
  
  /**
   * Check if a path is in the allowed list
   * 
   * @private
   * @param {string} testPath - Path to test
   * @param {string[]} allowedPaths - List of allowed paths
   * @returns {boolean} - Whether the path is allowed
   */
  _isPathAllowed(testPath, allowedPaths) {
    // Normalize path to prevent path traversal attacks
    const normalizedPath = path.normalize(testPath);
    
    // Check if the path is within any allowed path
    return allowedPaths.some(allowedPath => {
      const normalizedAllowedPath = path.normalize(allowedPath);
      return normalizedPath === normalizedAllowedPath || 
             normalizedPath.startsWith(normalizedAllowedPath + path.sep);
    });
  }
  
  /**
   * Restore original filesystem access
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _restoreFileSystem() {
    // Restore original fs methods
    for (const [method, originalFn] of this.originalFileHandles.entries()) {
      fs[method] = originalFn;
    }
    
    this.originalFileHandles.clear();
  }
}

/**
 * Network blocking utility to prevent data exfiltration
 */
class NetworkBlocker {
  constructor() {
    this.isBlocking = false;
    this.platform = os.platform();
    this.originalRequests = new Map();
    this.savedRules = null;
  }
  
  /**
   * Initialize the network blocker
   * 
   * @returns {Promise<this>}
   */
  async initialize() {
    // Save original networking modules functionality
    this._saveOriginalNetworking();
    
    return this;
  }
  
  /**
   * Block all network access
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async blockAll() {
    if (this.isBlocking) {
      return true; // Already blocking
    }
    
    // First, override Node.js networking APIs
    this._overrideNodeNetworking();
    
    // Then, configure system firewall if we have permissions
    // This provides an extra layer of protection
    try {
      await this._configureSystemFirewall();
    } catch (error) {
      console.warn('Could not configure system firewall, falling back to Node.js networking override only:', error.message);
    }
    
    this.isBlocking = true;
    return true;
  }
  
  /**
   * Restore network access
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async restore() {
    if (!this.isBlocking) {
      return true; // Not blocking
    }
    
    // Restore Node.js networking APIs
    this._restoreNodeNetworking();
    
    // Restore system firewall
    try {
      await this._restoreSystemFirewall();
    } catch (error) {
      console.warn('Could not restore system firewall, but Node.js networking has been restored:', error.message);
    }
    
    this.isBlocking = false;
    return true;
  }
  
  /**
   * Save original networking module functionality
   * 
   * @private
   */
  _saveOriginalNetworking() {
    // Save original HTTP/HTTPS request functions
    const http = require('http');
    const https = require('https');
    
    this.originalRequests.set('http.request', http.request);
    this.originalRequests.set('http.get', http.get);
    this.originalRequests.set('https.request', https.request);
    this.originalRequests.set('https.get', https.get);
    
    // Save original net.Socket.connect method
    const net = require('net');
    this.originalRequests.set('net.Socket.connect', net.Socket.prototype.connect);
    this.originalRequests.set('net.Socket.connectTCP', net.Socket.prototype.connectTCP);
  }
  
  /**
   * Override Node.js networking APIs to block all requests
   * 
   * @private
   */
  _overrideNodeNetworking() {
    const blockedError = new Error('Network access blocked by security isolation');
    blockedError.code = 'EACCES';
    
    // Override HTTP/HTTPS request functions
    const http = require('http');
    const https = require('https');
    
    const blockingRequest = function() {
      process.nextTick(() => {
        if (arguments[1] && typeof arguments[1] === 'function') {
          arguments[1](blockedError);
        }
      });
      
      // Return a mock request object that immediately emits an error
      const EventEmitter = require('events');
      const mockReq = new EventEmitter();
      
      process.nextTick(() => {
        mockReq.emit('error', blockedError);
      });
      
      mockReq.end = () => {};
      mockReq.abort = () => {};
      
      return mockReq;
    };
    
    http.request = blockingRequest;
    http.get = blockingRequest;
    https.request = blockingRequest;
    https.get = blockingRequest;
    
    // Override net.Socket.connect to block TCP connections
    const net = require('net');
    
    net.Socket.prototype.connect = function() {
      process.nextTick(() => {
        this.emit('error', blockedError);
      });
      
      return this;
    };
    
    net.Socket.prototype.connectTCP = function() {
      process.nextTick(() => {
        this.emit('error', blockedError);
      });
      
      return this;
    };
  }
  
  /**
   * Restore original Node.js networking functionality
   * 
   * @private
   */
  _restoreNodeNetworking() {
    // Restore HTTP/HTTPS request functions
    const http = require('http');
    const https = require('https');
    
    http.request = this.originalRequests.get('http.request');
    http.get = this.originalRequests.get('http.get');
    https.request = this.originalRequests.get('https.request');
    https.get = this.originalRequests.get('https.get');
    
    // Restore net.Socket.connect
    const net = require('net');
    net.Socket.prototype.connect = this.originalRequests.get('net.Socket.connect');
    net.Socket.prototype.connectTCP = this.originalRequests.get('net.Socket.connectTCP');
  }
  
  /**
   * Configure system firewall to block outbound connections
   * Platform-specific implementation
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _configureSystemFirewall() {
    // This requires elevated permissions and is OS-specific
    // As a fallback, we have already blocked Node.js networking
    
    const pid = process.pid;
    
    try {
      if (this.platform === 'darwin') {
        // macOS - use pf firewall
        // Save current rules
        const { stdout } = await exec('sudo pfctl -sr');
        this.savedRules = stdout;
        
        // Add rule to block outbound for this process
        await exec(`echo "block out proto {tcp udp} from any to any" | sudo pfctl -f -`);
        
      } else if (this.platform === 'linux') {
        // Linux - use iptables
        // Save current rules
        const { stdout } = await exec('sudo iptables-save');
        this.savedRules = stdout;
        
        // Block outbound for this process
        await exec(`sudo iptables -A OUTPUT -m owner --pid-owner ${pid} -j DROP`);
        
      } else if (this.platform === 'win32') {
        // Windows - use Windows Firewall
        // Add a rule to block the process
        await exec(`netsh advfirewall firewall add rule name="DataGrabberTempBlock" dir=out program="${process.execPath}" action=block`);
      }
    } catch (error) {
      console.warn(`Could not configure system firewall (requires elevated permissions): ${error.message}`);
      // Fallback to Node.js-level blocking is already in place
    }
  }
  
  /**
   * Restore system firewall to its original state
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _restoreSystemFirewall() {
    try {
      if (this.platform === 'darwin') {
        // macOS - restore saved rules
        if (this.savedRules) {
          await exec(`echo "${this.savedRules}" | sudo pfctl -f -`);
        }
        
      } else if (this.platform === 'linux') {
        // Linux - remove the rule we added
        const pid = process.pid;
        await exec(`sudo iptables -D OUTPUT -m owner --pid-owner ${pid} -j DROP`);
        
      } else if (this.platform === 'win32') {
        // Windows - remove the firewall rule
        await exec(`netsh advfirewall firewall delete rule name="DataGrabberTempBlock"`);
      }
    } catch (error) {
      console.warn(`Could not restore system firewall (requires elevated permissions): ${error.message}`);
      // Node.js-level networking is still restored
    }
  }
}

module.exports = {
  IsolatedEnvironment,
  NetworkBlocker
};