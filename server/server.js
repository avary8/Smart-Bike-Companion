require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const connectWS = require('./config/websocketConn');
const { config } = require('dotenv');
const app = express();
const server = http.createServer(app);
const WebSocket = require('ws');

// Connect to MongoDB
connectDB();
// Connect to Websocket
const ws = new WebSocket( process.env.WEBSOCKET_ADDRESS );
connectWS(ws);
app.use((req, res, next) => {
    req.ws = ws;
    next();
});


const PORT = process.env.PORT || 3500;



// custom middleware logger
app.use(logger);

//built-in middleware for urlencoded data (form data). 
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json
app.use(express.json());

/*-----------------------Routes-----------------------*/
app.use('/vehicles', require('./routes/api/vehicles'));
app.use('/data', require('./routes/api/data'));

// app.use('/', require('./routes/api/vehicles'));

// app.all('*', (req, res, next) => {
//     res.redirect('/');
//     });

app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
})


//setInterval(savePhotoGPSdata, 180000); // every 3 minutes
//setInterval(saveTempSensorData, 1800000); // every 30 minutes


