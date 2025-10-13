// FTP client utility for loading images and JSON data from FTP server
// Note: This is a simplified implementation. In a real application, you'd want to use
// a proper FTP library or implement this on the backend for security reasons.

export class FTPClient {
  constructor(config) {
    this.host = config.host;
    this.username = config.username;
    this.password = config.password;
    this.port = config.port || 21;
    this.connected = false;
  }

  async connect() {
    try {
      // In a real implementation, this would establish an FTP connection
      // For now, we'll simulate the connection
      console.log(`Connecting to FTP server: ${this.host}:${this.port}`);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.connected = true;
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      this.connected = false;
      return { success: false, message: error.message };
    }
  }

  async listFiles(directory = '/') {
    if (!this.connected) {
      throw new Error('Not connected to FTP server');
    }

    // Simulate file listing
    // In a real implementation, this would use FTP commands like LIST
    return [
      { name: 'image1.jpg', type: 'file', size: 1024000 },
      { name: 'image1.json', type: 'file', size: 2048 },
      { name: 'image2.jpg', type: 'file', size: 1200000 },
      { name: 'image2.json', type: 'file', size: 1856 },
      { name: 'subfolder', type: 'directory', size: 0 },
    ];
  }

  async downloadFile(remotePath) {
    if (!this.connected) {
      throw new Error('Not connected to FTP server');
    }

    // In a real implementation, this would download the file from FTP
    // For now, we'll simulate the download
    console.log(`Downloading file: ${remotePath}`);
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a mock file object
    return {
      name: remotePath.split('/').pop(),
      content: null, // In real implementation, this would be the file content
      type: remotePath.endsWith('.json') ? 'application/json' : 'image/jpeg'
    };
  }

  async disconnect() {
    this.connected = false;
    console.log('Disconnected from FTP server');
  }
}

// Helper function to match image files with their corresponding JSON files
export function matchImageWithAnnotations(imageFiles, jsonFiles) {
  const matches = [];
  
  imageFiles.forEach(imageFile => {
    const baseName = imageFile.name.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    const matchingJson = jsonFiles.find(jsonFile => 
      jsonFile.name.replace('.json', '') === baseName
    );
    
    if (matchingJson) {
      matches.push({
        image: imageFile,
        annotations: matchingJson
      });
    }
  });
  
  return matches;
}
