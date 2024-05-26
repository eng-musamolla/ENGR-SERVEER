const mongoose = require('mongoose');

const scheduleSMSSchema = new mongoose.Schema({
    totalStudents: Number,
    success: Number,
    failed: Number,
    totalCampaignCost: Number,
    failedSMS: Array,
    succeedSMS: Array,
}, { timestamps: true });

const ScheduleSMS = mongoose.model('ScheduleSMS', scheduleSMSSchema);

module.exports = ScheduleSMS;

