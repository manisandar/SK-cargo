import assert from 'node:assert';
import {
  PHOTO_COMPRESSION_CONFIG,
  THUMBNAIL_CONFIG,
  isWebPEncodingSupported,
  isHeicFile,
} from '../imageCompression';

console.log('🧪 Starting Image Compression Module Tests...');

// Test 1: Configuration Constants
console.log('Test 1: Configuration Constants Validation...');
assert.strictEqual(PHOTO_COMPRESSION_CONFIG.maxWidthOrHeight, 1280);
assert.strictEqual(PHOTO_COMPRESSION_CONFIG.maxSizeMB, 0.3);
assert.strictEqual(PHOTO_COMPRESSION_CONFIG.preserveExif, false);
assert.strictEqual(PHOTO_COMPRESSION_CONFIG.preferredMimeType, 'image/webp');
assert.strictEqual(PHOTO_COMPRESSION_CONFIG.fallbackMimeType, 'image/jpeg');

assert.strictEqual(THUMBNAIL_CONFIG.maxWidthOrHeight, 200);
assert.strictEqual(THUMBNAIL_CONFIG.maxSizeMB, 0.03);
assert.strictEqual(THUMBNAIL_CONFIG.preserveExif, false);
console.log('✅ Test 1 Passed: Compression & Thumbnail configs verified.');

// Test 2: Safe Environment Execution
console.log('Test 2: Safe runtime checks...');
assert.strictEqual(typeof isWebPEncodingSupported(), 'boolean');
console.log(`✅ Test 2 Passed: isWebPEncodingSupported returned boolean (${isWebPEncodingSupported()}).`);

// Test 3: HEIC / HEIF format detection
console.log('Test 3: HEIC / HEIF format detection...');
const heicFileByName = new File(['dummy'], 'photo_sample.HEIC', { type: '' });
const heifFileByName = new File(['dummy'], 'IMG_1234.heif', { type: '' });
const heicFileByType = new File(['dummy'], 'photo.bin', { type: 'image/heic' });
const standardJpgFile = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
const standardPngFile = new File(['dummy'], 'photo.png', { type: 'image/png' });

assert.strictEqual(isHeicFile(heicFileByName), true);
assert.strictEqual(isHeicFile(heifFileByName), true);
assert.strictEqual(isHeicFile(heicFileByType), true);
assert.strictEqual(isHeicFile(standardJpgFile), false);
assert.strictEqual(isHeicFile(standardPngFile), false);
console.log('✅ Test 3 Passed: HEIC/HEIF identification verified.');

console.log('🎉 ALL IMAGE COMPRESSION TESTS PASSED!');

