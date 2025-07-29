FROM node:18-alpine
WORKDIR /app
COPY my_app_code/package.json /app/
COPY my_app_code/server.js /app/
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
