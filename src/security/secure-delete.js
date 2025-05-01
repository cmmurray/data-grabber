/**
 * Secure deletion utilities for different operating systems and storage types
 * Implements multiple methods to ensure complete data destruction
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const os = require('os');

// Determine the platform
const platform = os.platform();

/**
 * Securely delete a file using platform-specific methods
 * 
 * @param {string} filePath - Path to the file to securely delete
 * @param {Object} options - Options for secure deletion
 * @param {number} options.passes - Number of overwrite passes (default: 3)
 * @param {boolean} options.verify - Whether to verify deletion (default: true)
 * @returns {Promise<boolean>} - Success status
 */
async function secureDelete(filePath, options = {}) {
  const { passes = 3, verify = true } = options;

  try {
    // Check if file exists
    const fileStats = await fs.promises.stat(filePath);
    
    if (!fileStats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    
    // Handle different storage types and platforms differently
    if (platform === 'darwin') {
      await secureDeleteMac(filePath, passes);
    } else if (platform === 'win32') {
      await secureDeleteWindows(filePath, passes);
    } else {
      // Linux or other Unix-like systems
      await secureDeleteUnix(filePath, passes);
    }
    
    // Final verification
    if (verify) {
      const stillExists = await fileExists(filePath);
      if (stillExists) {
        throw new Error(`File still exists after secure deletion: ${filePath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error during secure deletion of ${filePath}:`, error);
    throw error;
  }
}

/**
 * Securely delete a file on macOS
 * 
 * @param {string} filePath - Path to the file
 * @param {number} passes - Number of overwrite passes
 * @returns {Promise<void>}
 */
async function secureDeleteMac(filePath, passes) {
  try {
    // macOS has 'rm -P' for secure deletion, but it's deprecated
    // For best effectiveness, we'll implement our own secure deletion
    await overwriteFile(filePath, passes);
    await fs.promises.unlink(filePath);
  } catch (error) {
    throw new Error(`Mac secure deletion error: ${error.message}`);
  }
}

/**
 * Securely delete a file on Windows
 * 
 * @param {string} filePath - Path to the file
 * @param {number} passes - Number of overwrite passes
 * @returns {Promise<void>}
 */
async function secureDeleteWindows(filePath, passes) {
  try {
    // Windows doesn't have built-in secure delete
    // We'll use overwrite + PowerShell techniques
    await overwriteFile(filePath, passes);
    
    // Use PowerShell to properly delete the file
    // This helps bypass the Windows file system cache
    const powershellCmd = `
      $path = "${filePath.replace(/\\/g, '\\\\')}";
      [System.IO.File]::Delete($path);
      if (Test-Path $path) { throw "File still exists after deletion" }
    `;
    
    await exec(`powershell -Command "${powershellCmd}"`);
  } catch (error) {
    throw new Error(`Windows secure deletion error: ${error.message}`);
  }
}

/**
 * Securely delete a file on Unix-like systems
 * 
 * @param {string} filePath - Path to the file
 * @param {number} passes - Number of overwrite passes
 * @returns {Promise<void>}
 */
async function secureDeleteUnix(filePath, passes) {
  try {
    // First check if shred is available
    try {
      await exec('which shred');
      // If we get here, shred is available
      await exec(`shred -vzn ${passes} "${filePath}"`);
      return;
    } catch {
      // shred not available, fall back to manual overwrite
      await overwriteFile(filePath, passes);
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    throw new Error(`Unix secure deletion error: ${error.message}`);
  }
}

/**
 * Overwrite a file with random data multiple times
 * 
 * @param {string} filePath - Path to the file
 * @param {number} passes - Number of overwrite passes
 * @returns {Promise<void>}
 */
async function overwriteFile(filePath, passes) {
  // Get the file size
  const fileStats = await fs.promises.stat(filePath);
  const fileSize = fileStats.size;
  
  // Open the file for writing
  const fileHandle = await fs.promises.open(filePath, 'r+');
  
  try {
    // Perform multiple passes of overwriting
    for (let i = 0; i < passes; i++) {
      // Different patterns for different passes
      let pattern;
      if (i === 0) {
        pattern = Buffer.alloc(fileSize, 0xFF); // All 1's
      } else if (i === passes - 1) {
        pattern = Buffer.alloc(fileSize, 0x00); // All 0's
      } else {
        // Random data for middle passes
        pattern = crypto.randomBytes(fileSize);
      }
      
      // Write the pattern
      await fileHandle.write(pattern, 0, fileSize, 0);
      await fileHandle.sync(); // Force data to disk
    }
  } finally {
    // Close the file handle
    await fileHandle.close();
  }
}

/**
 * Check if a file exists
 * 
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - Whether the file exists
 */
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Securely delete a directory and all its contents
 * 
 * @param {string} dirPath - Path to the directory
 * @param {Object} options - Options for secure deletion
 * @returns {Promise<boolean>} - Success status
 */
async function secureDeleteDirectory(dirPath, options = {}) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    // Process all files and subdirectories
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await secureDeleteDirectory(fullPath, options);
      } else {
        await secureDelete(fullPath, options);
      }
    }
    
    // Remove the empty directory
    await fs.promises.rmdir(dirPath);
    return true;
  } catch (error) {
    console.error(`Error during secure directory deletion: ${error.message}`);
    throw error;
  }
}

/**
 * Check if the current system is using an SSD
 * This is a best-effort detection and may not be accurate in all cases
 * 
 * @param {string} mountPath - Path to check (e.g., '/')
 * @returns {Promise<boolean>} - Whether the path is likely on an SSD
 */
async function isPathOnSSD(mountPath) {
  try {
    if (platform === 'darwin') {
      // macOS detection
      const { stdout } = await exec('diskutil info $(df ' + mountPath + ' | tail -1 | cut -d" " -f1) | grep "Solid State"');
      return stdout.includes('Yes');
    } else if (platform === 'linux') {
      // Linux detection - check for rotational flag
      const { stdout } = await exec(`lsblk -d -o name,rota | grep $(df ${mountPath} --output=source | tail -1 | xargs basename)`);
      return stdout.includes(' 0');
    } else if (platform === 'win32') {
      // Windows detection - PowerShell required
      const drive = path.parse(mountPath).root.charAt(0);
      const { stdout } = await exec(`powershell -Command "Get-PhysicalDisk | Where PhysicalLocation -match '${drive}:' | Select MediaType"`);
      return stdout.includes('SSD');
    }
  } catch (error) {
    console.warn(`Could not detect storage type: ${error.message}`);
  }
  
  // Default to false if detection failed
  return false;
}

module.exports = {
  secureDelete,
  secureDeleteDirectory,
  isPathOnSSD
};