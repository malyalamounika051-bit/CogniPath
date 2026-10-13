import fs from 'fs';

export async function parseUploadedDocument(filePath, originalname) {
  try {
    const ext = originalname.toLowerCase().split('.').pop();
    
    // For txt and markdown files
    if (['txt', 'md', 'json', 'csv'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.trim().slice(0, 15000); // Safe bound 15k characters
    }

    // For other text-based documents or simple reading
    const buffer = fs.readFileSync(filePath);
    // Convert printable text
    const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    return text.slice(0, 15000);
  } catch (err) {
    throw new Error(`Failed to read document: ${err.message}`);
  } finally {
    // Safely remove temp file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (_) {}
  }
}
