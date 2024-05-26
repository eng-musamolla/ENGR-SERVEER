// const express = require('express');
const Student = require('../models/student');
const moment = require('moment-timezone');
const Fees = require('../models/fees');

const dashboardPage = async (req, res) => {
    const { startDate, endDate, FeeMonth, StudentOf, Branch, ReceivedBy } = req.query;
    // console.log("req.query..", req.query)
    const FormatStartDate = startDate ? moment(startDate).add(0, 'hours').toDate() : moment().add(0, 'hours').toDate();
    const FormatEndDate = startDate ? moment(endDate).add(0, 'hours').toDate() : moment().add(0, 'hours').toDate();
    const BranchValue = Branch ? Branch : "Rupnagar";
    const StudentOFValue = StudentOf ? StudentOf : "Charupath Hateykhari School (CHS)";
    const FeeMonthValue = FeeMonth ? FeeMonth : moment().format('MMMM YYYY');

    const startMonth = moment(FeeMonthValue, 'MMMM YYYY').startOf('month').startOf('day').toDate();
    const endMonth = moment(FeeMonthValue, 'MMMM YYYY').endOf('month').toDate();

    // const ReceivedByValue = ReceivedBy ? ReceivedBy : "Musa Molla (Musa)";
    const ReceivedByValue = ReceivedBy ? ReceivedBy : "Account Section";

    let start = moment(FormatStartDate).startOf('day').toDate();
    let end = moment(FormatEndDate).endOf('day').toDate();

    try {
        const EstimateDueInMonth = await Student.aggregate([
            {
                $lookup: {
                    from: 'fees',
                    localField: '_id',
                    foreignField: 'MId',
                    as: 'fees'
                }
            },
            {
                $match: {
                    $or: [
                        { fees: { $exists: false } },
                        {
                            "StudentOf": StudentOFValue,
                            'Branch': BranchValue,
                            'fees.Fees.FeeMonth': { $ne: FeeMonthValue },
                        },
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalStudent: { $sum: 1 },
                    TotalMonthlyTutionFee: { $sum: '$MonthlyTutionFee' }
                }
            }
        ]);

        const StudentsCharts = await Student.aggregate([{
            "$match": {
                "StudentOf": {
                    "$in": [
                        StudentOFValue
                    ]
                },
                "Branch": {
                    "$in": [
                        BranchValue
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "__alias_0": "$Class",
                    "__alias_1": "$Gender"
                },
                "__alias_2": {
                    "$sum": 1
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "__alias_0": "$_id.__alias_0",
                "__alias_1": "$_id.__alias_1",
                "__alias_2": 1
            }
        },
        {
            "$project": {
                "Class": "$__alias_0",
                "Students": "$__alias_2",
                "Gender": "$__alias_1",
                "_id": 0
            }
        },
        {
            "$addFields": {
                "__agg_sum": {
                    "$sum": [
                        "$Students"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "Class": "$Class"
                },
                "__grouped_docs": {
                    "$push": "$$ROOT"
                },
                "__agg_sum": {
                    "$sum": "$__agg_sum"
                }
            }
        },
        {
            "$sort": {
                "__agg_sum": -1
            }
        },
        {
            "$unwind": "$__grouped_docs"
        },
        {
            "$replaceRoot": {
                "newRoot": "$__grouped_docs"
            }
        },
        {
            "$project": {
                "__agg_sum": 0
            }
        },
        {
            "$limit": 5000
        }]);

        const CollectedTutionFeesOfMonth = await Fees.aggregate([
            {
                $match: {
                    "StudentOf": StudentOFValue,
                    'Branch': BranchValue,
                    'ReceivedBy': ReceivedByValue,
                    'Fees.FeeMonth': { "$in": [FeeMonthValue] },
                }
            },
            {
                $addFields: {
                    "NormalizedMonthlyTutionFee": {
                        $divide: ["$Fees.MonthlyTutionFee", { $size: "$Fees.FeeMonth" }]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStudents: { $addToSet: '$MId' },
                    TotalMonthlyTutionFee: { $sum: '$NormalizedMonthlyTutionFee' },
                }
            },
            {
                $project: {
                    _id: 0,
                    totalStudents: { $size: '$totalStudents' },
                    TotalMonthlyTutionFee: 1
                }
            }
        ]);

        const CollectedOthersFeesOfMonth = await Fees.aggregate([
            {
                $match: {
                    "StudentOf": StudentOFValue,
                    'Branch': BranchValue,
                    'ReceivedBy': ReceivedByValue,
                    "Fees.Date": {
                        $gte: startMonth,
                        $lte: endMonth
                    },
                    $or: [
                        { 'Fees.AdmissionFee': { $gt: 0 } },
                        { 'Fees.FormFee': { $gt: 0 } },
                        { 'Fees.IDFee': { $gt: 0 } },
                        { 'Fees.ModelTestFee': { $gt: 0 } }
                    ],
                }
            },

            {
                $group: {
                    _id: null,
                    totalStudents: { $addToSet: '$MId' },
                    TotalCollection: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$Fees.AdmissionFee', 0] },
                                { $ifNull: ['$Fees.FormFee', 0] },
                                { $ifNull: ['$Fees.IDFee', 0] },
                                { $ifNull: ['$Fees.ModelTestFee', 0] }
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    totalStudents: { $size: '$totalStudents' },
                    TotalCollection: 1
                }
            }
        ]);

        const CollectedFess = await Fees.aggregate([
            {
                $match: {
                    "StudentOf": StudentOFValue,
                    'Branch': BranchValue,
                    'ReceivedBy': ReceivedByValue,
                    "Fees.Date": {
                        $gte: start,
                        $lte: end
                    },
                }
            },
            {
                $group: {
                    _id: null,
                    totalInvoice: { $sum: 1 },
                    totalStudents: { $addToSet: '$MId' },
                    TotalCollection: { $sum: '$Fees.Total' }
                }
            },
            {
                $project: {
                    totalInvoice: 1,
                    totalStudents: { $size: '$totalStudents' },
                    TotalCollection: 1
                }
            }]);


        const queryData = {
            startDate: start,
            endDate: end,
            FeeMonth: FeeMonthValue,
            StudentOf: StudentOFValue,
            Branch: BranchValue,
            ReceivedBy: ReceivedByValue,
        };
        // console.log("queryData", queryData);

        const studentSchema = {
            EstimateDueInMonth,
            CollectedTutionFeesOfMonth,
            CollectedOthersFeesOfMonth,
            CollectedFess,
            StudentsCharts,
        };

        res.json({ queryData, studentSchema });
    } catch (err) {
        console.error('Error processing due fees:', err);
        res.status(500).json({ message: err.message });
    }
}

module.exports = {
    dashboardPage
};