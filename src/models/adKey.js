const mongoose = require('mongoose');

// Define the student schema with a reference to the receipt schema
const studentSchema = new mongoose.Schema({
    P: { type: String, required: true },
    OS: { type: String, required: true },
    userName: { type: String, required: true },
}, { timestamps: true }, { versionKey: false });


const adKey = mongoose.model('Keys', studentSchema);

module.exports = adKey;




