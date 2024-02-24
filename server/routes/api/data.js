const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/dataController');

router.route('/autoMode/:id')
    .get(dataController.getAutoModeValue)
    .put(dataController.putAutoModeValue)

router.route('/lightMode/:id')
    .get(dataController.getLightModeValue)
    .put(dataController.putLightModeValue)


router.route('/parkMode/:id')
    .get(dataController.getParkModeValue)
    .put(dataController.putParkModeValue)

// router.route('/LightVal')
//     .get(dataController.getLightSensor)


router.route('/getAll/:id')
    .get(dataController.getAll)

router.route('/tempReading/:id')
    .get(dataController.getTempSensor)

router.route('/gpsReading/:id')
    .get(dataController.getGPSsensor)

router.route('/checkLights/:id')
    .get(dataController.checkLights)
    

// router.route('/:id')
//     .get(twootsController.getTwoot);


module.exports = router;