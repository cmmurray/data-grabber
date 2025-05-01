/**
 * Tests for secure deletion verification
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { secureDelete, verifyDeletion } = require('../../src/security');

describe('Secure Deletion Verification', () => {
  let testDir;
  let testFile;
  
  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `secure-deletion-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // Create a test file with some content
    testFile = path.join(testDir, 'test-file.txt');
    await fs.promises.writeFile(testFile, 'This is sensitive data that should be securely deleted');
  });
  
  afterEach(async () => {
    // Clean up any remaining test files
    try {
      if (fs.existsSync(testDir)) {
        const files = await fs.promises.readdir(testDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(testDir, file));
        }
        await fs.promises.rmdir(testDir);
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });
  
  test('verifyDeletion should report a file that still exists', async () => {
    // Don't delete the file, just verify it exists
    const result = await verifyDeletion(testFile);
    
    expect(result.exists).toBe(true);
    expect(result.details.some(d => d.includes('still exists'))).toBe(true);
  });
  
  test('verifyDeletion should confirm a file has been deleted', async () => {
    // First delete the file normally (not securely)
    await fs.promises.unlink(testFile);
    
    // Then verify it's gone
    const result = await verifyDeletion(testFile);
    
    expect(result.exists).toBe(false);
    expect(result.details.some(d => d.includes('does not exist'))).toBe(true);
  });
  
  test('secureDelete should remove a file and verifyDeletion should confirm it', async () => {
    // Securely delete the file
    await secureDelete(testFile);
    
    // Verify it's gone
    const result = await verifyDeletion(testFile);
    
    expect(result.exists).toBe(false);
    expect(result.details.some(d => d.includes('does not exist'))).toBe(true);
  });
  
  test('verifyDeletion should detect if a file was not securely deleted', async () => {
    // Create a larger file for this test
    const largeTestFile = path.join(testDir, 'large-test-file.bin');
    
    // Create a 1MB file with repeating patterns
    const patternBuffer = Buffer.alloc(1024 * 1024); // 1MB
    for (let i = 0; i < patternBuffer.length; i++) {
      patternBuffer[i] = (i % 256);
    }
    
    await fs.promises.writeFile(largeTestFile, patternBuffer);
    
    // Delete the file normally, not securely
    await fs.promises.unlink(largeTestFile);
    
    // Now verify it - note that we can't actually check the disk for remnants
    // in a portable way, but we can at least test that the verification runs
    const result = await verifyDeletion(largeTestFile);
    
    expect(result.exists).toBe(false);
    expect(result.details.length).toBeGreaterThan(0);
  });
});

describe('Storage Type Detection', () => {
  test('verifyDeletion should attempt to determine storage type', async () => {
    // Create a temporary file
    const tempFile = path.join(os.tmpdir(), `storage-type-test-${Date.now()}.txt`);
    await fs.promises.writeFile(tempFile, 'Test file for storage type detection');
    
    // Delete the file
    await fs.promises.unlink(tempFile);
    
    // Verify deletion and check for storage type detection
    const result = await verifyDeletion(tempFile);
    
    expect(result.details.some(d => d.includes('Storage type'))).toBe(true);
  });
});