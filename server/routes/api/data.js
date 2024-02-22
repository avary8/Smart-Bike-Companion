const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/dataController');

router.route('/AutoMode')
    .get(dataController.getAutoModeValue)
    .put(dataController.putAutoModeValue)

router.route('/LightMode')
    .get(dataController.getLightModeValue)
    .put(dataController.putLightModeValue)


// router.route('/LightVal')
//     .get(dataController.getLightSensor)


router.route('/TempVal')
    .get(dataController.getTempSensor)


router.route('/checkLights')
    .get(dataController.checkLights)
    

// router.route('/:id')
//     .get(twootsController.getTwoot);


module.exports = router;