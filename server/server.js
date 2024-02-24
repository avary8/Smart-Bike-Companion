require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const connectWS = require('./config/websocketConn');
const websocket = require('./websockets/listener');
const awsSocket = require('./websockets/frontendListener');
const { config } = require('dotenv');
const app = express();
const server = http.createServer(app);
const WebSocket = require('ws');
const AWS = require('aws-sdk');


const ws_aws = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ADDRESS,
});


// Connect to MongoDB
connectDB();
// Connect to Websocket
const ws = new WebSocket( process.env.WEBSOCKET_ADDRESS );
connectWS(ws);
app.use((req, res, next) => {
    req.ws = ws;
    req.aws = ws_aws;
    next();
});

websocket.HandleListener(ws);


const PORT = process.env.PORT || 3500;
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
})