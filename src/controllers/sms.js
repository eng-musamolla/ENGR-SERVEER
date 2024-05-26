const Student = require('../models/student');
const axios = require('axios');
const moment = require('moment-timezone');
require('dotenv').config();


const getSMS = async (req, res) => {
    const page = req.query;

    const StudentOf = req.query.StudentOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;

    // Bach for choaching only
    const Batch = req.query.Batch;

    // Start Search by PhoneNumber, StudentId, StudentName and Index
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

    if (StudentId || PhoneNumber || NameIndex) {
        searchQuery.StudentOf = StudentOf;
    }


    const query = {};

    if (StudentOf) {
        query.StudentOf = StudentOf;
    }
    if (Branch && Branch !== "All") {
        query.Branch = Branch;
    }

    if (Class && Class !== "All") {
        query.Class = Class;
    }

    if (Version && Version !== "All") {
        query.Version = Version;
    }
    if (Shift && Shift !== "All") {
        query.Shift = Shift;
    }

    if (Batch && Batch !== "All") {
        query.Batch = Batch;
    }


    try {
        const balance = await axios.get(`https://panel2.smsbangladesh.com/balance?user=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}`);

        const smsBalance = parseFloat(balance.data['AVAILABLE BALANCE =']).toFixed(2);
        let searchStudents = [];
        let searchTotal = 0;
        if (Object.keys(searchQuery).length > 0) {
            searchTotal = await Student.countDocuments(searchQuery);
        }
        const total = await Student.countDocuments(query);

        if (searchTotal > 0) {
            return res.json({ smsBalance, total: searchTotal });
        } else {
            res.json({ smsBalance, total });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const sendSMS = async (req, res) => {

    const data = req.body.data;
    const filter = req.body.filter;
    const Search = req.body.search;

    const StudentOf = filter.StudentOf;
    const Branch = filter.branch;
    const Class = filter.class;
    const Version = filter.version;
    const Shift = filter.shift;

    // Bach for choaching only
    const Batch = filter.Batch;

    // Start Search by PhoneNumber, StudentId, StudentName and Index
    const value = req.query.Search || "";

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



    if (StudentId || PhoneNumber || NameIndex) {
        searchQuery.StudentOf = StudentOf;
    }


    const query = {};

    if (StudentOf) {
        query.StudentOf = StudentOf;
    }
    if (Branch && Branch !== "All") {
        query.Branch = Branch;
    }

    if (Class && Class !== "All") {
        query.Class = Class;
    }

    if (Version && Version !== "All") {
        query.Version = Version;
    }
    if (Shift && Shift !== "All") {
        query.Shift = Shift;
    }

    if (Batch && Batch !== "All") {
        query.Batch = Batch;
    }


    try {
        let searchStudents = [];
        if (Object.keys(searchQuery).length > 0) {
            searchStudents = await Student.aggregate([
                { $match: searchQuery },
                {
                    $group: {
                        _id: null,
                        smsNumbers: { $push: "$SMSNumber" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        smsNumbers: 1
                    }
                }
            ]).exec();
        }

        const students = await Student.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    smsNumbers: { $push: "$SMSNumber" }
                }
            },
            {
                $project: {
                    _id: 0,
                    smsNumbers: 1
                }
            }
        ]).exec();

        const totalNumber = students[0].smsNumbers

        const from = req.body.data.from;
        const to = totalNumber;
        const text = req.body.data.message;

        const url = `https://panel2.smsbangladesh.com/api?user=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}${from ? `&from=${process.env.MASKING_NAME}&` : "&"}to=${to}&text=${text}`;
        try {
            const response = await axios.get(url);
            res.json(response.data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }

}

module.exports = {
    getSMS,
    sendSMS
};