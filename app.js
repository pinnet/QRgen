// QR Code Generator Application

// Configuration Constants
const CONFIG = {
  QR_SIZE: {
    MIN: 128,
    MAX: 512,
    DEFAULT: 256,
    STEP: 32
  },
  QR_LIMITS: {
    MAX_TEXT_LENGTH: 4296, // Maximum for High error correction
    MAX_URL_LENGTH: 2000   // Recommended URL length
  },
  COLORS: {
    DEFAULT_DARK: '#000000',
    DEFAULT_LIGHT: '#ffffff'
  },
  TIMING: {
    DEBOUNCE_MS: 500,
    LOADING_DELAY_MS: 300,
    CANVAS_READY_MS: 100,
    NOTIFICATION_DURATION_MS: 3000,
    NOTIFICATION_FADE_MS: 300
  },
  DOWNLOAD: {
    PNG_QUALITY: 1.0,
    FILENAME_PREFIX: 'qrcode'
  }
};

// Preset Templates
const PRESETS = {
  url: {
    text: 'https://github.com/pinnet/QRgen',
    description: 'Example URL'
  },
  wifi: {
    text: 'WIFI:T:WPA;S:MyNetworkName;P:MyPassword123;;',
    description: 'WiFi: Replace network name and password'
  },
  email: {
    text: 'mailto:hello@example.com?subject=Hello&body=Hi%20there',
    description: 'Email with subject and body'
  },
  vcard: {
    text: `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Company Name
TITLE:Developer
TEL:+1-234-567-8900
EMAIL:john@example.com
URL:https://example.com
END:VCARD`,
    description: 'vCard contact information'
  },
  sms: {
    text: 'smsto:+1234567890:Hello! Check out this QR code.',
    description: 'SMS with phone number and message'
  }
};

class QRCodeGenerator {
  constructor() {
    this.qrCodeInstance = null;
    this.currentCanvas = null;
    this.isLibraryLoaded = false;
    this.checkLibraryLoaded();
    this.initializeElements();
    this.attachEventListeners();
    this.syncColorInputs();
  }

  checkLibraryLoaded() {
    if (typeof QRCode === 'undefined') {
      console.error('QRCode.js library failed to load');
      this.isLibraryLoaded = false;
      // Show error after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.showLibraryError());
      } else {
        this.showLibraryError();
      }
    } else {
      this.isLibraryLoaded = true;
    }
  }

  showLibraryError() {
    const container = document.getElementById('qr-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state" style="color: #ef4444;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #ef4444;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p><strong>Library Loading Error</strong></p>
          <p style="font-size: 0.875rem;">Failed to load QRCode.js. Please check your internet connection and refresh the page.</p>
        </div>
      `;
    }
    this.showNotification('Failed to load QR code library. Please refresh the page.', 'error');
  }

  initializeElements() {
    // Form elements
    this.form = document.getElementById('qr-form');
    this.textInput = document.getElementById('qr-text');
    this.sizeSlider = document.getElementById('qr-size');
    this.sizeValue = document.getElementById('size-value');
    this.darkColorPicker = document.getElementById('qr-dark');
    this.darkColorText = document.getElementById('qr-dark-text');
    this.lightColorPicker = document.getElementById('qr-light');
    this.lightColorText = document.getElementById('qr-light-text');

    // Display elements
    this.qrContainer = document.getElementById('qr-container');
    this.downloadSection = document.getElementById('download-section');
    this.downloadPngBtn = document.getElementById('download-png');
    this.downloadSvgBtn = document.getElementById('download-svg');
    this.generateBtn = document.getElementById('generate-btn');
  }

  attachEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generateQRCode();
    });

    // Character counter
    this.textInput.addEventListener('input', () => {
      this.updateCharCounter();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.applyPreset(preset);
      });
    });

    // Size slider
    this.sizeSlider.addEventListener('input', (e) => {
      this.sizeValue.textContent = e.target.value;
    });

    // Color pickers - sync with text inputs
    this.darkColorPicker.addEventListener('input', (e) => {
      this.darkColorText.value = e.target.value;
    });

    this.darkColorText.addEventListener('input', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        this.darkColorPicker.value = color;
      }
    });

    this.lightColorPicker.addEventListener('input', (e) => {
      this.lightColorText.value = e.target.value;
    });

    this.lightColorText.addEventListener('input', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        this.lightColorPicker.value = color;
      }
    });

    // Download buttons
    this.downloadPngBtn.addEventListener('click', () => this.downloadQRCode('png'));
    this.downloadSvgBtn.addEventListener('click', () => this.downloadQRCode('svg'));

    // Copy button
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn && navigator.share) {
      shareBtn.style.display = 'inline-flex';
      shareBtn.addEventListener('click', () => this.shareQRCode());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter: Generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.generateQRCode();
      }
      // Ctrl+S: Download
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (this.currentCanvas) {
          this.downloadQRCode('png');
        }
      }
      // Ctrl+C: Copy (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement !== this.textInput) {
        if (this.currentCanvas) {
          e.preventDefault();
          this.copyToClipboard();
        }
      }
      // Escape: Clear
      if (e.key === 'Escape') {
        this.textInput.value = '';
        this.updateCharCounter();
        this.showEmptyState();
        this.textInput.focus();
      }
    });

    // Real-time generation (optional - can be enabled for live preview)
    this.textInput.addEventListener('input', () => this.debounce(() => {
      if (this.textInput.value.trim()) {
        this.generateQRCode();
      }
    }, CONFIG.TIMING.DEBOUNCE_MS));
  }

  syncColorInputs() {
    this.darkColorText.value = this.darkColorPicker.value;
    this.lightColorText.value = this.lightColorPicker.value;
  }

  updateCharCounter() {
    const counter = document.getElementById('char-counter');
    if (counter) {
      const length = this.textInput.value.length;
      const max = CONFIG.QR_LIMITS.MAX_TEXT_LENGTH;
      counter.textContent = `${length.toLocaleString()} / ${max.toLocaleString()}`;

      // Color code the counter
      if (length > max * 0.9) {
        counter.style.color = 'hsl(0, 72%, 51%)'; // Red
      } else if (length > max * 0.7) {
        counter.style.color = 'hsl(45, 100%, 51%)'; // Orange
      } else {
        counter.style.color = 'var(--text-tertiary)';
      }
    }
  }

  applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (preset) {
      this.textInput.value = preset.text;
      this.updateCharCounter();
      this.showNotification(`📋 ${preset.description} loaded`, 'info');
      this.textInput.focus();

      // Auto-generate after short delay
      setTimeout(() => {
        this.generateQRCode();
      }, 300);
    }
  }

  validateInput(text) {
    // Check if library is loaded
    if (!this.isLibraryLoaded) {
      return { valid: false, error: 'QR code library not loaded. Please refresh the page.' };
    }

    // Check if empty
    if (!text) {
      return { valid: false, error: 'Please enter some content to generate a QR code' };
    }

    // Check length limits
    if (text.length > CONFIG.QR_LIMITS.MAX_TEXT_LENGTH) {
      return {
        valid: false,
        error: `Content too long (${text.length} characters). Maximum is ${CONFIG.QR_LIMITS.MAX_TEXT_LENGTH} characters.`
      };
    }

    // Validate URLs if it looks like a URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        const url = new URL(text);
        if (text.length > CONFIG.QR_LIMITS.MAX_URL_LENGTH) {
          return {
            valid: false,
            error: `URL too long. Keep it under ${CONFIG.QR_LIMITS.MAX_URL_LENGTH} characters for best compatibility.`
          };
        }
      } catch (e) {
        return { valid: false, error: 'Invalid URL format. Please check your URL.' };
      }
    }

    // Validate WiFi format if it looks like WiFi config
    if (text.startsWith('WIFI:')) {
      // More flexible WiFi validation - just check for basic structure
      // Format: WIFI:T:type;S:ssid;P:password;H:hidden;;
      // Fields can be in any order, some are optional
      if (!text.endsWith(';;')) {
        return {
          valid: false,
          error: 'WiFi format must end with double semicolon (;;)'
        };
      }

      // Check for required SSID field
      if (!text.includes('S:')) {
        return {
          valid: false,
          error: 'WiFi format requires network name (S:NetworkName). Example: WIFI:T:WPA;S:MyNetwork;P:Password;;'
        };
      }

      // Warn if no password (open network)
      if (!text.includes('P:') && !text.includes('T:nopass')) {
        console.warn('WiFi QR code has no password - this will create an open network QR code');
      }
    }

    // Validate color contrast for scannability
    const darkColor = this.darkColorPicker.value;
    const lightColor = this.lightColorPicker.value;

    if (darkColor.toLowerCase() === lightColor.toLowerCase()) {
      return {
        valid: false,
        error: 'Dark and light colors must be different for QR code to be scannable.'
      };
    }

    // Check contrast ratio (simplified check)
    const contrastRatio = this.getContrastRatio(darkColor, lightColor);
    if (contrastRatio < 3) {
      return {
        valid: false,
        error: 'Colors have insufficient contrast. QR code may not scan properly. Try more contrasting colors.'
      };
    }

    return { valid: true };
  }

  getContrastRatio(color1, color2) {
    const getLuminance = (hex) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = ((rgb >> 16) & 0xff) / 255;
      const g = ((rgb >> 8) & 0xff) / 255;
      const b = (rgb & 0xff) / 255;

      const [rs, gs, bs] = [r, g, b].map(c =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      );

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  hexToRGB(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex to RGB
    const rgb = parseInt(hex, 16);
    return {
      r: (rgb >> 16) & 0xff,
      g: (rgb >> 8) & 0xff,
      b: rgb & 0xff
    };
  }

  generateQRCode() {
    const text = this.textInput.value.trim();

    // Validate input
    const validation = this.validateInput(text);
    if (!validation.valid) {
      this.showNotification(validation.error, 'error');
      return;
    }

    // Show loading state
    this.setButtonLoading(true);
    this.showLoading();

    // Small delay to show loading animation
    setTimeout(() => {
      try {
        // Clear previous QR code
        this.qrContainer.innerHTML = '';

        // Get current settings
        const size = parseInt(this.sizeSlider.value);
        const darkColor = this.darkColorPicker.value;
        const lightColor = this.lightColorPicker.value;

        // Generate QR code
        this.qrCodeInstance = new QRCode(this.qrContainer, {
          text: text,
          width: size,
          height: size,
          colorDark: darkColor,
          colorLight: lightColor,
          correctLevel: QRCode.CorrectLevel.H
        });

        // Store canvas reference
        setTimeout(() => {
          this.currentCanvas = this.qrContainer.querySelector('canvas');
          if (this.currentCanvas) {
            this.showDownloadButtons();
            this.showNotification('QR code generated successfully! ✨', 'success');
            this.setButtonLoading(false);
          }
        }, CONFIG.TIMING.CANVAS_READY_MS);

      } catch (error) {
        console.error('Error generating QR code:', error);
        this.showNotification('Error generating QR code. Please try again.', 'error');
        this.showEmptyState();
        this.setButtonLoading(false);
      }
    }, CONFIG.TIMING.LOADING_DELAY_MS);
  }

  downloadQRCode(format) {
    if (!this.currentCanvas) {
      this.showNotification('Please generate a QR code first', 'error');
      return;
    }

    try {
      if (format === 'png') {
        this.downloadAsPNG();
      } else if (format === 'svg') {
        this.downloadAsSVG();
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      this.showNotification('Error downloading QR code. Please try again.', 'error');
    }
  }

  downloadAsPNG() {
    try {
      const dataUrl = this.currentCanvas.toDataURL('image/png', CONFIG.DOWNLOAD.PNG_QUALITY);
      const filename = `${CONFIG.DOWNLOAD.FILENAME_PREFIX}-${Date.now()}.png`;

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.style.display = 'none';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      this.showNotification('QR code download started! Check your Downloads folder 📥', 'success');

    } catch (error) {
      console.error('PNG download error:', error);
      this.showNotification('Download failed. Try right-clicking the QR code to save.', 'error');
    }
  }

  downloadAsSVG() {
    try {
      // Convert canvas to SVG with improved vectorization
      const size = parseInt(this.sizeSlider.value);
      const darkColor = this.darkColorPicker.value;
      const lightColor = this.lightColorPicker.value;

      // Get image data from canvas
      const ctx = this.currentCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, size, size);

      // Build SVG with optimized paths
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size}" fill="${lightColor}"/>
  <g fill="${darkColor}">`;

      // Parse dark and light colors to determine threshold
      const darkRGB = this.hexToRGB(darkColor);
      const lightRGB = this.hexToRGB(lightColor);

      // Calculate midpoint for better color detection
      const thresholdR = (darkRGB.r + lightRGB.r) / 2;
      const thresholdG = (darkRGB.g + lightRGB.g) / 2;
      const thresholdB = (darkRGB.b + lightRGB.b) / 2;

      // Analyze pixels and create rectangles for dark areas
      const pixelSize = 1;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const index = (y * size + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];

          // Check if pixel is closer to dark color than light color
          const distToDark = Math.abs(r - darkRGB.r) + Math.abs(g - darkRGB.g) + Math.abs(b - darkRGB.b);
          const distToLight = Math.abs(r - lightRGB.r) + Math.abs(g - lightRGB.g) + Math.abs(b - lightRGB.b);
          const isDark = distToDark < distToLight;

          if (isDark) {
            svg += `    <rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}"/>
`;
          }
        }
      }

      svg += `  </g>
</svg>`;

      // Create blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const filename = `${CONFIG.DOWNLOAD.FILENAME_PREFIX}-${Date.now()}.svg`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      this.showNotification('QR code download started! Check your Downloads folder 📥', 'success');

    } catch (error) {
      console.error('SVG download error:', error);
      this.showNotification('Download failed. Please try again.', 'error');
    }
  }

  showLoading() {
    this.qrContainer.innerHTML = `
      <div class="empty-state">
        <div class="loading"></div>
        <p style="margin-top: 1rem;">Generating QR code...</p>
      </div>
    `;
    this.downloadSection.style.display = 'none';
  }

  showEmptyState() {
    this.qrContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        <p>Your QR code will appear here</p>
      </div>
    `;
    this.downloadSection.style.display = 'none';
  }

  showDownloadButtons() {
    this.downloadSection.style.display = 'flex';
  }

  setButtonLoading(isLoading) {
    const btn = this.generateBtn;
    const content = btn.querySelector('.btn-content');
    const loader = btn.querySelector('.btn-loader');

    if (isLoading) {
      content.style.display = 'none';
      loader.style.display = 'flex';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      content.style.display = 'flex';
      loader.style.display = 'none';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }

  detectModuleSize(imageData, size) {
    // Detect QR code module size by finding transitions in first row
    let transitions = [];
    let lastPixel = null;

    for (let x = 0; x < Math.min(size, 200); x++) {
      const index = x * 4;
      const pixel = imageData.data[index] < 128 ? 'dark' : 'light';

      if (lastPixel && pixel !== lastPixel) {
        transitions.push(x);
      }
      lastPixel = pixel;
    }

    // Calculate average module size
    if (transitions.length > 2) {
      const distances = [];
      for (let i = 1; i < Math.min(transitions.length, 10); i++) {
        distances.push(transitions[i] - transitions[i - 1]);
      }
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      return Math.max(1, Math.round(avgDistance));
    }

    // Fallback: assume standard QR code size
    return Math.max(1, Math.floor(size / 33)); // Most QR codes are ~21-33 modules
  }

  async copyToClipboard() {
    if (!this.currentCanvas) {
      this.showNotification('Please generate a QR code first', 'error');
      return;
    }

    try {
      // Convert canvas to blob
      const blob = await new Promise(resolve =>
        this.currentCanvas.toBlob(resolve, 'image/png')
      );

      // Copy to clipboard
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        this.showNotification('QR code copied to clipboard! 📋', 'success');
      } else {
        // Fallback: copy as data URL
        const dataUrl = this.currentCanvas.toDataURL('image/png');
        await navigator.clipboard.writeText(dataUrl);
        this.showNotification('QR code data copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Copy error:', error);
      this.showNotification('Failed to copy. Your browser may not support this feature.', 'error');
    }
  }

  async shareQRCode() {
    if (!this.currentCanvas) {
      this.showNotification('Please generate a QR code first', 'error');
      return;
    }

    try {
      const blob = await new Promise(resolve =>
        this.currentCanvas.toBlob(resolve, 'image/png')
      );

      const file = new File([blob], `${CONFIG.DOWNLOAD.FILENAME_PREFIX}-${Date.now()}.png`, {
        type: 'image/png'
      });

      if (navigator.share) {
        await navigator.share({
          title: 'QR Code',
          text: 'Check out this QR code!',
          files: [file]
        });
        this.showNotification('QR code shared! 📤', 'success');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        this.showNotification('Failed to share. Try copying instead.', 'error');
      }
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    // Style based on type
    const colors = {
      success: 'hsl(142, 76%, 36%)',
      error: 'hsl(0, 72%, 51%)',
      info: 'hsl(217, 91%, 60%)'
    };

    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
      font-weight: 500;
      max-width: 400px;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), CONFIG.TIMING.NOTIFICATION_FADE_MS);
    }, CONFIG.TIMING.NOTIFICATION_DURATION_MS);
  }

  // Debounce utility for real-time generation
  debounce(func, wait) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, wait);
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new QRCodeGenerator();

  // Add some example presets
  window.qrPresets = {
    setURL: () => {
      document.getElementById('qr-text').value = 'https://example.com';
      app.generateQRCode();
    },
    setWiFi: () => {
      document.getElementById('qr-text').value = 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;';
      app.generateQRCode();
    },
    setEmail: () => {
      document.getElementById('qr-text').value = 'mailto:hello@example.com';
      app.generateQRCode();
    }
  };

  // Initialize character counter
  app.updateCharCounter();

  console.log('%c✨ QR Gen Ready!', 'color: #8845ff; font-size: 20px; font-weight: bold;');
  console.log('Keyboard shortcuts: Ctrl+Enter (Generate), Ctrl+S (Download), Ctrl+C (Copy), Esc (Clear)');
  console.log('Or use the preset buttons to try different formats!');
});
