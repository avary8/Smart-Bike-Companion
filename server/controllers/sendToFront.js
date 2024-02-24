const AWS = require('aws-sdk');

const apigatewayManagementApi = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ADDRESS,
});


exports.handler = async (event) => {
  // Extract connection ID from event
  const connectionId = event.requestContext.connectionId;

  // Construct payload for message
  const payload = {
    action: 'update',
    data: { key: 'value' },
  };
  try {

  
  // Send message to frontend using the custom route
  await apigatewayManagementApi.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(payload),
    RouteKey: 'forFrontend',
  }).promise();


  return { statusCode: 200, body: 'Message sent successfully' };
} catch (error) {
  
}
};