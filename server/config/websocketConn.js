require('dotenv').config();
const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');

const connectWS = async (ws) => {
    let vehicle;
    ws.once('open', async () => {
        console.log('Connected to WebSocket server');
        try {
            var msg = JSON.stringify({
                action: "msg", 
                type: "cmd",
                body: {
                    type: "getDeviceId"
                }
            })
            ws.send(msg);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
        
        ws.once('message', (data) => {
            console.log('Received message');
            try {
                const parsedMessage = JSON.parse(data);
                if (parsedMessage?.type === 'connection' && parsedMessage?.device){
                    vehicle = checkDB(parsedMessage?.device);
                }
                console.log('Parsed message:', parsedMessage);
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