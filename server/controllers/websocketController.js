const WebSocket = require('ws');
const connectWS = require('../config/websocketConn');
const { v4: uuidv4 } = require('uuid');


const pingInterval = 30000; // Ping interval in milliseconds
let pingIntervalId;

const generateId = () => {
  return uuidv4();
};

const sendMsg = async (ws, type, messageID, bodyType, val) => {
  var msg;
  console.log("sending msg");
  console.log(`type: ${type} messageID: ${messageID} bodyType: ${bodyType}  val: ${val}`)
  if (val == -1) {
    msg = JSON.stringify({
      action: "msg", 
      type: type,
      messageID: messageID,
      body: {
      type: bodyType,
      }
    })
  } else {
    msg = JSON.stringify({
      action: "msg", 
      type: type,
      messageID: messageID,
      body: {
      type: bodyType,
      value: val
      }
    })
  }
  try {
    console.log(msg);
    ws.send(msg);
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
const handleInteraction = async (ws, type, bodyType, val = -1) => {
  return new Promise((resolve, reject) => {
      startPing(ws);
      const handleMessage = (data) => {
          console.log('Received message');
          try {
              const parsedMessage = JSON.parse(data);
              console.log(parsedMessage);
              //if (parsedMessage.messageID === id) {
                ws.removeListener('message', handleMessage);
                stopPing();
                resolve(parsedMessage);
              //}
          } catch (error) {
              console.error('Error parsing message:', error);
              reject(error);
          }
      };

      

      const handleClose = async (ws) => {
        console.log('WebSocket connection closed unexpectedly');
        console.log('Attempting to reconnect');
        while (true){
          const new_ws = new WebSocket( process.env.WEBSOCKET_ADDRESS );
          await connectWS(new_ws);
          app.use((req, res, next) => {
            ws = new_ws;
            next();
          });
          console.log('Reconnected successfully');
          ws.removeListener('close', handleClose);
          handleInteraction(ws, type, bodyType, val);
          return;
        }
      };

      const handleError = async (ws) => {
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          ws.removeListener('error', handleError);
        });
      }
      

      const id = generateId();

      ws.on('pong', () => {
        console.log('Received pong from ESP32');
      });

      ws.on('ping', ()=>{ws.ping()});
      ws.on('message', handleMessage);
      ws.on('close', handleClose);
      ws.on('error', handleError);
      sendMsg(ws, type, id, bodyType, val);
  });
};


const startPing = (ws) => {
  pingIntervalId = setInterval(() => {
    if (ws.readyState === WebSocket.CLOSING) {
      console.log('closing');
    }
    if (ws.readyState === WebSocket.CONNECTING) {
      console.log('connecting');
    }
    if (ws.readyState === WebSocket.CLOSED) {
      console.log('closed');
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, pingInterval);
};

const stopPing = () => {
  clearInterval(pingIntervalId);
};




module.exports = {
  handleInteraction
};