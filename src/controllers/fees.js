const Student = require('../models/student');
const Fees = require('../models/fees');
const DueFees = require('../models/due-fees');
const axios = require('axios');
const moment = require('moment-timezone');
require('dotenv').config();


const addStudentFees = async (req, res) => {
    const reqBody = req.body;

    const duplicate = await Fees.findOne({
        MId: reqBody.MId,
        'Fees.FeeMonth': reqBody.Fees.FeeMonth,
        'Fees.AdmissionFee': reqBody.Fees.AdmissionFee,
        'Fees.FormFee': reqBody.Fees.FormFee,
        'Fees.IDFee': reqBody.Fees.IDFee,
        'Fees.MonthlyTutionFee': reqBody.Fees.MonthlyTutionFee,
        'Fees.ModelTestFee': reqBody.Fees.ModelTestFee,
        'Fees.Total': reqBody.Fees.Total,
    });
    if (duplicate) {
        return res.status(400).json({
            message: 'Duplicate entry found.'
        });
    }


    try {

        const date = new Date();
        reqBody.Fees.Date = date;
        const total = await Fees.countDocuments();
        const options = { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Dhaka' };
        const options2 = { day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Dhaka' };
        const timestamp = new Date().toLocaleString('en-US', options).replace(/:/g, '').replace(/\s/g, '');
        const formattedDate = date.toLocaleDateString('en-US', options2);
        const invoiceNumber = `${total + 1}-${timestamp}`.replace(/PM|AM/g, '');
        reqBody.InvoiceNumber = invoiceNumber;
        const fees = new Fees(reqBody);
        const result = await fees.save();

        const SMSdetails = await DueFees.findOne();
        const smsStatus = SMSdetails.CollectFeesSMS_Status; // Enable this if you want to send SMS
        const Masking = SMSdetails.Masking; // Enable this if you want to send SMS with masking
        if (smsStatus) {
            const { SMSNumber } = await Student.findById(reqBody.MId);
            const text = `Payment of BDT ${parseFloat(result.Fees.Total).toFixed(2)} against  ${result.StudentName.length > 25 ? result.StudentName.split(' ').slice(0, 2).join(' ') : result.StudentName} (ID-${result.StudentId}) has been received on ${formattedDate}.\nReceipt No: ${invoiceNumber}\n\nSincerely,\nchs.ac.bd`;
            // console.log("TextLength", text.length);
            const url = `https://panel2.smsbangladesh.com/api?user=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}${Masking ? `&from=${process.env.MASKING_NAME}&` : "&"}to=${SMSNumber}&text=${encodeURIComponent(text)}`;
            try {
                res.status(201).json(result);
                await axios.get(url);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        } else {
            res.status(201).json(result);
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

const getSingleStudentFees = async (req, res) => {

    const value = req.query.search || "";

    let StudentId = '';
    let PhoneNumber = '';
    let NameIndex = '';
    if (!isNaN(Number(value)) && value.length === 10) {
        StudentId = value;
    }
    else if (!isNaN(Number(value)) && value.length === 11) {
        PhoneNumber = value;
    } else if (isNaN(Number(value)) && value.length > 3 && value.length <= 40) {
        NameIndex = value;
    }

    const searchQuery = {};
    if (StudentId) {
        searchQuery.StudentId = StudentId;
    } else if (PhoneNumber) {
        searchQuery.$or = [
            { SMSNumber: PhoneNumber },
            { FathersMobileNumber: PhoneNumber },
            { MothersMobileNumber: PhoneNumber }
        ];
    } else if (NameIndex) {
        searchQuery.$or = [
            { StudentName: NameIndex },
            { Index: NameIndex }
        ]
    }

    try {
        // const currentYear = new Date().getFullYear(); // Get the current year

        const studentsWithPaidAndRemainingFee = await Student.aggregate([
            {
                $match: { ...searchQuery }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "fees",
                    localField: "_id",
                    foreignField: "MId",
                    as: "fees"
                }
            },
            {
                $addFields: {
                    paidFeeMonth: {
                        $reduce: {
                            input: "$fees.Fees.FeeMonth",
                            initialValue: [],
                            in: {
                                $concatArrays: ["$$value", "$$this"]
                            }
                        }
                    },
                    TotalDeposit: { $sum: "$fees.Fees.Total" }
                }
            },
            {
                $project: {
                    StudentId: 1,
                    StudentName: 1,
                    StudentNameBangla: 1,
                    StudentPhotoURL: 1,
                    StudentPhotoDeleteURL: 1,
                    StudentOf: 1,
                    Branch: 1,
                    Version: 1,
                    Class: 1,
                    Index: 1,
                    Shift: 1,
                    Gender: 1,
                    DateOfBirth: 1,
                    PresentAddress: 1,
                    PermanentAddress: 1,
                    FathersName: 1,
                    FathersProfession: 1,
                    FathersMobileNumber: 1,
                    MothersName: 1,
                    MothersProfession: 1,
                    MothersMobileNumber: 1,
                    SMSNumber: 1,
                    MonthlyTutionFee: 1,
                    Batch: 1,
                    NameOfSchool: 1,
                    RollNumberSchool: 1,
                    TotalDeposit: 1,

                    remainingFeeMonth: {
                        $setDifference: [
                            Array.from({ length: 12 }, (_, i) => moment().month(i).format('MMMM YYYY')),
                            "$paidFeeMonth"

                        ]
                    }
                }
            }
        ]);

        res.json(studentsWithPaidAndRemainingFee);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const getAllStudentsFees = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const value = req.query.search;

    const searchQuery = {};
    if (value) {
        searchQuery.$or = [
            { InvoiceNumber: value },
            { StudentId: value },
            { StudentName: value },
            { Index: value },
            { FathersMobileNumber: value },
            { MothersMobileNumber: value },
            { SMSNumber: value }
        ];
    }

    try {

        let searchFees = [];
        let searchTotal = 0;
        if (Object.keys(searchQuery).length > 0) {
            searchFees = await Fees.find(searchQuery).limit(size).skip(page * size).exec();
            searchFees = searchFees.map(fee => ({
                ...fee._doc,
                invoiceNumberNumeric: parseInt(fee.InvoiceNumber.split('-')[0])
            })).sort((a, b) => b.invoiceNumberNumeric - a.invoiceNumberNumeric);
            searchTotal = await Fees.countDocuments(searchQuery);
        }


        // const startDate = new Date("2024-02-03"); // Start date of the range
        // const endDate = new Date("2024-02-04");   // End date of the range
        // console.log({ startDate })
        // console.log({ endDate })

        const fees = await Fees.aggregate([
            { $sort: { "Fees.Date": -1 } },
            { $skip: page * size },
            { $limit: size }
        ]);


        const total = await Fees.countDocuments();

        if (searchTotal > 0) {
            return res.json({ fees: searchFees, total: searchTotal });
        } else {
            res.json({ total, fees });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const DeleteFees = async (req, res) => {
    const user = req.query.ReceivedBy;



    try {
        const result = await Fees.deleteMany({ ReceivedBy: user });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: `Total ${result.deletedCount} Fees deleted successfully` });
        } else {
            res.status(404).json({ error: `Fees not found` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}


module.exports = {
    addStudentFees,
    getSingleStudentFees,
    getAllStudentsFees,
    DeleteFees
};