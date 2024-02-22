const express = require('express');
const router = express.Router();
const twootsController = require('../../controllers/twootsController');

router.route('/')
    .get(twootsController.getAutoModeValue)
    .get(twootsController.getAllTwoots)
    .post(twootsController.createNewTwoot)
    .delete(twootsController.deleteTwoot);

// router.route('/:id')
//     .get(twootsController.getTwoot);


module.exports = router;