const mongoose = require('mongoose');

const feesSchema = new mongoose.Schema({
    MId: { type: mongoose.Schema.Types.ObjectId, ref: "students", required: true },
    StudentOf: { type: String, required: true },
    StudentId: { type: String, required: true, uppercase: true },
    StudentName: { type: String, required: true, uppercase: true },
    Class: { type: String, required: true },
    Branch: { type: String },
    Batch: { type: String },
    Shift: { type: String },
    Index: { type: String, required: true },
    Version: { type: String, required: true },
    ReceivedBy: { type: String, required: true },
    Fees: {
        FeeMonth: { type: [String] },
        Date: { type: Date, required: true },
        AdmissionFee: { type: Number, default: 0 },
        FormFee: { type: Number, default: 0 },
        IDFee: { type: Number, default: 0 },
        ModelTestFee: { type: Number, default: 0 },
        MonthlyTutionFee: { type: Number, default: 0 },
        Total: { type: Number, required: true },
        TotalInWord: { type: String, required: true }
    },
    InvoiceNumber: { type: String }
}, { versionKey: false });

const Fees = mongoose.model('Fees', feesSchema);

module.exports = Fees;
