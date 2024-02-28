"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = void 0;
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
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
const handle = async (event: APIGatewayProxyEventV2) => {
    console.log(event);
    const connectionId = event?.context?.connectionId || event?.requestContext?.connectionId || event?.connectionID;
    const routeKey = event?.requestContext?.routeKey || event?.action;
    const body = event.body || "";
    switch (routeKey) {
        case "$connect": // when client connects to websocket server
            // we will create a new client id in dynamoDB 
            return handleConnect(connectionId);
        case "$disconnect": // when client disconnects to websocket server
            // we will remove the client id from dynamoDB 
            return handleDisconnect(connectionId);
        case "getConnectionID":
            console.log("it works");
            break;
        case "$default":
        case "msg":
            console.log(`deviceID: ${event?.deviceID}  tempConns : ${tempConns[event?.deviceID]}`);
            if (event?.deviceID && !tempConns[event?.deviceID]){
                const getItemParams = {
                    TableName: 'Vehicles',
                    Key: {
                        'vehicleID': { S: event?.deviceID },
                    }
                };

                const vehicle = await dynamodbClient.send(new client_dynamodb_1.GetItemCommand(getItemParams));
                console.log(`vehicle found: ${JSON.stringify(vehicle)}`);
                try {
                    if (!vehicle?.vehicleID){
                        await dynamodbClient.send(new client_dynamodb_1.PutItemCommand({
                                TableName: 'Vehicles',
                                Item: { 
                                    'vehicleID': { S: event?.deviceID },
                                    'owner': { S: '' },
                                    'nickname': { S: '' },
                                    'autoMode': { BOOL: true },
                                    'lightMode': { BOOL: true },
                                    'parkMode': { BOOL: true },
                                    'parkedLocation': { M: {
                                        'latitude': { S: ''},
                                        'longitude': {S: ''}
                                    }, 
                                    'location': { M: {
                                        'latitude': { S: ''},
                                        'longitude': {S: ''},
                                        'altitude': { S: ''},
                                        'speed': {S: ''}
                                    }},
                                    'temperature': { NULL: true },
                                    'temperatureHistory': { L: [
                                        [{
                                            "M": {
                                                "temp": {"NULL": true},
                                                "date": {"NULL": true}
                                              }
                                          }]
                                          // or 
                                        // {S: ''} // list of stringified jsons ? 
                                        // or 
                                        // 'time': { NULL: true},
                                        // 'value': {Null: true},
                                    ]},
                                    'humidity': { NULL: true },
                                    'heatIndex': { NULL: true }
                                }
                        }}));
                        tempConns[event.deviceID] = true;
                        console.log(`item added: ${event?.deviceID}`);
                    } else {
                        tempConns[event.deviceID] = true;
                        console.log(`vehicle exists in db: ${event?.deviceID}`)
                    }
                } catch (error){
                    console.log(`error adding vehicle to db: ${error}`);
                }
            }
            // we will scan dynamoDB for all clients . we iterate over all clients (except the one that is sending the msg) and send the message 
            // if it is a web client that is sending a message, it will only send to the esp32 
            // this handle function has the ability to send a message to all esp32 clients. except it will send the same message, so it would need to be tweaked if you want to differentiate
            return handleMsg(connectionId, body);
    }
    return {
        statusCode: 200,
        body: "",
    };
};
exports.handle = handle;
const handleConnect = async (connectionId) => {
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
        statusCode: 200,
        body: connectionId
    };
    return responseOk;
};
const handleDisconnect = async (connectionId) => {
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
        await sendMsg(thisConnectionId, JSON.stringify({ action: "msg", type: "warning", body: "no recipient" }));
    }
    return responseOk;
};
const sendMsg = async (connectionId, body) => {
    try {
        await apiGatewayMgmtApi.postToConnection({
            "ConnectionId": connectionId,
            "Data": textEncoder.encode(body)
        });
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
//# sourceMappingURL=handlers.js.map