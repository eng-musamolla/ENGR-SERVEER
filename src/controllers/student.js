const axios = require('axios');
const Student = require('../models/student');
const ExamRoutine = require('../models/adKey');

const imgUploadURL = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;

const addNewStudent = async (req, res) => {

    const existingStudent = await Student.findOne({ Index: req.body.Index });
    if (existingStudent) {
        return res.status(400).send('A student with this index already exists.');
    }
    try {
        const student = new Student(req.body);
        if (req.file) {
            const formData = new FormData();
            formData.append('image', req.file.buffer.toString('base64'));

            axios.post(`${imgUploadURL}`, formData)
                .then(async (response) => {
                    student.StudentPhotoURL = response.data?.data?.display_url;
                    student.StudentPhotoDeleteURL = response.data?.data?.delete_url;
                    const result = await student.save();
                    return res.status(201).json(result);
                })
        }
        else {
            const result = await student.save();
            return res.status(201).json(result);
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const EditStudent = async (req, res) => {

    const body = req.body;
    const student = await Student.findById(req.params.id);
    const { StudentPhotoURL, StudentPhotoDeleteURL } = student;

    if (req.file) {
        const formData = new FormData();
        formData.append('image', req.file.buffer.toString('base64'));

        axios.post(`${imgUploadURL}`, formData)
            .then(async (response) => {
                student.set(body);
                student.StudentPhotoURL = response.data?.data?.display_url;
                student.StudentPhotoDeleteURL = response.data?.data?.delete_url;
                const result = await student.save();
                return res.status(201).json(result);
            }).catch((error) => {
                res.status(500).json({ message: error.message });
            });

    }
    else {
        student.set(body);
        student.StudentPhotoURL = StudentPhotoURL;
        student.StudentPhotoDeleteURL = StudentPhotoDeleteURL;
        const result = await student.save();
        return res.status(201).json(result);
    }

};



const getAllStudents = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const StudentOf = req.query.StudentOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;
    const Gender = req.query.Gender;

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
        searchQuery.StudentOf = StudentOf === "School" ? "Charupath Hateykhari School (CHS)" : (StudentOf === "Coaching" ? "Charupath Academic Coaching" : StudentOf);
    }


    const query = {};

    if (StudentOf) {
        query.StudentOf = StudentOf === "School" ? "Charupath Hateykhari School (CHS)" : (StudentOf === "Coaching" ? "Charupath Academic Coaching" : StudentOf);
    }
    if (Branch) {
        query.Branch = Branch;
    }

    if (Class) {
        query.Class = Class;
    }

    if (Version) {
        query.Version = Version;
    }
    if (Shift) {
        query.Shift = Shift;
    }
    if (Gender) {
        query.Gender = Gender;
    }

    if (Batch) {
        query.Batch = Batch;
    }

    try {
        let searchStudents = [];
        let searchTotal = 0;
        if (Object.keys(searchQuery).length > 0) {
            searchStudents = await Student.aggregate([
                { $match: searchQuery },
                {
                    $addFields: {
                        lastThreeDigits: {
                            $toInt: {
                                $substr: [
                                    "$StudentId",
                                    { $subtract: [{ $strLenCP: "$StudentId" }, 3] },
                                    3
                                ]
                            }
                        }
                    }
                },
                { $sort: { lastThreeDigits: 1 } },
                { $skip: page * size },
                { $limit: size }
            ]).exec();
            searchTotal = await Student.countDocuments(searchQuery);
        }


        const classOrder = [
            "Pre-Play",
            "Play",
            "Nursery",
            "KG",
            "One",
            "Two",
            "Three",
            "Four",
            "Five",
            "Six",
            "Seven",
            "Eight",
            "Nine",
            "Ten"
        ];

        const combinedAggregate = await Student.aggregate([
            { $match: query }, // Match documents based on the query
            {
                $facet: {
                    categories: [
                        {
                            $group: {
                                _id: null,
                                Class: { $addToSet: "$Class" },
                                Version: { $addToSet: "$Version" },
                                Batch: { $addToSet: "$Batch" },
                                Shift: { $addToSet: "$Shift" },
                                Gender: { $addToSet: "$Gender" }
                            }
                        },
                        {
                            $addFields: {
                                Class: {
                                    $filter: {
                                        input: {
                                            $map: {
                                                input: classOrder,
                                                as: "order",
                                                in: {
                                                    $cond: [
                                                        { $in: ["$$order", "$Class"] },
                                                        "$$order",
                                                        null
                                                    ]
                                                }
                                            }
                                        },
                                        as: "class",
                                        cond: { $ne: ["$$class", null] }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                Class: 1,
                                Version: 1,
                                Batch: 1,
                                Shift: 1,
                                Gender: 1,
                                _id: 0
                            }
                        }
                    ],
                    students: [
                        { $addFields: { Index: "$Index" } },
                        { $sort: { Index: 1 } },
                        { $skip: page * size },
                        { $limit: size }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ]).exec();

        const category = combinedAggregate[0].categories;
        const students = combinedAggregate[0].students;
        const total = combinedAggregate[0].totalCount[0] ? combinedAggregate[0].totalCount[0].total : 0;




        if (searchTotal > 0) {
            return res.json({ students: searchStudents, total: searchTotal });
        } else {
            res.json({ total, category, students });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getAllAdmits = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const StudentOf = req.query.StudentOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;
    const Gender = req.query.Gender;

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
        searchQuery.StudentOf = StudentOf === "School" ? "Charupath Hateykhari School (CHS)" : (StudentOf === "Coaching" ? "Charupath Academic Coaching" : StudentOf);
    }


    const query = {};

    if (StudentOf) {
        query.StudentOf = StudentOf === "School" ? "Charupath Hateykhari School (CHS)" : (StudentOf === "Coaching" ? "Charupath Academic Coaching" : StudentOf);
    }
    if (Branch) {
        query.Branch = Branch;
    }

    if (Class) {
        query.Class = Class;
    }

    if (Version) {
        query.Version = Version;
    }
    if (Shift) {
        query.Shift = Shift;
    }
    if (Gender) {
        query.Gender = Gender;
    }

    if (Batch) {
        query.Batch = Batch;
    }

    try {
        let searchStudents = [];
        let searchTotal = 0;
        if (Object.keys(searchQuery).length > 0) {
            searchStudents = await Student.aggregate([
                { $match: searchQuery },
                {
                    $addFields: {
                        lastThreeDigits: {
                            $toInt: {
                                $substr: [
                                    "$StudentId",
                                    { $subtract: [{ $strLenCP: "$StudentId" }, 3] },
                                    3
                                ]
                            }
                        }
                    }
                },
                { $sort: { lastThreeDigits: 1 } },
                { $skip: page * size },
                { $limit: size }
            ]).exec();
            searchTotal = await Student.countDocuments(searchQuery);
        }


        const classOrder = [
            "Pre-Play",
            "Play",
            "Nursery",
            "KG",
            "One",
            "Two",
            "Three",
            "Four",
            "Five",
            "Six",
            "Seven",
            "Eight",
            "Nine",
            "Ten"
        ];

        const combinedAggregate = await Student.aggregate([
            { $match: query }, // Match documents based on the query
            {
                $facet: {
                    // categories: [
                    //     {
                    //         $group: {
                    //             _id: null,
                    //             Class: { $addToSet: "$Class" },
                    //             Version: { $addToSet: "$Version" },
                    //             Batch: { $addToSet: "$Batch" },
                    //             Shift: { $addToSet: "$Shift" },
                    //             Gender: { $addToSet: "$Gender" }
                    //         }
                    //     },
                    //     {
                    //         $addFields: {
                    //             Class: {
                    //                 $filter: {
                    //                     input: {
                    //                         $map: {
                    //                             input: classOrder,
                    //                             as: "order",
                    //                             in: {
                    //                                 $cond: [
                    //                                     { $in: ["$$order", "$Class"] },
                    //                                     "$$order",
                    //                                     null
                    //                                 ]
                    //                             }
                    //                         }
                    //                     },
                    //                     as: "class",
                    //                     cond: { $ne: ["$$class", null] }
                    //                 }
                    //             }
                    //         }
                    //     },
                    //     {
                    //         $project: {
                    //             Class: 1,
                    //             Version: 1,
                    //             Batch: 1,
                    //             Shift: 1,
                    //             Gender: 1,
                    //             _id: 0
                    //         }
                    //     }
                    // ],
                    students: [
                        // { $lookup: { from: "examroutines", localField: "Class", foreignField: "Class", as: "Routine" } },
                        {
                            $lookup: {
                                from: "examroutines",
                                let: { localBranch: "$Branch", localClass: "$Class", localVersion: "$Version", localShift: "$Shift" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$Branch", "$$localBranch"] },
                                                    { $in: ["$$localClass", "$Class"] },
                                                    { $in: ["$$localVersion", "$Version"] },
                                                    { $in: ["$$localShift", "$Shift"] },

                                                    // 
                                                    // { $in: ["$$localClass", "$Class"] },
                                                    // { $in: ["$$localClass", "$Class"] },
                                                    // { $in: ["$$localClass", "$Class"] },
                                                    // { $eq: ["$Version", "$$localVersion"] },
                                                    // { $eq: ["$Shift", "$$localShift"] },

                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: "routine"
                            }
                        },
                        // {
                        //     $project: {
                        //         _id: 1,
                        //         StudentName: 1,
                        //         Class: 1,
                        //         Index: 1,
                        //         Shift: 1,
                        //         Version: 1,
                        //         SMSNumber: 1,
                        //         StudentPhotoURL: 1,
                        //     }

                        // },
                        { $addFields: { Index: "$Index" } },
                        { $sort: { Index: 1 } },
                        { $skip: page * size },
                        { $limit: size }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ],
                }
            }
        ]).exec();


        // const category = combinedAggregate[0].categories;
        const students = combinedAggregate[0].students;
        const total = combinedAggregate[0].totalCount[0] ? combinedAggregate[0].totalCount[0].total : 0;




        if (searchTotal > 0) {
            return res.json({ students: searchStudents, total: searchTotal });
        } else {
            res.json({ total, students });
        }


    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const verify = async (req, res) => {
    const { Index, Id, Admit, search } = req.query;

    const query = {};
    if (Index || Id || Admit) {
        query.Index = Index;
    }


    if (search) {
        query.$or = [
            { Index: value },
            { SMSNumber: value },
            { FathersMobileNumber: value },
            { MothersMobileNumber: value }
        ];
    }

    try {
        const result = await Student.findOne(query).exec();
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: "No student found" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const IdVerification = async (req, res) => {
    const StudentOf = req.query.StudentOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;
    const Batch = req.query.Batch;


    const query = {};

    if (StudentOf && Branch && Class && Version) {
        query.StudentOf = StudentOf === "School" ? "Charupath Hateykhari School (CHS)" : (StudentOf === "Coaching" ? "Charupath Academic Coaching" : null);
        query.Branch = Branch;
        query.Class = Class;
        query.Version = Version;
        if (Shift) {
            query.Shift = Shift;
        }
    }

    const idString = {
        "Rupnagar": "1",
        "Pallabi": "2",

        "Pre-Play": "01",
        "Play": "02",
        "Nursery": "03",
        "KG": "04",
        "One": "05",
        "Two": "06",
        "Three": "07",
        "Four": "08",
        "Five": "09",
        "Six": "10",
        "Seven": "11",
        "Eight": "12",
        "Nine": "13",
        "Ten": "14",

        "বাংলা মাধ্যম": "1",
        "English Version": "2",

        "MORNING": "1",
        "SPECIAL": "2",
        "DAY": "3",
    }

    let sortId = '';
    let queryKeys = Object.values(query);
    for (let i = 0; i < queryKeys.length; i++) {
        if (idString[queryKeys[i]] !== undefined) {
            sortId += idString[queryKeys[i]];
        }
    }

    if (!Shift) {
        sortId += "4";
    }
    try {
        if (Object.keys(query).length === 0) {
            return res.status(400).json({ message: 'Please provide all the required fields' });
        }
        const year = new Date().getMonth() >= 9 ? (new Date().getFullYear() + 1).toString().substr(-2) : new Date().getFullYear().toString().substr(-2);

        const total = await Student.countDocuments(query);
        // const Index = (query.Class[0] + query.Class[1] + versionValue + query.Shift[0] + "-" + (total + 1).toString()).toUpperCase();
        const StudentId = year + sortId + (total + 1).toString().padStart(3, '0');
        res.json({ total, StudentId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const DeleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Student.deleteOne({ _id: id });
        if (result.deletedCount === 1) {
            res.status(200).json({ message: `Student with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: `Student with ID ${id} not found` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



module.exports = {
    addNewStudent,
    EditStudent,
    getAllStudents,
    getAllAdmits,
    verify,
    IdVerification,
    DeleteStudent,
};