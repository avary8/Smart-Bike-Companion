const WebSocket = require('ws');

const sendMsg = async (ws, type, bodyType, bodyPin, val) => {
  var msg;
  console.log("sending msg");
  console.log(`type: ${type}  bodyType: ${bodyType}  pin: ${bodyPin} val: ${val}`)
  if (bodyPin == -1) {
    msg = JSON.stringify({
      action: "msg", 
      type: type,
      body: {
      type: bodyType
      }
    })
  } else if (val == -1) {
    msg = JSON.stringify({
      action: "msg", 
      type: type,
      body: {
      type: bodyType,
      pin: bodyPin
      }
    })
  } else {
    msg = JSON.stringify({
      action: "msg", 
      type: type,
      body: {
      type: bodyType,
      pin: bodyPin,
      value: val
      }
    })
  }
  try {
    await ws.send(msg);
    //return await handleMsg(req);
  } catch (error) {
      console.error('Error sending message:', error);
      throw error;
  }
};


// const handleMsg = async (req) => {
//   return new Promise((resolve, reject) => {
//     req.ws.on('message', (data) => {
//       console.log('Received message');
//       try {
//         const parsedMessage = JSON.parse(data);
//         resolve(parsedMessage);
//       } catch (error) {
//         console.error('Error parsing message:', error);
//         reject(error);
//       }
//     });
//   });
// };
const handleInteraction = async (ws, type, bodyType = -1, bodyPin = -1, val = -1) => {
  return new Promise((resolve, reject) => {
      const handleMessage = (data) => {
          console.log('Received message');
          try {
              const parsedMessage = JSON.parse(data);
              console.log(parsedMessage);
              // Remove the event listener to avoid memory leaks
              ws.removeListener('message', handleMessage);
              resolve(parsedMessage);
          } catch (error) {
              console.error('Error parsing message:', error);
              reject(error);
          } finally {
            ws.off('message', handleMessage);
          }
      };

      const handleClose = () => {
        reject(new Error('WebSocket connection closed unexpectedly'));
      };

      ws.on('message', handleMessage);
      ws.once('close', handleClose);
      sendMsg(ws, type, bodyType, bodyPin, val);
  });
};




const handleError = (ws) => {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

const handleClose = (ws) => {
  // Event listener for when the connection is closed
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
}




module.exports = {
  handleInteraction,
  handleClose,
  handleError
};