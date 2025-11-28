# Docker Setup Guide for QR Code Generator

## Prerequisites

1. **Install Docker Desktop**
   - Windows: Download from https://www.docker.com/products/docker-desktop
   - After installation, start Docker Desktop from the Start menu
   - Wait for Docker to fully start (whale icon in system tray should be steady)

## Quick Start Commands

### Using Docker Compose (Easiest)

```bash
# Start the application
docker-compose up -d

# Access at http://localhost:8080

# Stop the application
docker-compose down
```

### Using Docker CLI

```bash
# Build the image
docker build -t qr-code-generator .

# Run the container
docker run -d -p 8080:80 --name qrgen qr-code-generator

# Access at http://localhost:8080

# Stop and remove
docker stop qrgen
docker rm qrgen
```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- Check the system tray for the Docker whale icon
- Wait a few moments after starting Docker Desktop

### Port 8080 already in use
- Stop the Python server first: Find the terminal running `python -m http.server 8080` and press Ctrl+C
- Or use a different port: `docker run -d -p 3000:80 --name qrgen qr-code-generator`

### Container won't start
- Check logs: `docker logs qrgen`
- Remove old container: `docker rm -f qrgen`
- Rebuild: `docker build -t qr-code-generator . --no-cache`

## Useful Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker logs qrgen

# Follow logs in real-time
docker logs -f qrgen

# Execute commands in running container
docker exec -it qrgen sh

# Stop container
docker stop qrgen

# Start stopped container
docker start qrgen

# Remove container
docker rm qrgen

# Remove image
docker rmi qr-code-generator

# Clean up everything
docker system prune -a
```

## Deployment Options

### 1. Docker Hub (Public/Private Registry)

```bash
# Tag your image
docker tag qr-code-generator yourusername/qr-code-generator:latest

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push yourusername/qr-code-generator:latest

# Pull and run from anywhere
docker pull yourusername/qr-code-generator:latest
docker run -d -p 8080:80 yourusername/qr-code-generator:latest
```

### 2. AWS Elastic Container Service (ECS)

```bash
# Install AWS CLI and configure credentials
aws configure

# Create ECR repository
aws ecr create-repository --repository-name qr-code-generator

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag qr-code-generator:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/qr-code-generator:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/qr-code-generator:latest
```

### 3. Google Cloud Run

```bash
# Install gcloud CLI and authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy qr-code-generator \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Azure Container Instances

```bash
# Login to Azure
az login

# Create resource group
az group create --name qrgen-rg --location eastus

# Create container instance
az container create \
  --resource-group qrgen-rg \
  --name qrgen \
  --image qr-code-generator \
  --dns-name-label qrgen-unique \
  --ports 80
```

### 5. DigitalOcean App Platform

1. Push your code to GitHub
2. Go to DigitalOcean App Platform
3. Create new app from GitHub repo
4. Select Dockerfile deployment
5. Deploy!

## Production Considerations

### 1. Use Multi-Stage Builds (Optional Optimization)

The current Dockerfile is already optimized using nginx:alpine (only ~23MB).

### 2. Health Checks

Add to docker-compose.yml:
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 3. Environment Variables

For different configurations:
```bash
docker run -d \
  -p 8080:80 \
  -e NGINX_PORT=80 \
  --name qrgen \
  qr-code-generator
```

### 4. Volume Mounts (for development)

```bash
docker run -d \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html \
  --name qrgen \
  nginx:alpine
```

## Security Best Practices

1. **Run as non-root user** (nginx:alpine already does this)
2. **Use specific image tags** instead of `latest`
3. **Scan for vulnerabilities**: `docker scan qr-code-generator`
4. **Keep base images updated**: Rebuild regularly
5. **Use HTTPS** in production (add reverse proxy like Traefik or nginx-proxy)

## Next Steps

1. Start Docker Desktop
2. Run `docker-compose up -d`
3. Open http://localhost:8080
4. Enjoy your containerized QR Code Generator! 🎉
