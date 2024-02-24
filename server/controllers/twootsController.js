const Vehicle = require('../model/vehicles');

const getAutoModeValue = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Vehicle ID required' })
    }
    const vehicle = await Vehicle.findOne({ _id: req.params.id }).exec();
    if (!vehicle){
        return res.status(400).json({ 'message': `Vehicle ID ${req.body.id} not found` });
    }
    return res.status(200).json({ payload: Vehicle.autoMode });
}




const getTwoot = async (req, res) => {
    if (!req?.params?.id){
        return res.status(400).json({ 'message': 'Twoot ID required' })
    }
    const twoot = await Twoot.findOne({ _id: req.params.id }).exec();
    if (!twoot){
        return res.status(400).json({ 'message': `Twoot ID ${req.body.id} not found` });
    }
    res.render('../views/index', { twoots: twoot });
}

const getAllTwoots = async (req, res) => {
    const twoots = await Twoot.find().sort({ createdAt:'asc' });
    if (!twoots) {
        return res.status(204).json({ "message": 'No twoots found' });
    }
    //res.json(twoots);
    res.render('../views/index', { twoots: twoots });
}

const createNewTwoot = async (req, res) => {
    if (!req?.body?.text){
        return res.status(400).json({ 'message': 'text is required' });
    }
    try {
        const result = await Twoot.create({
            text: req.body.text
        });
        if (req?.body?.username){
            result.username = req.body.username;
        }
        await result.save();
        res.redirect('/');
        //res.status(201);
    } catch (err){ 
        console.error(err);
    }
}

const deleteTwoot = async (req, res) => {
    if (!req?.body?.id){
        return res.status(400).json({ 'message': 'Twoot ID is required' })
    }

    const twoot = await Twoot.findOne({ _id: req.body.id }).exec();
    if (!twoot){
        return res.status(400).json({ 'message': `Twoot ID ${req.body.id} not found` });
    }

    const result = await twoot.deleteOne({ _id: req.body.id });
    res.redirect('/');
}

module.exports = {
    getAutoModeValue,
    getTwoot,
    getAllTwoots,
    createNewTwoot,
    deleteTwoot
}