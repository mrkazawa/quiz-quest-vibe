# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the app
COPY . .

# Install openssh-client for SSH forwarding
RUN apk add --no-cache openssh

# Expose port (default 3000)
EXPOSE 3000

# Run both the Node server and Serveo SSH tunnel
CMD ["sh", "-c", "npm start & sleep 5 && ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 serveo.net"]
