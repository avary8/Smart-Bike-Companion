require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const connectWS = require('./config/websocketConn');
const websocket = require('./websockets/listener');
const { config } = require('dotenv');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');


const init = async() => {
    const id = uuidv4();
    // Connect to MongoDB
    await connectDB();
    // Connect to Websocket
    const ws = await new WebSocket( process.env.WEBSOCKET_ADDRESS );
    await connectWS(ws, id);

    mongoose.connection.once('open', () => {
        console.log('Connected to MongoDB');
    })
    
    websocket.HandleListener(ws, id);
}


init();