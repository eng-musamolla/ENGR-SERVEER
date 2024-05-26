const mongoose = require('mongoose');

// Define the schema for the notice
const noticeSchema = new mongoose.Schema({
    noticeTitle: {
        type: String,
        required: true,
    },
    noticeCategory: {
        type: String,
        required: true,
    },
    noticeUrl: {
        type: String,
    },
    noticeDeleteUrl: {
        type: String,
    },
    stackIndex: {
        type: Number,
        default: 0, // Initialize the stack index (0 represents the top of the stack)
    },
}, { timestamps: true });

// Create the Notice model using the schema
const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
