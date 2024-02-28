require('dotenv').config();
const Vehicle = require('../model/vehicles');

const connectWS = async (ws, id) => {
    console.log("in connect");
    let vehicle;
    ws.once('open', async () => {
        console.log('Connected to WebSocket server');
        
        try {
            var msg = JSON.stringify({
                action: "msg", 
                id: String(id),
                type: "cmd",
                body: {
                    type: "getDeviceId"
                }
            })
            console.log(msg);
            ws.send(msg);
        } catch (error) {
            console.log('Error parsing message:', error);
            console.error('Error parsing message:', error);
        }
        ws.once('msg', (data) => {
            console.log('Received message');
            try {
                const parsedMessage = JSON.parse(data);
                if (parsedMessage?.type === 'connection' && parsedMessage?.id){
                    vehicle = checkDB(parsedMessage?.id);
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