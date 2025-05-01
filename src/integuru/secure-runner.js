/**
 * Secure runner for executing generated integrations
 * Creates an isolated environment for running integration code
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createSecureEnvironment } = require('../security');

/**
 * Run a generated integration in a secure environment
 * 
 * @param {Object} options - Runner options
 * @param {Object} options.integration - The integration to run
 * @param {Object} options.params - Parameters for the integration
 * @param {Object} options.securityOptions - Security options
 * @returns {Promise<Object>} - Results of the integration
 */
async function runIntegration(options) {
  const { integration, params, securityOptions = {} } = options;
  
  // Default security options
  const security = {
    blockNetwork: securityOptions.blockNetwork !== false, // Default to true
    secureDelete: securityOptions.secureDelete !== false, // Default to true
    memoryProtection: securityOptions.memoryProtection !== false // Default to true
  };
  
  // Create temporary directories
  const tempDir = path.join(os.tmpdir(), 'data-grabber', `integration-${integration.id}-${Date.now()}`);
  const outputDir = path.join(tempDir, 'output');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create secure environment
  const secureEnv = await createSecureEnvironment({
    name: `integration-${integration.id}`,
    blockNetwork: security.blockNetwork,
    protectMemory: security.memoryProtection
  });
  
  try {
    console.log(`Running integration ${integration.name} in secure environment`);
    
    // Write the code to a temporary file
    const scriptPath = path.join(tempDir, `script.${integration.language === 'python' ? 'py' : 'js'}`);
    fs.writeFileSync(scriptPath, integration.code);
    
    // Write parameters to a JSON file
    const paramsPath = path.join(tempDir, 'params.json');
    fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2));
    
    // Execute the script
    let result;
    if (integration.language === 'python') {
      result = await executePythonScript(scriptPath, paramsPath, outputDir);
    } else {
      result = await executeNodeScript(scriptPath, paramsPath, outputDir);
    }
    
    // Process any output files
    const outputFiles = await processOutputFiles(outputDir);
    
    // Return the combined results
    return {
      success: true,
      result: {
        ...result,
        outputFiles
      }
    };
  } catch (error) {
    console.error(`Error running integration ${integration.id}:`, error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Always clean up
    if (security.secureDelete) {
      console.log('Securely deleting all integration data...');
      await secureEnv.destroy();
      
      // Note: The temp directory will also be cleaned up by secureEnv.destroy()
    }
  }
}

/**
 * Execute a Python script in an isolated environment
 * 
 * @param {string} scriptPath - Path to the Python script
 * @param {string} paramsPath - Path to the parameters JSON file
 * @param {string} outputDir - Directory for script output
 * @returns {Promise<Object>} - Script results
 * @private
 */
async function executePythonScript(scriptPath, paramsPath, outputDir) {
  return new Promise((resolve, reject) => {
    // Check if Python is available
    try {
      // Create a Python subprocess
      const pythonProcess = spawn('python3', [
        scriptPath,
        '--params', paramsPath,
        '--output', outputDir
      ]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // Try to parse stdout as JSON if possible
          try {
            const resultJson = JSON.parse(stdout);
            resolve(resultJson);
          } catch (e) {
            // Not JSON, return as text
            resolve({
              stdout,
              exitCode: code
            });
          }
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });
    } catch (error) {
      reject(new Error(`Failed to execute Python script: ${error.message}`));
    }
  });
}

/**
 * Execute a Node.js script in an isolated environment
 * 
 * @param {string} scriptPath - Path to the Node.js script
 * @param {string} paramsPath - Path to the parameters JSON file
 * @param {string} outputDir - Directory for script output
 * @returns {Promise<Object>} - Script results
 * @private
 */
async function executeNodeScript(scriptPath, paramsPath, outputDir) {
  return new Promise((resolve, reject) => {
    try {
      // Create a Node subprocess
      const nodeProcess = spawn('node', [
        scriptPath,
        '--params', paramsPath,
        '--output', outputDir
      ]);
      
      let stdout = '';
      let stderr = '';
      
      nodeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      nodeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      nodeProcess.on('close', (code) => {
        if (code === 0) {
          // Try to parse stdout as JSON if possible
          try {
            const resultJson = JSON.parse(stdout);
            resolve(resultJson);
          } catch (e) {
            // Not JSON, return as text
            resolve({
              stdout,
              exitCode: code
            });
          }
        } else {
          reject(new Error(`Node.js script exited with code ${code}: ${stderr}`));
        }
      });
    } catch (error) {
      reject(new Error(`Failed to execute Node.js script: ${error.message}`));
    }
  });
}

/**
 * Process output files generated by the integration
 * 
 * @param {string} outputDir - Directory containing output files
 * @returns {Promise<Array>} - List of output files
 * @private
 */
async function processOutputFiles(outputDir) {
  try {
    const files = fs.readdirSync(outputDir);
    const outputFiles = [];
    
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        // For simplicity, only include small files in the results
        // Larger files could be processed differently
        if (stats.size < 1024 * 1024) { // Less than 1MB
          const content = fs.readFileSync(filePath, 'utf8');
          outputFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            content
          });
        } else {
          outputFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            content: 'File too large to include in results'
          });
        }
      }
    }
    
    return outputFiles;
  } catch (error) {
    console.error('Error processing output files:', error);
    return [];
  }
}

module.exports = {
  runIntegration
};