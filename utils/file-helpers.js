/**
 * Helper functions for file operations
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

/**
 * Ensures that a directory exists, creating it if necessary
 * 
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Calculates the SHA-256 hash of a file
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hex string of the file hash
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Safely writes data to a file, ensuring directories exist
 * 
 * @param {string} filePath - Path to write the file
 * @param {string|Buffer} data - Data to write
 * @param {Object} options - File writing options
 * @returns {Promise<void>}
 */
async function safeWriteFile(filePath, data, options = {}) {
  const dirPath = path.dirname(filePath);
  await ensureDirectoryExists(dirPath);
  return fs.promises.writeFile(filePath, data, options);
}

/**
 * Moves a file from source to destination
 * 
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @returns {Promise<void>}
 */
async function moveFile(source, destination) {
  const dirPath = path.dirname(destination);
  await ensureDirectoryExists(dirPath);
  return fs.promises.rename(source, destination);
}

module.exports = {
  ensureDirectoryExists,
  calculateFileHash,
  safeWriteFile,
  moveFile
};