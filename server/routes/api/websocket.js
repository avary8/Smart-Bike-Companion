const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const AWS = require('aws-sdk');
const wsController = require('../../controllers/websocketController');

// router.route('/socket')
//     .get(wsController.handleConnection)

/// not using this rn ...


router.get('/', (req, res) => {
    const ws = new WebSocket( process.env.WEBSOCKET_ADDRESS );
    wsController.handleWebsocketConnection(ws);
    res.send('WebSocket connection initiated');
});


module.exports = router;