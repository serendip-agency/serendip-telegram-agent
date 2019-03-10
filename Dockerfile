FROM node:alpine
WORKDIR /app
COPY . .
RUN npm i 
EXPOSE 80
USER root
CMD [ "node", "dist/app.js" ]