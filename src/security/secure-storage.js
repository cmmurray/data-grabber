/**
 * Secure storage mechanism for temporary data handling
 * Creates encrypted containers for sensitive data during processing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { secureDelete, secureDeleteDirectory } = require('./secure-delete');
const { ensureDirectoryExists } = require('../../utils/file-helpers');

/**
 * Class representing a secure temporary storage container
 * Used to store sensitive data during processing in an encrypted form
 */
class SecureTemporaryStorage {
  /**
   * Create a new secure temporary storage
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.name - Unique identifier for this storage
   * @param {string} options.basePath - Base directory for storage (default: system temp dir)
   * @param {boolean} options.autoDestroy - Whether to destroy storage when process ends
   */
  constructor(options = {}) {
    this.name = options.name || `secure-storage-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    this.basePath = options.basePath || path.join(os.tmpdir(), 'data-grabber');
    this.storagePath = path.join(this.basePath, this.name);
    this.isDestroyed = false;
    this.autoDestroy = options.autoDestroy !== false; // Default to true
    
    // Generate a strong encryption key that only exists in memory
    this.encryptionKey = crypto.randomBytes(32); // 256-bit key
    this.iv = crypto.randomBytes(16); // Initialization vector
    
    // Set up auto-destruction if requested
    if (this.autoDestroy) {
      // Handle normal exit
      process.on('exit', () => {
        this.destroySync();
      });
      
      // Handle forced exit
      process.on('SIGINT', () => {
        this.destroy().finally(() => process.exit(130));
      });
      
      process.on('SIGTERM', () => {
        this.destroy().finally(() => process.exit(143));
      });
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (err) => {
        console.error('Uncaught exception, destroying secure storage:', err);
        this.destroy().finally(() => process.exit(1));
      });
    }
  }
  
  /**
   * Initialize the secure storage
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    // Create the storage directory
    await ensureDirectoryExists(this.storagePath);
    
    // Create metadata file with basic info (but not the encryption key)
    const metadata = {
      created: new Date().toISOString(),
      name: this.name,
      platform: os.platform(),
      nodeVersion: process.version,
    };
    
    await fs.promises.writeFile(
      path.join(this.storagePath, '.metadata'),
      JSON.stringify(metadata, null, 2)
    );
    
    return this;
  }
  
  /**
   * Store data securely
   * 
   * @param {string} key - Identifier for the data
   * @param {Buffer|string} data - Data to store
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Path to the stored data
   */
  async store(key, data, options = {}) {
    if (this.isDestroyed) {
      throw new Error('Secure storage has been destroyed');
    }
    
    // Convert string data to buffer if needed
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Create a file path for this data
    const filePath = path.join(this.storagePath, this._sanitizeKey(key));
    
    // Encrypt the data
    const encryptedData = this._encrypt(dataBuffer);
    
    // Write the encrypted data to the file
    await fs.promises.writeFile(filePath, encryptedData);
    
    return filePath;
  }
  
  /**
   * Retrieve data from secure storage
   * 
   * @param {string} key - Identifier for the data
   * @param {Object} options - Additional options
   * @returns {Promise<Buffer>} - The decrypted data
   */
  async retrieve(key, options = {}) {
    if (this.isDestroyed) {
      throw new Error('Secure storage has been destroyed');
    }
    
    const filePath = path.join(this.storagePath, this._sanitizeKey(key));
    
    // Read the encrypted data
    const encryptedData = await fs.promises.readFile(filePath);
    
    // Decrypt and return the data
    return this._decrypt(encryptedData);
  }
  
  /**
   * Remove a specific item from secure storage
   * 
   * @param {string} key - Identifier for the data to remove
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} - Success status
   */
  async remove(key, options = {}) {
    if (this.isDestroyed) {
      return true; // Already destroyed
    }
    
    const filePath = path.join(this.storagePath, this._sanitizeKey(key));
    
    try {
      await secureDelete(filePath, { passes: options.passes || 3 });
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it successfully removed
        return true;
      }
      throw error;
    }
  }
  
  /**
   * Destroy the entire secure storage container
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async destroy() {
    if (this.isDestroyed) {
      return true; // Already destroyed
    }
    
    try {
      // Securely delete the entire directory
      await secureDeleteDirectory(this.storagePath, { passes: 3 });
      
      // Zero out the encryption key in memory
      this.encryptionKey.fill(0);
      this.iv.fill(0);
      
      this.isDestroyed = true;
      return true;
    } catch (error) {
      console.error('Error destroying secure storage:', error);
      throw error;
    }
  }
  
  /**
   * Synchronous version of destroy for use in exit handlers
   * 
   * @returns {boolean} - Success status
   */
  destroySync() {
    if (this.isDestroyed) {
      return true; // Already destroyed
    }
    
    try {
      // Best-effort synchronous deletion
      // We can't use our secure delete here because it's async
      // But we'll try to do something better than nothing
      const rimrafSync = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              rimrafSync(curPath);
            } else {
              // Overwrite with zeros before deleting
              try {
                const size = fs.statSync(curPath).size;
                const fd = fs.openSync(curPath, 'r+');
                const zeros = Buffer.alloc(size, 0);
                fs.writeSync(fd, zeros, 0, size);
                fs.closeSync(fd);
                fs.unlinkSync(curPath);
              } catch (e) {
                // Best effort - if we can't overwrite, at least delete
                try { fs.unlinkSync(curPath); } catch (e) {}
              }
            }
          });
          fs.rmdirSync(dir);
        }
      };
      
      rimrafSync(this.storagePath);
      
      // Zero out the encryption key in memory
      this.encryptionKey.fill(0);
      this.iv.fill(0);
      
      this.isDestroyed = true;
      return true;
    } catch (error) {
      console.error('Error in synchronous secure storage destruction:', error);
      return false;
    }
  }
  
  /**
   * List all data keys in the secure storage
   * 
   * @returns {Promise<string[]>} - List of data keys
   */
  async list() {
    if (this.isDestroyed) {
      throw new Error('Secure storage has been destroyed');
    }
    
    const files = await fs.promises.readdir(this.storagePath);
    return files.filter(file => !file.startsWith('.'));
  }
  
  /**
   * Encrypt data using the storage's encryption key
   * 
   * @param {Buffer} data - Data to encrypt
   * @returns {Buffer} - Encrypted data
   * @private
   */
  _encrypt(data) {
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, this.iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Store IV and auth tag with the encrypted data
    // Format: [16 bytes IV][16 bytes auth tag][encrypted data]
    return Buffer.concat([this.iv, authTag, encrypted]);
  }
  
  /**
   * Decrypt data using the storage's encryption key
   * 
   * @param {Buffer} encryptedData - Data to decrypt
   * @returns {Buffer} - Decrypted data
   * @private
   */
  _decrypt(encryptedData) {
    // Extract IV and auth tag from the encrypted data
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
  
  /**
   * Sanitize a key for use as a filename
   * 
   * @param {string} key - The key to sanitize
   * @returns {string} - Sanitized key
   * @private
   */
  _sanitizeKey(key) {
    // Remove path traversal and normalize
    let sanitized = key.replace(/[/\\?%*:|"<>]/g, '_');
    
    // Hash if the key is too long
    if (sanitized.length > 255) {
      sanitized = crypto
        .createHash('sha256')
        .update(key)
        .digest('hex');
    }
    
    return sanitized;
  }
}

module.exports = {
  SecureTemporaryStorage
};