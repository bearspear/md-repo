const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.json');
const DEFAULT_WATCH_PATH = path.join(__dirname, '../../');

// Default configuration
const defaultConfig = {
  watchDirectory: DEFAULT_WATCH_PATH,
  uploadDirectory: path.join(__dirname, '../uploads')
};

class Config {
  constructor() {
    this.config = this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading config:', error.message);
    }
    return { ...defaultConfig };
  }

  save() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      console.log('✓ Configuration saved');
      return true;
    } catch (error) {
      console.error('Error saving config:', error.message);
      return false;
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    return this.save();
  }

  getWatchDirectory() {
    return this.config.watchDirectory;
  }

  setWatchDirectory(dir) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Directory does not exist: ${dir}`);
    }
    this.config.watchDirectory = dir;
    return this.save();
  }

  getUploadDirectory() {
    const uploadDir = this.config.uploadDirectory;
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  getAll() {
    return { ...this.config };
  }
}

module.exports = new Config();
