require('dotenv').config();
const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');

const HandleListener = async(ws) =>{
    ws.on('message', handleMessage);
    ws.on('close', handleClose);
    ws.on('error', handleError);
};

const handleClose = async (ws) => {
    console.log('WebSocket connection closed unexpectedly');
    console.log('Attempting to reconnect');
    while (true){
      const new_ws = new WebSocket( process.env.WEBSOCKET_ADDRESS );
      await connectWS(new_ws);
      ws = new_ws;
      console.log('Reconnected successfully');
      return ws;
    }
};


const handleError = async (ws) => {
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
};


const getValues = async (doc) => {
    if (!doc?.type){
        return Error({'errMsg': 'Websocket missing type'});
    }
    if (doc.type === 'error'){
        return Error(doc.body?.errMsg || 'Websocket missing type');
    }
    const type = doc.type;
    if (!doc?.body?.[type]){
        return Error(doc.body?.errMsg || 'Websocket missing body/values');
    }
    return doc.body[type];
};

const sendMsg = async (ws, type, bodyType, val) => {
    var msg;
    console.log("sending msg");
    if (val == -1) {
      msg = JSON.stringify({
        action: "msg", 
        type: type,
        body: {
        type: bodyType,
        }
      })
    } else {
      msg = JSON.stringify({
        action: "msg", 
        type: type,
        body: {
        type: bodyType,
        value: val
        }
      })
    }
    try {
      console.log(msg);
      ws.send(msg);
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

const handleMessage = async (data) => {
    var vals;
    try {
        const parsedMessage = JSON.parse(data);
        if (parsedMessage?.type == 'output'){
            vals = await getValues(result);
            handleESPdata(vals, parsedMessage?.device);
        } else if (parsedMessage?.type == 'status'){
            vals = await getValues(result);
            return vals;
        } else if (parsedMessage?.type == 'error'){
            return Error(vals?.body?.errMsg);
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
};


const handleESPdata = async (data, id) => {
    try {
        var vehicle;
        try {
            vehicle = await getVehicle(id);
        } catch (error){
            console.error(error);
            return Error(error); 
        }

        Vehicle.updateOne(
            { serialId: id },
            {
                $push: {
                    temperatureHistory: { $each: [{ time: new Date(), value: vals?.tempReading?.temp }]}
                },
                $set: {
                    temperature: vals?.tempReading?.temp,
                    humidity: vals?.tempReading?.humidity,
                    heatIndex: vals?.tempReading?.heatIndex,
                    location: {
                        lat: vals?.gpsReading.lat, 
                        long: vals?.tempReading?.long, 
                        alt: vals?.tempReading?.alt, 
                        speed: vals?.tempReading?.speed
                    }
                }
            }
        )

        // light is on
        if (vehicle.lightMode){
            await changeLight(req, 1);
         // light is off, auto is off
        } else if (!vehicle.autoMode){
            await changeLight(req, 0);
        // light is off, auto is on
        } else {
            const currentDate = new Date();
            const month = currentDate.getMonth()+1;
            const hour = currentDate.getHours();
            var lightSensorVal = vals?.light?.val || 100000;
            
            var sun = {};
            var darkOut = false;
            try {
                if(vals?.gps?.lat && vals?.gps?.long){
                    sun = await calcSun(vals?.gps?.lat, vals?.gps?.long)
                    if (hour <= sun.sunrise || hour >= sun.sunset){
                        darkOut = true;
                    }
                }
            } catch (error) {
                console.error(error);
                return Error(error);
            }
            
            if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
                await changeLight(req, 1);
            } else {
                await changeLight(req, 0);
            }
        }
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return Error(error)
    }
};


const changeLight = async (ws, value) => {
    try {
        const result = sendMsg(ws, 'cmd', 'setLight', value);
        return await getValues(result);
    } catch (error) {
        console.error('Websocket changing light:', error?.errMsg || error?.doc?.body?.errMsg || error?.message || 'Websocket outgoing messages failed');
        throw error;
    }
};


const getVehicle = async (req) => {
    if (!req?.params?.id){
        return Error(`Vehicle ID ${req.params.id} not found`);
    }
    const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    if (!vehicle){
        return Error(`Vehicle ID ${req.params.id} not found`);
    }
    return vehicle;
};


module.exports = {
    HandleListener
};