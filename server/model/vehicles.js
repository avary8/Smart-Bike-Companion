const mongoose = require('mongoose');
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
    location: {
        latitude: {
            type: String
        },
        longitude: {
            type: String
        }
    },
    temperature: {
        type: Number
    },
    humidity: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


// temperature: {
//     current: {
//         type: Number
//     },
//     history: [{
//         time: {
//             type: Date,
//             default: Date.now
//         },
//         value: {
//             type: Number
//         }
//     }]
// }

module.exports = mongoose.model('Vehicles', vehiclesSchema);