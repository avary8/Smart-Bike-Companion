require('dotenv').config();
const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');
const AWS = require('aws-sdk');
const wsController = require('./websocketController');
const SunCalc = require('suncalc');



/*
{
    action: "msg", 
    type: type,
    messageID: messageID,
    body: {
    type: bodyType
}
*/

//---------------------------------private functions
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

const changeLight = async (req, res, value) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'setLight', value);
        return await getValues(result, res);
    } catch (error) {
        console.error('Websocket changing light:', error?.errMsg || error?.doc?.body?.errMsg || error?.message || 'Websocket outgoing messages failed');
        throw error;
    }
}

const getLightSensor = async (req, res) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'getPhoto');
        return await getValues(result);
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        throw error;
    }
}


const getGPSreadings = async (req, res) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'getGPS');
        return await getValues(result);
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        throw error;
    }
}

const calcSun = async (lat, long) => {
    const times = SunCalc.getTimes(new Date(), lat, long);
    // console.log('Sunrise:', times.sunrise);
    // console.log('Sunset:', times.sunset);
    return {sunrise: times.sunrise.getHours(), sunset: times.sunset.getHours()};
}

const getVehicle = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Vehicle ID required' })
    }
    const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    if (!vehicle){
        return Error(`Vehicle ID ${req.params.id} not found`);
    }
    return vehicle;
}
//---------------------------------



// parkMode, lightMode, autoMode, temp reading, gps reading, 
const getAll = async (req, res) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'getAll');
        var vehicle;
        try {
            vehicle = await getVehicle(req, res);
        } catch (error){
            return res.status(400).json({'errCode':'-', 'errMsg': error?.message || 'Error retrieving Vehicle'});
        }
        const vals = await getValues(result);
        vals['lightMode'] = vehicle.lightMode;
        vals['parkMode'] = vehicle.parkMode;
        vals['autoMode'] = vehicle.autoMode;

        // light is on
        if (vehicle.lightMode){
           await changeLight(req, res, 1);
        // light is off, auto is off
        } else if (!vehicle.autoMode){
            await changeLight(req, res, 0);
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
            } catch (error) {}
            
            if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
                await changeLight(req, res, 1);
            } else {
                await changeLight(req, res, 0);
            }
        }
        return res.status(200).json({ 'errCode': '0', payload: vals });
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return res.status(500).json({ 'errCode': '-', 'errMsg': error?.errMsg || error?.doc?.body?.errMsg || error?.message || 'Websocket incoming messages failed' });
    }
}


const getTempSensor = async (req, res) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'getTemp');
        const vals = await getValues(result);
        return res.status(200).json({ 'errCode': '0', payload: vals });
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return res.status(500).json({ 'errCode': '-', 'errMsg': error?.errMsg || error?.doc?.body?.errMsg || error?.message || 'Websocket incoming messages failed' });
    }
    // try {
    //     var valid = false;
    //     var result;
    //     while (!valid){
    //         result = await wsController.handleInteraction(req.ws, 'cmd', 'getTemp', process.env.TEMP_SENSOR_PIN);
    //         //const result = wsController.handleMsg(req).body;
    //         if (result?.type === 'output' && result?.body && result?.body?.temp && result?.body?.humidity && result?.body['heat index']){
    //             valid = true;
    //             console.log(JSON.stringify(result));
    //             return res.status(200).json({ 'errCode': '0', payload: result.body });
    //         }
    //     }
    // } catch (error) {
    //     console.error('Websocket incoming messages failed:', error);
    //     res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket incoming messages failed' });
    // }
}


const getGPSsensor = async (req, res) => {
    try {
        const result = await getGPSreadings(req, res)
        return res.status(200).json({ 'errCode': '0', payload: result });
    } catch (error) {
        console.error('Websocket error getting GPS readings:', error);
        return res.status(500).json({ 'errCode': '-', 'errMsg': error?.errMsg || 'Websocket error getting GPS readings' });
    }
}

// get from database
const getAutoModeValue = async (req, res) => {
    const vehicle = await getVehicle(req, res);
    return res.status(200).json({ payload: vehicle.autoMode });
}

// update database value
const putAutoModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'errCode': '-', 'message': 'Vehicle ID required' })
    }
    const vehicle = await getVehicle(req, res);
    var result;
    try {
        vehicle.autoMode = !vehicle.autoMode;
        result = await vehicle.save();
    } catch (error){
        res.status(500).json({ 'errCode': '-', 'errMsg': error.errMsg || 'Update failed' });
    }

    // light is on
    if (result.lightMode){
        await changeLight(req, res, 1);
        return res.status(200).json({ 'errCode': '0', 'message': "Update successful, light turned on", payload: result.autoMode });
     
    }

    // light is off, auto is off
    if (!result.autoMode){
        await changeLight(req, res, 0);
        return res.status(200).json({ 'errCode': '0', 'message': "Update successful, light turned off", payload: result.autoMode });
    }

     // light is off, auto is on

    const currentDate = new Date();
    const month = currentDate.getMonth()+1;
    const hour = currentDate.getHours();
    var lightSensorVal = 100000;
    try {
        lightSensorVal = await getLightSensor(req, res);
    } catch (error) {}

    var gps;
    var sun = {};
    var darkOut = false;
    try {
        gps = await getGPSreadings(req, res);
        if(gps?.lat && gps?.long){
            sun = await calcSun(gps?.lat, gps?.long)
            if (hour <= sun.sunrise || hour >= sun.sunset){
                darkOut = true;
            }
        }
    } catch (error) {}
    
    try {
        if(vals?.gps?.lat && vals?.gps?.long){
            sun = await calcSun(vals?.gps?.lat, vals?.gps?.long)
            if (hour <= sun.sunrise || hour >= sun.sunset){
                darkOut = true;
            }
        } else {
            await changeLight(req, res, 0);
            return res.status(200).json({ 'errCode': '0', 'message': "Update successful, light turned off", payload: result.autoMode });
        }
    } catch (error) {}

    if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
        try {
            await changeLight(req, res, 1);
            return res.status(200).json({ 'errCode': '0', 'message': "Update successful, light turned on", payload: result.autoMode });
        } catch (error){
            return res.status(200).json({ 'errCode': '-', 'message': "Update successful, light not turned on", payload: result.autoMode });
        } 
    }
    return res.status(200).json({ 'errCode': '0', 'message': "Update successful", payload: result.autoMode });
}

// get from database
const getParkModeValue = async (req, res) => {
    const vehicle = await getVehicle(req, res);
    return res.status(200).json({ payload: vehicle.parkMode });
}

// update database value
const putParkModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'errCode': '-', 'message': 'Vehicle ID required' })
    }
    const vehicle = await getVehicle(req, res);
    try {
        vehicle.parkMode = !vehicle.parkMode;
        const updatedVehicle = await vehicle.save();
        return res.status(200).json({ 'errCode': '0', 'message': "Update successful", payload: updatedVehicle.parkMode });
    } catch (error){
        res.status(500).json({ 'errCode': '-', 'errMsg': error.errMsg || 'Update failed' });
    }
}

// get from database
const getLightModeValue = async (req, res) => {
    const vehicle = await getVehicle(req, res);
    return res.status(200).json({ payload: vehicle.lightMode });
}


// update database value
const putLightModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'errCode': '0', 'message': 'Vehicle ID required' })
    }
    const vehicle = await getVehicle(req, res);
    var result;
    try {
        console.log(vehicle.lightMode);
        vehicle.lightMode = !vehicle.lightMode;
        console.log(vehicle.lightMode);

        result = await vehicle.save();
    } catch (error){
        res.status(500).json({ 'errCode': '-', 'errMsg': error.errMsg || 'Update failed' });
    }
    console.log(result.lightMode);

    // light is on
    if (result.lightMode){
        await changeLight(req, res, 1);
    // light is off, auto is off
    } else if (!result.autoMode){
        await changeLight(req, res, 0);
    // light is off, auto is on
    } else {
        const currentDate = new Date();
        const month = currentDate.getMonth()+1;
        const hour = currentDate.getHours();
        var lightSensorVal = 100000;
        try {
        lightSensorVal = await getLightSensor(req, res);
    } catch (error) {}

    var gps;
    var sun = {};
    var darkOut = false;
    try {
        gps = await getGPSreadings(req, res);
        if(gps?.lat && gps?.long){
            sun = await calcSun(gps?.lat, gps?.long)
            if (hour <= sun.sunrise || hour >= sun.sunset){
                darkOut = true;
            }
        }
    } catch (error) {}
    
    try {
        if(vals?.gps?.lat && vals?.gps?.long){
            sun = await calcSun(vals?.gps?.lat, vals?.gps?.long)
            if (hour <= sun.sunrise || hour >= sun.sunset){
                darkOut = true;
            }
        }
    } catch (error) {}

    if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
        try {
            await changeLight(req, res, 1);
            return res.status(200).json({ 'errCode': '0', 'message': "Update successful, light turned on", payload: result.lightMode });
        } catch (error){
            return res.status(200).json({ 'errCode': '-', 'message': "Update successful, light not turned on", payload: result.lightMode });
        } 
    }
    }
    return res.status(200).json({ 'errCode': '0', 'message': "Update successful", payload: result.lightMode });
}



const checkLights = async (req, res) => {
    // delete when done testing !!!!!!!!!!!!!!!!
    const tempID = '189922615539556';
    // if (!req?.params?.id){
    //     return res.status(400).json({ 'message': 'Vehicle ID required' })
    // }
    // const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();

    const vehicle = await getVehicle(req, res);
    if (vehicle.lightMode){
        try {
            const result = await changeLight(req, res, 1);
            return res.status(200).json({ 'errCode': '0', 'message': "Light turned on", result });
        } catch (error){
            return res.status(500).json({ 'errCode': '-', 'errMsg': error?.errMsg || 'Websocket: set light failed' });
        }  
    }

    if (!vehicle.autoMode){
        return res.status(200).json({ 'errCode': '0', 'message': 'nothing changed' });
    }

    const currentDate = new Date();
    const month = currentDate.getMonth()+1;
    const hour = currentDate.getHours();
    var lightSensorVal = 100000;
    try {
        lightSensorVal = await getLightSensor(req, res);
    } catch (error) {}

    var gps;
    var sun = {};
    var darkOut = false;
    try {
        gps = await getGPSreadings(req, res);
        if(gps?.lat && gps?.long){
            sun = await calcSun(gps?.lat, gps?.long)
            if (hour <= sun.sunrise || hour >= sun.sunset){
                darkOut = true;
            }
        }
    } catch (error) {}
    
    if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
        try {
            const result = await changeLight(req, res, 1);
            return res.status(200).json({ 'errCode': '0', 'message': "Light turned on", result });
        } catch (error){
            return res.status(500).json({ 'errCode': '-', 'errMsg': error?.errMsg || 'Websocket: set light failed' });
        }  
    } 

    return res.status(200).json({ 'errCode': '0', 'message': 'nothing changed' });
}


module.exports = {
    getAll,
    getAutoModeValue,
    putAutoModeValue,
    getLightModeValue,
    putLightModeValue,
    getParkModeValue,
    putParkModeValue,
    getGPSsensor,
    getTempSensor,
    checkLights
}