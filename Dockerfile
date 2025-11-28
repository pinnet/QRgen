# Use nginx alpine for a lightweight web server
FROM nginx:alpine

# Copy all application files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY index.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY qrcode.min.js /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
