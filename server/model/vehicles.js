const mongoose = require('mongoose');
const { float } = require('webidl-conversions');
const Schema = mongoose.Schema;

const vehiclesSchema = new Schema({
    serialId: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        //required: true
    },
    nickname: {
        type: String,
        default: "My Vehicle"
    },
    autoMode: {
        type: Boolean,
        default: true
    },
    lightMode: {
        type: Boolean,
        default: false
    },
    parkMode: {
        type: Boolean,
        default: false
    },
    parkedLocation: {
        latitude: {
            type: String
        },
        longitude: {
            type: String
        }
    },
    location: {
        latitude: {
            type: String
        },
        longitude: {
            type: String
        }, 
        altitude: {
            type: String
        },
        speed: {
            type: Number
        }
    },
    temperature: {
        type: Number
    },
    temperatureHistory: [{
        time: {
            type: Date,
        },
        value: {
            type: Number
        }
    }],
    humidity: {
        type: Number
    },
    heatIndex: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});




module.exports = mongoose.model('Vehicles', vehiclesSchema);