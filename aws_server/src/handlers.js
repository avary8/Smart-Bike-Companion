"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const util_1 = require("util");
const SunCalc = require('suncalc');
const { connect } = require("http2");
const responseOk = {
    statusCode: 200,
    body: ""
};
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({region: 'us-east-1'});
const MAX_RETRIES = 2;
var retries = 0;

const apiGatewayMgmtApi = new client_apigatewaymanagementapi_1.ApiGatewayManagementApi({
    endpoint: process.env["WSSAPIGATEWAYENDPOINT"]
});
const clientsTable = process.env["CLIENTS_TABLE_NAME"] || "";
var tempConns = {};
const textEncoder = new util_1.TextEncoder();
var connectionId = '';
const handle = async (event) => {
    //console.log(event);
    connectionId = event?.requestContext?.connectionId;
    const routeKey = event?.requestContext?.routeKey || event?.action;
    var body = '';
    if (event?.body){
        body = JSON.parse(event?.body);
    }
    const devID = (body?.deviceID !== undefined ? body.deviceID.trim() : '');
    switch (routeKey) {
        case "$connect": // when client connects to websocket server
            // we will create a new client id in dynamoDB 
            return handleConnect();
        case "$disconnect": // when client disconnects to websocket server
            // we will remove the client id from dynamoDB 
            return handleDisconnect();
        case "$default":
        case "msg":
            if (devID && !tempConns[devID]){
                const getItemParams = {
                    TableName: 'Vehicles',
                    Key: {
                        'vehicleID': { S: devID },
                    }
                };

                const vehicle = await dynamodbClient.send(new client_dynamodb_1.GetItemCommand(getItemParams));
                //console.log(`vehicle found: ${JSON.stringify(vehicle)}`);
                try {
                    if (!vehicle?.Item){
                        await dynamodbClient.send(new client_dynamodb_1.PutItemCommand({
                                TableName: 'Vehicles',
                                Item: { 
                                    'vehicleID': { S: devID },
                                    'owner': { S: '' },
                                    'nickname': { S: '' },
                                    'autoMode': { BOOL: true },
                                    'lightMode': { BOOL: true },
                                    'parkMode': { BOOL: true },
                                    'parkedLocation': { M: {
                                        'latitude': { S: 'nan'},
                                        'longitude': {S: 'nan'}
                                    }}, 
                                    'location': { M: {
                                        'latitude': { S: 'nan'},
                                        'longitude': {S: 'nan'},
                                        'altitude': { S: 'nan'},
                                        'speed': {S: 'nan'}
                                    }},
                                    'temperature': { S: 'nan' },
                                    'temperatureHistory': { L: [
                                        {
                                            "M": {
                                                "temp": {S: ''},
                                                "date": {S: ''}
                                              }
                                        }
                                          // or 
                                        // {S: ''} // list of stringified jsons ? 
                                        // or 
                                        // 'time': { NULL: true},
                                        // 'value': {Null: true},
                                    ]},
                                    'humidity': { S: 'nan' },
                                    'heatIndex': { S: 'nan' }
                                }
                        }));
                        tempConns[event.deviceID] = true;
                        //console.log(`item added: ${devID}`);
                    } else {
                        tempConns[event.deviceID] = true;
                        //console.log(`vehicle exists in db: ${devID}`)
                    }
                } catch (error){
                    console.error(`error adding vehicle to db: ${error}`);
                }
            }
            // we will scan dynamoDB for all clients . we iterate over all clients (except the one that is sending the msg) and send the message 
            // if it is a web client that is sending a message, it will only send to the esp32 
            // this handle function has the ability to send a message to all esp32 clients. except it will send the same message, so it would need to be tweaked if you want to differentiate
            //return handleMsg(connectionId, body);
            return handleMessage(body);
    }
    return {
        statusCode: 200,
        body: "",
    };
};
exports.handle = handle;
const handleConnect = async () => {
    try {
        await dynamodbClient.send(new client_dynamodb_1.PutItemCommand({
            TableName: clientsTable,
            Item: {
                "connectionId": { S: connectionId }
            }
        }));
        // console.log(`sending connection id back: ${connectionId}`);
        // await sendMsg(connectionId, JSON.stringify({ action: "msg", type: "connectionID", body: `${connectionId}` })); // you cant send messages through connection till this returns statusCode 200. would need to send message on other end when it connects
    } catch (error){
        console.error(`error adding new conneciton to db: ${error}`);
    }
    const responseOk = {
        statusCode: 200
    };
    return responseOk;
};
const handleDisconnect = async () => {
    await dynamodbClient.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: clientsTable,
        Key: {
            "connectionId": {
                S: connectionId,
            }
        }
    }));
    return responseOk;
};
const handleMsg = async (body) => {
    const output = await dynamodbClient.send(new client_dynamodb_1.ScanCommand({
        TableName: clientsTable,
    }));

    if (output.Count && output.Count > 0) {
        for (const item of output.Items || []) {
            //console.log(`stored ${item["connectionId"].S} vs ${connectionId}`);

            if (item["connectionId"].S !== connectionId) {
                await sendMsg(item["connectionId"].S, body);
            }
        }
    }
    else {
        await sendMsg(connectionId, { action: "msg", type: "warning", body: "no recipient" });
    }
    return responseOk;
};

const sendMsg = async (connectionId, body) => {
    //console.log(`msg to send: ${JSON.stringify(body)}`)
    try {
        await apiGatewayMgmtApi.postToConnection({
            "ConnectionId": connectionId,
            "Data": textEncoder.encode(JSON.stringify(body))
        });
    } catch (e) {
        console.error(`error sending msg: ${e} : body: ${JSON.stringify(body)}`);
        if (e instanceof client_apigatewaymanagementapi_1.GoneException) {
            if (retries < MAX_RETRIES){
                console.log(`Retrying message send. Retry count: ${retries + 1}`);
                retries++;
            } else {
                console.log(`Retries maxed out. Retry count: ${retries}`);
                await handleDisconnect(connectionId);
            }
            return;
        }
        throw e;
    }
};



const getValues = async (doc) => {
    if (!doc?.type){
        return Error({'errMsg': 'Websocket missing type'});
    }
    if (doc.type === 'error'){
        return Error(doc.body?.errMsg || 'Websocket error');
    }
    const type = doc.type;
    if (!doc?.body?.[type]){
        return Error(doc.body?.errMsg || 'Websocket missing body/values');
    }
    return doc.body[type];
};


const handleMessage = async (data) => {
    var vals;
    try {
        if (data?.type == 'output' && data?.deviceID){
            vals = await getValues(data);   
            await handleMsg(data);
            await handleESPdata(vals, data.deviceID.trim()); 
        } else if (data?.type == 'status'){
            //vals = await getValues(data);
            await getValues(data);
            //return vals;
        } else {
            await frontEndHandleMessage(data);
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
    return responseOk;
};



const handleESPdata = async (data, id) => {
    try {
        const date = new Date();
        const params = {
            TableName: 'Vehicles',
            Key: {
                'vehicleID': {S: id}
            },
            ExpressionAttributeNames: {
                '#L': 'location' // location is reserved word
            },
            ExpressionAttributeValues: {
                ':temphist': { L : [{
                    'M': {
                        'temp': { S: data?.tempReading?.temp },
                        'date': { S: date.toISOString() }
                    }

                }]},
                ':T': { S: data?.tempReading?.temp },
                ':hum': { S: data?.tempReading?.humidity },
                ':heat': { S: data?.tempReading?.heat_index },
                ':loc': { M: {
                    'latitude': { S: data?.gpsReading?.lat },
                    'longitude': { S: data?.gpsReading?.long },
                    'altitude': { S: data?.gpsReading?.alt },
                    'speed': { S: data?.gpsReading?.speed },
                }},
            },
            ReturnValues: 'ALL_NEW',
            UpdateExpression: 'SET temperatureHistory=list_append(temperatureHistory, :temphist), temperature = :T, humidity=:hum, heatIndex=:heat, #L=:loc',
        };
        await dynamodbClient.send(new client_dynamodb_1.UpdateItemCommand(params));

    } catch (error) {
        console.error(`error updating esp data: ${error}`);
    }

    try {
        await checkLights(data, id);
    } catch (error) {
        console.error('error checking lights', error);
        return Error(error)
    }
};



const changeLight = async (id, val) => {
    try {
        const msg = {
            action: "msg", 
            deviceID: id,
            type: 'setLight',
            body: {
                value: val
            }
        }
        await sendMsg(connectionId, msg);
        return await handleMsg(msg);
    } catch (error) {
        console.error('Websocket changing light:', error?.errMsg || error?.message || 'Websocket outgoing messages failed');
        throw error;
    }
};


const checkLights = async(data, id) =>{
    var vehicle;
    try {
        vehicle = await getVehicle(id);
    } catch (error){
        console.error(error);
        return Error(error); 
    }

    // light is on
    if (vehicle?.Item?.lightMode?.BOOL == true){
        //console.log("lightMode on? is tripping");
        return await changeLight(id, 1);
    // light is off, auto is off
    } else if (!(vehicle?.Item?.autoMode?.BOOL == false)){
        //console.log("autoMode off is tripping");
        return await changeLight(id, 0);
    // light is off, auto is on
    } else {
        const currentDate = new Date();
        const month = currentDate.getMonth()+1;
        const hour = currentDate.getHours();
        var lightSensorVal = data?.light?.val || 100000;
        
        var sun = {};
        var darkOut = false;
        try {
            if(data?.gpsReading?.lat && data?.gpsReading?.long){
                sun = await SunCalc.getTimes(currentDate, data?.gpsReading?.lat, data?.gpsReading?.long)
                if (hour <= sun.sunrise || hour >= sun.sunset){
                    darkOut = true;
                }
            }
        } catch (error) {
            console.error(error);
            return Error(error);
        }
        
        if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
            return await changeLight(id, 1);
        } else {
            return await changeLight(id, 0);
        }
    }
}


const getVehicle = async (id) => {
    if (!id){
        return Error(`Vehicle ID ${id} not found`);
    }
    const getItemParams = {
        TableName: 'Vehicles',
        Key: {
            'vehicleID': { S: id },
        }
    };
    const vehicle = await dynamodbClient.send(new client_dynamodb_1.GetItemCommand(getItemParams));

    if (!vehicle?.Item){
        return Error(`Vehicle ID ${id} not found`);
    }
    return vehicle;
};



// frontend msg handler
const frontEndHandleMessage = async (data) => {
    var vals;
    try {
        if (data?.type == 'set' || data?.type == 'get'){
            if (data?.id){
                data.id = (data.id).trim()
            }
            switch (data?.type){
                case 'set': 
                    updateDB(data);
                    break;
                case 'get':
                    retrieveDB(data);
                    break;
            }
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
}


const updateDB = async (data) => {
    if (data?.id && data?.body?.req && data?.body?.val !== undefined){
        const route = data.body.req;
        const value = data.body.val;
        try {
            // quick check
            if (route === 'lightMode'){
                await changeLight(data?.id, value);
            } 
            const params = {
                TableName: 'Vehicles',
                Key: {
                    'vehicleID': {S: data.id}
                },
                ExpressionAttributeValues: {
                    ':newAttribute': { BOOL: value }
                },
                ReturnValues: 'ALL_NEW',
                UpdateExpression: `SET ${route} = :newAttribute`
            }; 
            await dynamodbClient.send(new client_dynamodb_1.UpdateItemCommand(params));
            //const output = await dynamodbClient.send(new client_dynamodb_1.PutItemCommand(params));
            var msg;
            if (route == 'parkMode' && value === true){
                const vehicle = await getVehicle(data.id);
                msg = {
                    action: "msg", 
                    id: data.id,
                    type: data?.type,
                    body: {
                        req: data?.req,
                        val: {
                            'parkedLocation': {
                                'lat': vehicle?.Item?.parkedLocation?.latitude?.S || 'nan',
                                'long': vehicle?.Item?.parkedLocation?.longitude?.S || 'nan',
                            }
                        }
                    }
                }
            } else {
                msg = {
                    action: "msg", 
                    id: data.id,
                    type: data?.type,
                    body: {
                        req: data?.req,
                        val: value
                    }
                } 
            }
            sendMsg(connectionId, msg);
            

            if (route === 'autoMode'){
                try {
                    await checkLights(data, data.id);
                } catch (error){
                    console.error(`error checking lights: ${error}`);
                    return Error(error);
                }
            } 
            
        } catch (error) {
            console.error(`error updating mode: ${error}`);
            const msg = {
                action: "msg", 
                id: data.id,
                type: data?.type,
                body: {
                    req: data?.req,
                    val: !value
                }
            }
            sendMsg(connectionId, msg);
            return Error(error)
        }
    }
};



const retrieveDB = async (data) => {
    if (data?.id && data?.body?.req){
        const vehicle = await getVehicle(data.id);
        const route = data.body.req;
        if (route === 'getAll'){
            return getAll(vehicle, data);
        }
        const val = vehicle?.Item[route];
        const msg = {
            action: "msg", 
            id: data.id,
            type: data.type,
            body: {
                req: route,
                val: val
            }
        }
        return sendMsg(connectionId, msg);
    }
};


const getAll = async (vehicle, data) => {
    const msg = {
        action: "msg", 
        id: data.id,
        type: data.type,
        body: {
            req: 'getAll',
            value: {
                'autoMode': vehicle?.Item?.autoMode?.BOOL || false,
                'lightMode': vehicle?.Item?.lightMode?.BOOL || false,
                'parkMode': vehicle?.Item?.parkMode?.BOOL || false,
                'tempReading': {
                    'temp': vehicle?.Item?.temperature?.S || 'nan',
                    'humidity': vehicle?.Item?.humidity?.S || 'nan',
                    'heat_index': vehicle?.Item?.heatIndex?.S || 'nan',
                },
                'gpsReading': {
                    'lat': vehicle?.Item?.location?.latitude?.S || 'nan',
                    'long': vehicle?.Item?.location?.longitude?.S || 'nan',
                    'alt': vehicle?.Item?.location?.altitude?.S || 'nan',
                    'speed': vehicle?.Item?.location?.speed?.S || 'nan'
                },
                'tempHistory': JSON.stringify(vehicle?.Item?.temperatureHistory.L),
                'parkedLocation': {
                    'lat': vehicle?.Item?.parkedLocation?.latitude?.S || 'nan',
                    'long': vehicle?.Item?.parkedLocation?.longitude?.S || 'nan',
                }
            }
        }
    }   

    try {
        await sendMsg(connectionId, msg);
        await checkLights(data, data.id);
    } catch (error){
        console.error(`error checking lights: ${error}`);
        return Error(error);
    }
};





//# sourceMappingURL=handlers.js.map




// testing updating individual types

// const checkUpdating = async (data, id ) =>{

//     const date = new Date();
//     try {
//         const params = {
//             TableName: 'Vehicles',
//             Key: {
//                 'vehicleID': {S: id}
//             },
//             ExpressionAttributeValues: {
//                 ':T': { S: data?.tempReading?.temp },
//                 ':hum': { S: data?.tempReading?.humidity },
//                 ':heat': { S: data?.tempReading?.heat_index }
//             },
//             ReturnValues: 'ALL_NEW',
//             UpdateExpression: 'SET temperature = :T, humidity=:hum, heatIndex=:heat',
//         };
        
//         const output = await dynamodbClient.send(new client_dynamodb_1.UpdateItemCommand(params));
//         console.log(`updating just strings: success : ${output}`);

//     } catch (error) {
//         console.log(`error updating just strings: ${error}`);
//     }

//     try {
//         const params = {
//             TableName: 'Vehicles',
//             Key: {
//                 'vehicleID': {S: id}
//             },
//             ExpressionAttributeValues: {
//                 ':temphist': { L : [{
//                     'M': {
//                         'temp': { S: data?.tempReading?.temp },
//                         'date': { S: date.toISOString() }
//                     }

//                 }]
//                 },
//             },
//             ReturnValues: 'ALL_NEW',
//             UpdateExpression: 'SET temperatureHistory=list_append(temperatureHistory, :temphist)',
//         };
        
//         const output = await dynamodbClient.send(new client_dynamodb_1.UpdateItemCommand(params));
//         console.log(`updating list - temp hist: success: ${output}`);

//     } catch (error) {
//         console.log(`error updating list - temp hist: ${error}`);
//     }


//     try {
//         const params = {
//             TableName: 'Vehicles',
//             Key: {
//                 'vehicleID': {S: id}
//             },
//             ExpressionAttributeNames: {
//                 '#L': 'location' // Placeholder for the reserved keyword 'location'
//             },
//             ExpressionAttributeValues: {
//                 ':loc': {M: {
//                     'latitude': { S: data?.gpsReading?.lat },
//                     'longitude': { S: data?.gpsReading?.long },
//                     'altitude': { S: data?.gpsReading?.alt },
//                     'speed': { S: data?.gpsReading?.speed },
//                 }},
//             },
//             ReturnValues: 'ALL_NEW',
//             UpdateExpression: 'SET #L=:loc',
//         };
        
//         const output = await dynamodbClient.send(new client_dynamodb_1.UpdateItemCommand(params));
//         console.log(`updating map - loc: success: ${output}`);

//     } catch (error) {
//         console.log(`error updating map - loc : ${error}`);
//     }
//     return;
// };