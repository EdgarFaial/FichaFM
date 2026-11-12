const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    fichas: [
        {
            type: Object,
            required: false,
            unique: false
        }
    ]
}, { id: true, timestamps: true });

const entity = mongoose.models.User || mongoose.model("User", schema);

module.exports = entity;