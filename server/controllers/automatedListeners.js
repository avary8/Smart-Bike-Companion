const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');
const connectWS = require('../config/websocketConn');
const { v4: uuidv4 } = require('uuid');
const wsController = require('./websocketController');
const dataController = require('./dataController');
const SunCalc = require('suncalc');
const cron = require('node-cron');




const monitorGPS = async (ws) => {
    ws.on('message', async (data) => {
        try {
            const parsedMessage = JSON.parse(data);
            console.log("monitorgps ")
            if (parsedMessage?.device && parsedMessage?.type === 'gps') {
                console.log(parsedMessage);
                const id = parsedMessage.device;

                const vehicle = await Vehicle.findOne({ serialId: id }).exec();

                if (vehicle && vehicle?.autoMode){
                    if (parsedMessage.type === 'bright'){
                        await wsController.handleInteraction(ws, 'cmd', 'setLight', 0);
                    } else if (parsedMessage.type === 'dark'){
                        await wsController.handleInteraction(ws, 'cmd', 'setLight', 1);
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    })
}

// scheduled, getTemp
cron.schedule('*/30 * * * *', async (ws) => {
    try {
        const response = await wsController.handleInteraction(ws, 'cmd', 'getTemp');
        const vals = await dataController.getValues(response);
        if (vals?.temp && response?.device){
            const id = response.device;
            Vehicle.updateOne(
                { serialId: id },
                {
                    $push: {
                        temperatureHistory: { $each: [{ time: new Date(), value: vals.temp }]}
                    },
                $set: {
                    temperature: vals.temp,
                    humidity: vals.humidity,
                    heatIndex: vals.heatIndex
                }
                }
            )
        }
        console.log('Scheduled Temperature data received');

    } catch (error) {
        console.error('Error fetching temperature data:', error.message);
    }
});



