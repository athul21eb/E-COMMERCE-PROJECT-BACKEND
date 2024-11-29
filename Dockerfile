# Use Node.js 20 with Alpine Linux as the base image for a lightweight setup
FROM node:20-alpine

# Create a non-root user and group for security
RUN addgroup -S app && adduser -S -G app app

# Set the working directory
WORKDIR /app

# Copy package files as root to avoid permission issues during installation
COPY package.json package-lock.json ./

# Temporarily switch to root for installation
USER root

# Change ownership of the working directory to the non-root user
RUN chown -R app:app /app

# Install dependencies in production mode
RUN npm ci --production

# Switch back to the non-root user
USER app

# Copy the rest of the application files
COPY . .

# Expose the necessary port
EXPOSE 5000

# Command to start the application
CMD ["npm", "start"]
