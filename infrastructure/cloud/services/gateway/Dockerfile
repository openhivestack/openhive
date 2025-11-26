FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# CHANGED: Expose port 80 to match Terraform infrastructure
EXPOSE 80

CMD ["npm", "start"]
