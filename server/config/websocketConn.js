require('dotenv').config();
const Vehicle = require('../model/vehicles');
const wsController = require('../controllers/websocketController');
const WebSocket = require('ws');

const connectWS = async (ws) => {
    let vehicle;
    ws.once('open', async () => {
        console.log('Connected to WebSocket server');
        //req, type, bodyType = -1, bodyPin = -1, val = -1
        try {
            const result = await wsController.handleInteraction(ws, 'cmd', 'getDeviceId');
            if (result?.type === 'connection' && result?.device){
                vehicle = checkDB(result?.device);
                console.log('Parsed message:', result);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }

        // var msg = JSON.stringify({
        //     action: "msg", 
        //     type: "cmd",
        //     body: {
        //         type: "getDeviceId"
        //     }
        // })
        // ws.send(msg);

        // ws.once('message', (data) => {
        //     console.log('Received message');
        //     try {
        //         const parsedMessage = JSON.parse(data);
        //         // if (parsedMessage?.type === 'connection' && parsedMessage?.device){
        //         //     vehicle = checkDB(parsedMessage?.device);
        //         console.log('Parsed message:', parsedMessage);
        //         //}
        //     } catch (error) {
        //         console.error('Error parsing message:', error);
        //     }
        // });
    });

    ws.once('open', async () => {  
        // set pin mode
        msg = JSON.stringify({
            action: "msg", 
            type: "cmd",
            body: {
                type: "pinMode",
                pin: process.env.LIGHT_BACK_PIN,
                mode: "output"
            }
        })
        ws.send(msg);

        ws.once('message', (data) => {
            console.log('Received message');
            try {
                const parsedMessage = JSON.parse(data);
                // if (parsedMessage?.type === 'connection' && parsedMessage?.device){
                //     vehicle = checkDB(parsedMessage?.device);
                console.log('PinMode Output Message:', parsedMessage);
                //}
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

    });
}

const checkDB = async (id) => {
    let device;
    try {
        device = await Vehicle.findOne({ serialId: id }).exec();
        if (device){
            console.log(id, ' exists in DB already');
            return device;
        }
        const result = await Vehicle.create({
            serialId: id
        });
        await result.save();
        console.log(id, ' added to DB');
        return result;
    } catch (err){ 
        console.error(err);
        return device;
    }
}


module.exports = connectWS;