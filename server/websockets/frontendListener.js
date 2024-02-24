require('dotenv').config();
const Vehicle = require('../model/vehicles');


exports.handler = async (event) =>{
    const eventType = event.requestContext.eventType;
    try {
        switch (eventType){
            case 'CONNECT':
                console.log(`AWS socket connected: ${ws.requestContext.connectionId}`);
                break;
            case 'DISCONNECT':
                console.log(`AWS socket disconnected: ${ws.requestContext.connectionId}`);
                break;
            case 'fromFrontend':
                handleMessage(ws.requestContext);
                break;
        }
    } catch (error){
        console.error('Error handling WebSocket event:', error);
    }
};


const handleMessage = async (data) => {
    var vals;
    try {
        const parsedMessage = JSON.parse(data);
        if (parsedMessage?.type == 'set' || parsedMessage?.type == 'get'){
            vals = await getValues(result);
            switch (parsedMessage?.type){
                case 'set': 
                    updateDB(vals, parsedMessage?.device);
                    break;
                case 'get':
                    retrieveDB(vals, parsedMessage?.device);
                    break;
            }
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
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



const updateDB = async (data, id) => {
    try {
        var vehicle;
        try {
            vehicle = await getVehicle(id);
        } catch (error){
            console.error(error);
            return Error(error); 
        }
        switch (data?.req){
            case 'parkMode':
                if (vals?.parkMode != undefined){
                    Vehicle.updateOne(
                        { serialId: id },
                        {
                            $set: {
                                parkMode: vals?.parkMode,
                            }
                        }
                    )
                }
                break;
            case 'lightMode':
                if (vals?.lightMode != undefined){
                    Vehicle.updateOne(
                        { serialId: id },
                        {
                            $set: {
                                lightMode: vals?.lightMode,
                            }
                        }
                    )
                }
                break;
            case 'autoMode': 
            if (vals?.autoMode != undefined){
                Vehicle.updateOne(
                    { serialId: id },
                    {
                        $set: {
                            autoMode: vals?.autoMode,
                        }
                    }
                )
            }
            break; 
        }
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return Error(error)
    }
};



const retrieveDB = async (data, id) => {
    var vehicle;
    try {
        vehicle = await getVehicle(id);
        const val = vehicle[data?.req];
        await apigatewayManagementApi.postToConnection({
            ConnectionId: ws.requestContext.ConnectionId,
            Data: JSON.stringify({'req':`${data?.req}`, 'val': `val`}),
            RouteKey: 'forFrontend',
        }).promise();

    } catch (error){
        console.error(error);
        return Error(error); 
    }
};


const getVehicle = async(req, res) => {
    if (!req?.params?.id){
        return Error(`Vehicle ID ${req.params.id} not found`);
    }
    const vehicle = await Vehicle.findOne({ serialId: req.params.id }).exec();
    if (!vehicle){
        return Error(`Vehicle ID ${req.params.id} not found`);
    }
    return vehicle;
};
