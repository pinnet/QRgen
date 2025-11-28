# 📱 QR Gen - Beautiful QR Code Generator

A stunning, modern QR code generator with premium design aesthetics. Create customizable QR codes instantly with downloadable PNG and SVG formats.

![QR Gen Banner](https://img.shields.io/badge/QR-Generator-8845ff?style=for-the-badge)

## ✨ Features

- **🎨 Premium Design**: Modern dark theme with glassmorphism and smooth animations
- **🔧 Full Customization**: Adjust size, colors, and more
- **📥 Multiple Export Formats**: Download as PNG or SVG
- **⚡ Real-time Generation**: Instant QR code creation
- **📱 Responsive**: Works on all devices
- **🚀 No Dependencies**: Pure JavaScript (except QRCode.js library)

## 🚀 Quick Start

### Option 1: Using Docker (Recommended for Production)

```bash
# Build the Docker image
docker build -t qr-code-generator .

# Run the container
docker run -d -p 8080:80 --name qrgen qr-code-generator

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

### Option 2: Using Python

```bash
# Navigate to the project directory
cd QRgen

# Start a local HTTP server
python -m http.server 8080

# Open http://localhost:8080 in your browser
```

### Option 3: Using Node.js

```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Start the server
http-server -p 8080

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

1. **Enter Content**: Type or paste any text, URL, WiFi credentials, email, or other data
2. **Customize**: 
   - Adjust the QR code size using the slider (128px - 512px)
   - Choose custom colors for dark and light areas
3. **Generate**: Click the "Generate QR Code" button
4. **Download**: Choose PNG or SVG format to download your QR code

## 🎨 Customization Examples

### URL QR Code
```
https://github.com
```

### WiFi QR Code
```
WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
```

### Email QR Code
```
mailto:hello@example.com
```

### vCard (Contact) QR Code
```
BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL:+1234567890
EMAIL:john@example.com
END:VCARD
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
├── index.html          # Main HTML structure
├── index.css           # Styles and design system
├── app.js             # QR code generation logic
├── qrcode.min.js      # QRCode.js library
├── Dockerfile         # Docker container configuration
├── docker-compose.yml # Docker Compose orchestration
├── .dockerignore      # Docker build exclusions
└── README.md          # This file
```

## 🛠️ Technology Stack

- **HTML5**: Semantic structure with accessibility features
- **CSS3**: Modern design with custom properties, glassmorphism, and animations
- **JavaScript (ES6+)**: Class-based architecture with clean code practices
- **QRCode.js**: External library for QR code generation (CDN)

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
- **Offline Capable**: Works without internet (after initial load)

## 🐛 Troubleshooting

### Downloads Not Working?
Make sure you're running the app through a local HTTP server, not opening the HTML file directly.

### QR Code Not Generating?
1. Ensure you've entered some content
2. Check the browser console (F12) for errors
3. Try refreshing the page

### Colors Not Updating?
The color pickers sync with text inputs. You can use either:
- The color picker tool
- Or type hex codes directly (e.g., `#FF5733`)

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Support

If you found this project helpful, please give it a ⭐!

---

**Built with ❤️ using modern web technologies**
