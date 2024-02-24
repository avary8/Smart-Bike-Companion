const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const twootsSchema = new Schema({
    username: {
        type: String,
        default: "anon"
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Twoot', twootsSchema);