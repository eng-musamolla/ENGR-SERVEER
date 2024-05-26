const mongoose = require('mongoose');

const dueFeesSchema = new mongoose.Schema({
    message: { type: String },
    StartDate: { type: Date },
    EndDate: { type: Date },
    recurrenceRule: { type: Object },
    CollectFeesSMS_Status: { type: Boolean },
    ReminderSMS_Status: { type: Boolean },
    Masking: { type: Boolean },
}, { timestamps: true });

const DueFees = mongoose.model('dueFees', dueFeesSchema);

module.exports = DueFees;
