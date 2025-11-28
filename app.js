// QR Code Generator Application
class QRCodeGenerator {
  constructor() {
    this.qrCodeInstance = null;
    this.currentCanvas = null;
    this.initializeElements();
    this.attachEventListeners();
    this.syncColorInputs();
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

    // Real-time generation (optional - can be enabled for live preview)
    this.textInput.addEventListener('input', () => this.debounce(() => {
      if (this.textInput.value.trim()) {
        this.generateQRCode();
      }
    }, 500));
  }

  syncColorInputs() {
    this.darkColorText.value = this.darkColorPicker.value;
    this.lightColorText.value = this.lightColorPicker.value;
  }

  generateQRCode() {
    const text = this.textInput.value.trim();

    if (!text) {
      this.showNotification('Please enter some content to generate a QR code', 'error');
      return;
    }

    // Show loading state
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
          }
        }, 100);

      } catch (error) {
        console.error('Error generating QR code:', error);
        this.showNotification('Error generating QR code. Please try again.', 'error');
        this.showEmptyState();
      }
    }, 300);
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
      const dataUrl = this.currentCanvas.toDataURL('image/png');
      const filename = `qrcode-${Date.now()}.png`;

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
      // Convert canvas to SVG
      const size = parseInt(this.sizeSlider.value);
      const darkColor = this.darkColorPicker.value;
      const lightColor = this.lightColorPicker.value;

      // Get image data from canvas
      const ctx = this.currentCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, size, size);

      // Build SVG
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${lightColor}"/>
  <g fill="${darkColor}">`;

      // Analyze pixels and create rectangles for dark areas
      const pixelSize = 1;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const index = (y * size + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];

          // Check if pixel is dark (close to dark color)
          const isDark = r < 128 && g < 128 && b < 128;

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
      const filename = `qrcode-${Date.now()}.svg`;

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

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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

  console.log('%c✨ QR Gen Ready!', 'color: #8845ff; font-size: 20px; font-weight: bold;');
  console.log('Try these presets: qrPresets.setURL(), qrPresets.setWiFi(), qrPresets.setEmail()');
});
