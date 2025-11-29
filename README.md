# 📱 QR Gen - Beautiful QR Code Generator

A stunning, modern QR code generator with premium design aesthetics. Create customizable QR codes instantly with downloadable PNG and SVG formats.

![QR Gen Banner](https://img.shields.io/badge/QR-Generator-8845ff?style=for-the-badge)

## ✨ Features

- **🎨 Premium Design**: Modern dark theme with glassmorphism and smooth animations
- **🔧 Full Customization**: Adjust size, colors, and more
- **📥 Multiple Export Formats**: Download as PNG or SVG with optimized vectorization
- **⚡ Real-time Generation**: Instant QR code creation with loading indicators
- **📱 Progressive Web App (PWA)**: Install on any device, works offline
- **📋 Copy to Clipboard**: One-click copy for easy sharing
- **🔗 Share API**: Native sharing on mobile devices
- **⌨️ Keyboard Shortcuts**: Power user features (Ctrl+Enter, Ctrl+S, etc.)
- **🎯 Quick Presets**: Built-in templates for URL, WiFi, Email, vCard, SMS
- **✅ Input Validation**: Smart validation for URLs, WiFi configs, and more
- **🔒 Security**: SRI hashes, CSP headers, offline-first architecture
- **♿ Accessible**: ARIA labels, keyboard navigation, screen reader support
- **📊 Character Counter**: Real-time feedback on input length
- **🚀 No Dependencies**: Pure JavaScript (except QRCode.js library)

## 🚀 Quick Start

### Option 1: Using Node.js (Recommended)

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:8080 in your browser
```

**Development mode with auto-reload:**
```bash
npm run dev
```

### Option 2: Using Docker (Recommended for Production)

```bash
# Build the Docker image
docker build -t qr-code-generator .

# Run the container
docker run -d -p 8080:8080 --name qrgen qr-code-generator

# Open http://localhost:8080 in your browser
```

**Or use Docker Compose:**

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f
```

### Option 3: Using Python

```bash
# Navigate to the project directory
cd QRgen

# Start a local HTTP server
python -m http.server 8080

# Open http://localhost:8080 in your browser
```

### Option 4: Using PHP

```bash
# Navigate to the project directory
cd QRgen

# Start PHP built-in server
php -S localhost:8080

# Open http://localhost:8080 in your browser
```

## ⚠️ Important: Why You Need a Local Server

**The download functionality requires serving the files through HTTP, not directly opening the HTML file.**

❌ **DON'T**: Open `index.html` directly in your browser (file:// protocol)
✅ **DO**: Serve the files through a local web server (http:// protocol)

### Why?

Modern browsers implement security restrictions on `file://` URLs that prevent programmatic downloads. Running through a local HTTP server bypasses these restrictions and enables all features.

## 🎯 How to Use

1. **Quick Start with Presets**: Click any preset button (URL, WiFi, Email, vCard, SMS) to load a template
2. **Enter Content**: Type or paste any text, URL, WiFi credentials, email, or other data
3. **Customize**: 
   - Adjust the QR code size using the slider (128px - 512px)
   - Choose custom colors for dark and light areas
   - Watch the character counter to stay within limits
4. **Generate**: Click "Generate QR Code" or press **Ctrl+Enter**
5. **Export**: 
   - **Download PNG**: Press **Ctrl+S** or click the button
   - **Download SVG**: Click for scalable vector format
   - **Copy**: Press **Ctrl+C** or click to copy to clipboard
   - **Share**: Use native share on mobile devices

### ⌨️ Keyboard Shortcuts

- **Ctrl+Enter**: Generate QR code
- **Ctrl+S**: Download as PNG
- **Ctrl+C**: Copy to clipboard (when QR code is visible)
- **Esc**: Clear input and reset

## 🎨 Customization Examples

Use the preset buttons for instant templates, or create your own:

### URL QR Code
```
https://github.com/pinnet/QRgen
```

### WiFi QR Code
```
WIFI:T:WPA;S:MyNetworkName;P:MyPassword123;;
```
*Format*: `WIFI:T:[WPA/WEP];S:[SSID];P:[Password];;`

### Email QR Code
```
mailto:hello@example.com?subject=Hello&body=Hi%20there
```

### SMS QR Code
```
smsto:+1234567890:Hello! Check out this QR code.
```

### vCard (Contact) QR Code
```
BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Company Name
TITLE:Developer
TEL:+1-234-567-8900
EMAIL:john@example.com
URL:https://example.com
END:VCARD
```

### Phone Number
```
tel:+1234567890
```

### Geographic Location
```
geo:37.7749,-122.4194
```

## 🐳 Docker Deployment

### Building the Image

```bash
# Build the Docker image
docker build -t qr-code-generator .

# Check the image
docker images | grep qr-code-generator
```

### Running the Container

```bash
# Run in detached mode
docker run -d -p 8080:80 --name qrgen qr-code-generator

# Run with custom port (e.g., 3000)
docker run -d -p 3000:80 --name qrgen qr-code-generator

# Run with auto-restart
docker run -d -p 8080:80 --restart unless-stopped --name qrgen qr-code-generator
```

### Managing the Container

```bash
# View running containers
docker ps

# View logs
docker logs qrgen

# Follow logs in real-time
docker logs -f qrgen

# Stop the container
docker stop qrgen

# Start the container
docker start qrgen

# Remove the container
docker rm qrgen

# Remove the image
docker rmi qr-code-generator
```

### Using Docker Compose

```bash
# Start in detached mode
docker-compose up -d

# Start and view logs
docker-compose up

# Stop and remove containers
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f qrgen
```

### Deployment to Cloud

**Deploy to any cloud platform that supports Docker:**

- **AWS ECS/Fargate**: Use the Dockerfile
- **Google Cloud Run**: `gcloud run deploy`
- **Azure Container Instances**: `az container create`
- **DigitalOcean App Platform**: Connect your repo
- **Heroku**: Use `heroku.yml` or Container Registry

## 📁 Project Structure

```
QRgen/
├── server.js          # Node.js Express server
├── package.json       # Node.js dependencies and scripts
├── index.html         # Main HTML structure with PWA support
├── index.css          # Styles and design system
├── app.js            # QR code generation logic with validation
├── qrcode.min.js     # QRCode.js library (local copy)
├── manifest.json     # PWA manifest for installation
├── service-worker.js # Service worker for offline capability
├── Dockerfile        # Docker container configuration (Node.js)
├── docker-compose.yml # Docker Compose orchestration
├── .dockerignore     # Docker build exclusions
├── deploy.ps1        # PowerShell deployment script
├── DOCKER_GUIDE.md   # Docker deployment guide
└── README.md         # This file
```

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic structure with accessibility features and PWA support
- **CSS3**: Modern design with custom properties, glassmorphism, and animations
- **JavaScript (ES6+)**: Class-based architecture with async/await, validation, and error handling
- **QRCode.js**: Local library with CDN fallback and SRI hash for security
- **Service Workers**: Offline-first PWA with caching strategy
- **Web APIs**: Clipboard API, Share API, Canvas API for modern features

### Backend
- **Node.js**: Lightweight Express server for production deployment
- **Express**: Fast, minimalist web framework
- **Helmet**: Security headers and CSP configuration
- **Compression**: Gzip compression for optimized delivery
- **Docker**: Multi-stage builds for minimal container size

## 🎨 Design Features

- **Glassmorphism**: Modern frosted glass effect on cards
- **Gradient Accents**: Beautiful purple-to-cyan color scheme
- **Smooth Animations**: Micro-interactions and transitions
- **Dark Theme**: Easy on the eyes, modern aesthetic
- **Responsive Grid**: Adapts to any screen size
- **Floating Particles**: Subtle decorative animations

## 📱 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Opera 76+

## 🔒 Security & Privacy

- **100% Client-Side**: All QR code generation happens in your browser
- **No Data Collection**: We don't collect, store, or transmit your data
- **No Analytics**: No tracking or cookies
- **Offline Capable**: Full PWA support - works without internet after installation
- **SRI Integrity**: Subresource Integrity hashes protect against CDN tampering
- **Security Headers**: X-Frame-Options, CSP, and other protective headers
- **Input Validation**: Comprehensive validation prevents injection attacks
- **Local Library**: Primary use of local files reduces external dependencies

## 🐛 Troubleshooting

### Downloads Not Working?
Make sure you're running the app through a local HTTP server, not opening the HTML file directly.

### QR Code Not Generating?
1. Ensure you've entered some content (use presets to test)
2. Check the character counter - stay under 4,296 characters
3. Check the browser console (F12) for errors
4. Verify colors have sufficient contrast
5. Try refreshing the page

### Copy to Clipboard Not Working?
- Requires HTTPS or localhost
- Check browser permissions for clipboard access
- Fallback: Right-click the QR code to save manually

### Colors Not Updating?
The color pickers sync with text inputs. You can use either:
- The color picker tool
- Or type hex codes directly (e.g., `#FF5733`)

### PWA Installation Issues?
- Requires HTTPS (or localhost for testing)
- Check manifest.json is accessible
- Look for install prompt in browser address bar
- Try Chrome's "Install app" option in menu

### Keyboard Shortcuts Not Working?
- Ensure you're not in an input field (except Ctrl+Enter)
- Some shortcuts may conflict with browser/OS shortcuts
- Try clicking outside input fields first

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Support

If you found this project helpful, please give it a ⭐!

---

**Built with ❤️ using modern web technologies**
