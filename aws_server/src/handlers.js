"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const util_1 = require("util");
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
    console.log(event);
    connectionId = event?.requestContext?.connectionId;
    const routeKey = event?.requestContext?.routeKey || event?.action;
    var body = '';
    if  (event?.body){
        body = JSON.parse(event?.body);
    }
    const devID = body?.deviceID;
    switch (routeKey) {
        case "$connect": // when client connects to websocket server
            // we will create a new client id in dynamoDB 
            return handleConnect();
        case "$disconnect": // when client disconnects to websocket server
            // we will remove the client id from dynamoDB 
            return handleDisconnect();
        case "getConnectionID":
            console.log("it works");
            break;
        case "$default":
        case "msg":
            console.log(`deviceID: ${devID}  tempConns : ${tempConns[devID]}`);
            if (devID && !tempConns[devID]){
                const getItemParams = {
                    TableName: 'Vehicles',
                    Key: {
                        'vehicleID': { S: devID },
                    }
                };

                const vehicle = await dynamodbClient.send(new client_dynamodb_1.GetItemCommand(getItemParams));
                console.log(`vehicle found: ${JSON.stringify(vehicle)}`);
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
                        console.log(`item added: ${devID}`);
                    } else {
                        tempConns[event.deviceID] = true;
                        console.log(`vehicle exists in db: ${devID}`)
                    }
                } catch (error){
                    console.log(`error adding vehicle to db: ${error}`);
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
        console.log(`error adding new conneciton to db: ${error}`);
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
const handleMsg = async (thisConnectionId, body) => {
    const output = await dynamodbClient.send(new client_dynamodb_1.ScanCommand({
        TableName: clientsTable,
    }));
    console.log(`Body to send: ${body}`)

    if (output.Count && output.Count > 0) {
        for (const item of output.Items || []) {
            console.log(`stored ${item["connectionId"].S} vs ${thisConnectionId}`);

            if (item["connectionId"].S !== thisConnectionId) {
                await sendMsg(item["connectionId"].S, body);
            }
        }
    }
    else {
        await sendMsg(thisConnectionId, { action: "msg", type: "warning", body: "no recipient" });
    }
    return responseOk;
};
const sendMsg = async (connectionId, body) => {
    try {
        await apiGatewayMgmtApi.postToConnection({
            "ConnectionId": connectionId,
            "Data": textEncoder.encode(JSON.stringify(body))
        });
        console.log(`message sent: ${JSON.stringify(body)}`);
    }
    catch (e) {
        console.log(`error sending msg: ${e} . body: ${body}`);
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
        console.log(`parsed message ${JSON.stringify(data)}`);
        if (data?.type == 'output'){
            vals = await getValues(data);   
            handleESPdata(vals, data?.deviceID);
        } else if (data?.type == 'status'){
            vals = await getValues(data);
            return vals;
        } else {
            frontEndHandleMessage(data, data?.deviceID);
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
    return responseOk;
};



const handleESPdata = async (data, id) => {
    try {
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
            console.log(`error updating esp data: ${error}`);
        }

        var vehicle;
        try {
            vehicle = await getVehicle(id);
        } catch (error){
            console.error(error);
            return Error(error); 
        }

        // light is on
        if (vehicle?.Item?.lightMode){
            await changeLight(1);
        // light is off, auto is off
        } else if (!vehicle?.Item?.autoMode){
            await changeLight(0);
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
                    sun = await calcSun(data?.gpsReading?.lat, data?.gpsReading?.long)
                    if (hour <= sun.sunrise || hour >= sun.sunset){
                        darkOut = true;
                    }
                }
            } catch (error) {
                console.error(error);
                return Error(error);
            }
            
            if (darkOut || ((month > 10 || month < 4) && (hour > 17 || hour < 8)) || ((month < 11 || month > 3) && (hour > 18 || hour < 7)) || (lightSensorVal < 400)){
                await changeLight(1);
            } else {
                await changeLight(0);
            }
        }
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return Error(error)
    }
};



const changeLight = async (val) => {
    try {
        const msg = {
            action: "msg", 
            type: 'setLight',
            body: {
                value: val
            }
        }
        return sendMsg(connectionId, msg);
    } catch (error) {
        console.error('Websocket changing light:', error?.errMsg || error?.message || 'Websocket outgoing messages failed');
        throw error;
    }
};



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
const frontEndHandleMessage = async (data, id) => {
    var vals;
    try {
        if (data?.type == 'set' || data?.type == 'get'){
            vals = await getValues(data);
            switch (data?.type){
                case 'set': 
                    updateDB(vals, id);
                    break;
                case 'get':
                    retrieveDB(vals, id);
                    break;
            }
        }
    } catch (error) { 
        console.error(error);
        return; 
    }
}


const updateDB = async (data, id) => {
    try {
        var vehicle;
        var params;
        try {
            vehicle = await getVehicle(id);
        } catch (error){
            console.error(error);
            return Error(error); 
        }
        switch (data?.req){
            case 'parkMode':
                if (data?.parkMode != undefined){
                    params = {
                        TableName: 'Vehicles',
                        Key: {
                            'vehicleID': {S: id}
                        },
                        ExpressionAttributeNames: {
                            '#parkmode': "parkMode"
                        },
                        ExpressionAttributeValues: {
                            ':newAttribute': { BOOL: data.parkMode }
                        },
                        ReturnValues: 'ALL_NEW',
                        UpdateExpression: 'SET #parkmode = :newAttribute'
                    };
                }
                break;
            case 'lightMode':
                if (data?.lightMode != undefined){
                    params = {
                        TableName: 'Vehicles',
                        Key: {
                            'vehicleID': {S: id}
                        },
                        ExpressionAttributeNames: {
                            '#lightmode': "lightMode"
                        },
                        ExpressionAttributeValues: {
                            ':newAttribute': { BOOL: data.lightMode }
                        },
                        ReturnValues: 'ALL_NEW',
                        UpdateExpression: 'SET #lightmode = :newAttribute'
                    };
                }
                break;
            case 'autoMode': 
            if (data?.autoMode != undefined){
                params = {
                    TableName: 'Vehicles',
                    Key: {
                        'vehicleID': {S: id}
                    },
                    ExpressionAttributeNames: {
                        '#automode': "autoMode"
                    },
                    ExpressionAttributeValues: {
                        ':newAttribute': { BOOL: data.autoMode }
                    },
                    ReturnValues: 'ALL_NEW',
                    UpdateExpression: 'SET #automode = :newAttribute'
                };
            }
            break; 
        }
        const output = await dynamodbClient.send(new client_dynamodb_1.PutItemCommand(params));
        console.log(`modes from front-end updated: ${output}`);
    } catch (error) {
        console.error('Websocket incoming messages failed:', error);
        return Error(error)
    }
};



const retrieveDB = async (data, id) => {
    const vehicle = await getVehicle(id);
    const val = vehicle?.Item[data?.req];
    msg = {
        action: "msg", 
        id: String(id),
        type: data?.type,
        req: data?.req,
        value: val
    }
    return handleMsg("", msg);
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