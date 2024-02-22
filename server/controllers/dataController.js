require('dotenv').config();
const Vehicle = require('../model/vehicles');
const WebSocket = require('ws');
const AWS = require('aws-sdk');
const wsController = require('./websocketController');


const getAutoModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Vehicle ID required' })
    }
    const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    if (!vehicle){
        return res.status(400).json({ 'message': `Vehicle ID ${req.body.id} not found` });
    }
    return res.status(200).json({ payload: Vehicle.autoMode });
}

const putAutoModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Vehicle ID required' })
    }

    const result = await Vehicle.findOneAndUpdate(
        { serialId: req.params.id },
        {$set: { autoMode: !autoMode }});

    if (result){
        return res.status(200).json({ message: "Update successful", payload: result.autoMode });
    }

    res.status(500).json({ 'errCode': '-', 'errMsg': 'Update failed' });
}


const getLightModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'errCode': '0', 'message': 'Vehicle ID required' })
    }
    const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    if (!vehicle){
        return res.status(400).json({ 'errCode': '0', 'message': `Vehicle ID ${req.body.id} not found` });
    }
    return res.status(200).json({ 'errCode': '0', payload: Vehicle.autoMode });
}



const putLightModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Vehicle ID required' })
    }

    const result = await Vehicle.findOneAndUpdate(
        { serialId: req.params.id },
        {$set: { lightMode: !lightMode }});

    if (result){
        return res.status(200).json({ message: "Update successful", payload: result.lightMode });
    }

    res.status(500).json({ 'errCode': '-', 'errMsg': 'Update failed' });
}


const getLightSensor = async (req) => {
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'analogRead', process.env.LIGHT_SENSOR_PIN);
        //const result = await wsController.handleMsg(req);
        console.log('Parsed message:', result);
        if (result?.body){
            return result.body;
        }
    } catch (error) {
        console.error('light sensor: Websocket incoming messages failed:', error);
        return error;
        //res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket incoming messages failed' });
    }
}


const getTempSensor = async (req, res) => {
    try {
        var valid = false;
        var result;
        while (!valid){
            result = await wsController.handleInteraction(req.ws, 'cmd', 'getTemp', process.env.TEMP_SENSOR_PIN);
            //const result = wsController.handleMsg(req).body;
            if (result?.type === 'output' && result?.body && result?.body?.temp && result?.body?.humidity && result?.body['heat index']){
                valid = true;
                console.log(JSON.stringify(result));
                return res.status(200).json({ 'errCode': '0', payload: result.body });
            }
        }
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket incoming messages failed' });
    }
}


const checkLights = async (req, res) => {
    // delete when done testing !!!!!!!!!!!!!!!!
    const tempID = '189922615539556';
    // if (!req?.params?.id){
    //     return res.status(400).json({ 'message': 'Vehicle ID required' })
    // }
    // const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    console.log("pre-await");
    const vehicle = await Vehicle.findOne({ serialId: tempID }).exec();
    if (!vehicle){
        console.log("device id dne");
        return res.status(400).json({ 'message': `Vehicle ID ${req.body.id} not found` });
    }
    if (vehicle.lightMode){
        console.log("in light mode");
        try {
            console.log("send msg");
            const result = await wsController.handleInteraction(req.ws, 'cmd', 'digitalWrite', process.env.LIGHT_BACK_PIN, 1);
            // add a confirmation msg from esp32

            // req.ws.once('message', (data) => {
            //     console.log('Received message');
            //     try {
            //         const parsedMessage = JSON.parse(data);
            //         console.log('Parsed message:', parsedMessage);
            //         const temp = ((parsedMessage.body*3300.0 / 1024.0 - 500) / 10.0);
            // if success : 

            //const result = wsController.handleMsg(req);
            console.log(result);
            if (result?.type === 'status' && result?.body === 'ok'){
                return res.status(200).json({ message: "Update successful", payload: result });
            } else {
                return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
            }
            //     } catch (error) {
            //         console.error('Error parsing message:', error);
            //         return res.status(500).json({ 'errCode': '-', 'errMsg': 'Data Retrieval Failed' });
            //     }
            // });
        } catch (error) {
            console.error('Websocket outgoing messages failed:', error);
            return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
        }
    }

    if (!vehicle.autoMode){
        console.log("not in auto mode");
        return res.status(200).json({ 'errCode': '0', 'message': 'nothing changed' });
    }
    const currentDate = new Date();
    const month = currentDate.getMonth()+1;
    const hour = currentDate.getHours();
    const lightSensorVal = await getLightSensor(req);


    console.log(`month: ${month}`);
    console.log(`photo hour: ${hour}`);


    if (((month > 10 || month < 4) && (hour > 17 || hour < 8)) || (lightSensorVal !== Error && lightSensorVal < 400)){
        try {
            const result = await wsController.handleInteraction(req.ws, 'cmd', 'digitalWrite', process.env.LIGHT_BACK_PIN, 1);

            // add a confirmation msg from esp32

            // req.ws.once('message', (data) => {
            //     console.log('Received message');
            //     try {
            //         const parsedMessage = JSON.parse(data);
            //         console.log('Parsed message:', parsedMessage);
            //         const temp = ((parsedMessage.body*3300.0 / 1024.0 - 500) / 10.0);
            // if success : 
            //const result = wsController.handleMsg(req);
            if (result?.type === 'status' && result?.body === 'ok'){
                return res.status(200).json({ message: "Update successful", payload: result });
            } else {
                return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
            }
            //     } catch (error) {
            //         console.error('Error parsing message:', error);
            //         return res.status(500).json({ 'errCode': '-', 'errMsg': 'Data Retrieval Failed' });
            //     }
            // });
        } catch (error) {
            console.error('Websocket outgoing messages failed:', error);
            return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
        }
    } 
    try {
        const result = await wsController.handleInteraction(req.ws, 'cmd', 'digitalWrite', process.env.LIGHT_BACK_PIN, 0);

        // add a confirmation msg from esp32

        // req.ws.once('message', (data) => {
        //     console.log('Received message');
        //     try {
        //         const parsedMessage = JSON.parse(data);
        //         console.log('Parsed message:', parsedMessage);
        //         const temp = ((parsedMessage.body*3300.0 / 1024.0 - 500) / 10.0);
        // if success : 
        //const result = wsController.handleMsg(req);
        if (result?.type === 'status' && result?.body === 'ok'){
            return res.status(200).json({ message: "Update successful", payload: result });
        } else {
            return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
        }
        //     } catch (error) {
        //         console.error('Error parsing message:', error);
        //         return res.status(500).json({ 'errCode': '-', 'errMsg': 'Data Retrieval Failed' });
        //     }
        // });
    } catch (error) {
        console.error('Websocket outgoing messages failed:', error);
        return res.status(500).json({ 'errCode': '-', 'errMsg': 'Websocket outgoing messages failed' });
    }
    
    //return res.status(200).json({ 'errCode': '0', 'message': 'nothing changed' });
}


module.exports = {
    getAutoModeValue,
    putAutoModeValue,
    getLightModeValue,
    putLightModeValue,
    getTempSensor,
    checkLights
}