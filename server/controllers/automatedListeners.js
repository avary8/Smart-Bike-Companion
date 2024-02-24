const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');
const connectWS = require('../config/websocketConn');
const { v4: uuidv4 } = require('uuid');
const wsController = require('./websocketController');
const SunCalc = require('suncalc');


const monitorESP = async (ws) => {
    ws.on('message', async (data) => {
        try {
            const parsedMessage = JSON.parse(data);
            console.log("monitorlight ")
            if (parsedMessage?.device && parsedMessage?.type === 'dark' || parsedMessage?.type === 'bright' && parsedMessage?.device) {
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


module.exports = {
    monitorESP
};