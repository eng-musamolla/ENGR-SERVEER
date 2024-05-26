const axios = require('axios');
const Employee = require('../models/employee');

const imgUploadURL = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;

const addNewEmployee = async (req, res) => {

    const existingEmployee = await Employee.findOne({ nid: req.body.nid });
    if (existingEmployee) {
        return res.status(201).json({ message: { err: "Employee with this NID already exists" } });
    }
    try {
        const employee = new Employee(req.body);
        if (req.file) {
            const formData = new FormData();
            formData.append('image', req.file.buffer.toString('base64'));

            axios.post(`${imgUploadURL}`, formData)
                .then(async (response) => {
                    employee.photoURL = response.data?.data?.display_url;
                    employee.photoDeleteURL = response.data?.data?.delete_url;
                    const result = await employee.save();
                    return res.status(201).json(result);
                })
        }
        else {
            const result = await employee.save();
            return res.status(201).json(result);
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const EditEmployee = async (req, res) => {

    const body = req.body;
    const employee = await Employee.findById(req.params.id);
    const { photoURL, photoDeleteURL } = employee;

    if (req.file) {
        const formData = new FormData();
        formData.append('image', req.file.buffer.toString('base64'));

        axios.post(`${imgUploadURL}`, formData)
            .then(async (response) => {
                employee.set(body);
                employee.photoURL = response.data?.data?.display_url;
                employee.photoDeleteURL = response.data?.data?.delete_url;
                const result = await employee.save();
                return res.status(201).json(result);
            }).catch((error) => {
                res.status(500).json({ message: error.message });
            });

    }
    else {
        employee.set(body);
        employee.photoURL = photoURL;
        employee.photoDeleteURL = photoDeleteURL;
        const result = await employee.save();
        return res.status(201).json(result);
    }

};



const getAllEmployees = async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const EmployeeOf = req.query.EmployeeOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;
    const Gender = req.query.Gender;

    // Bach for choaching only
    const Batch = req.query.Batch;

    // Start Search by PhoneNumber, EmployeeId, EmployeeName and Index
    const value = req.query.search || "";

    let EmployeeId = '';
    let PhoneNumber = '';
    let NameIndex = '';
    if (!isNaN(Number(value)) && value.length === 10) {
        EmployeeId = value;
    }
    else if (!isNaN(Number(value)) && value.length === 11) {
        PhoneNumber = value;
    } else if (isNaN(Number(value)) && value.length > 3 && value.length <= 40) {
        NameIndex = value;
    }

    const searchQuery = {};
    if (EmployeeId) {
        searchQuery.EmployeeId = EmployeeId;
    } else if (PhoneNumber) {
        searchQuery.SMSNumber = PhoneNumber;
    } else if (NameIndex) {
        searchQuery.$or = [
            { EmployeeName: NameIndex },
            { Index: NameIndex }
        ]
    }


    if (EmployeeId || PhoneNumber || NameIndex) {
        searchQuery.EmployeeOf = EmployeeOf === "School" ? "Charupath Hateykhari School (CHS)" : (EmployeeOf === "Coaching" ? "Charupath Academic Coaching" : EmployeeOf);
    }


    const query = {};

    if (EmployeeOf) {
        query.EmployeeOf = EmployeeOf === "School" ? "Charupath Hateykhari School (CHS)" : (EmployeeOf === "Coaching" ? "Charupath Academic Coaching" : EmployeeOf);
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
        let searchEmployees = [];
        let searchTotal = 0;
        if (Object.keys(searchQuery).length > 0) {
            searchEmployees = await Employee.aggregate([
                { $match: searchQuery },
                {
                    $addFields: {
                        lastThreeDigits: {
                            $toInt: {
                                $substr: [
                                    "$EmployeeId",
                                    { $subtract: [{ $strLenCP: "$EmployeeId" }, 3] },
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
            searchTotal = await Employee.countDocuments(searchQuery);
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

        const combinedAggregate = await Employee.aggregate([
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
                    Employees: [
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
        const Employees = combinedAggregate[0].Employees;
        const total = combinedAggregate[0].totalCount[0] ? combinedAggregate[0].totalCount[0].total : 0;




        if (searchTotal > 0) {
            return res.json({ Employees: searchEmployees, total: searchTotal });
        } else {
            res.json({ total, category, Employees });
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
        const result = await Employee.findOne(query).exec();
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: "No Employee found" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const IdVerification = async (req, res) => {
    const EmployeeOf = req.query.EmployeeOf;
    const Branch = req.query.Branch;
    const Class = req.query.Class;
    const Version = req.query.Version;
    const Shift = req.query.Shift;
    const Batch = req.query.Batch;


    const query = {};

    if (EmployeeOf && Branch && Class && Version) {
        query.EmployeeOf = EmployeeOf === "School" ? "Charupath Hateykhari School (CHS)" : (EmployeeOf === "Coaching" ? "Charupath Academic Coaching" : null);
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

        const total = await Employee.countDocuments(query);
        // const Index = (query.Class[0] + query.Class[1] + versionValue + query.Shift[0] + "-" + (total + 1).toString()).toUpperCase();
        const EmployeeId = year + sortId + (total + 1).toString().padStart(3, '0');
        res.json({ total, EmployeeId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const DeleteEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Employee.deleteOne({ _id: id });
        if (result.deletedCount === 1) {
            res.status(200).json({ message: `Employee with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: `Employee with ID ${id} not found` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



module.exports = {
    addNewEmployee,
    EditEmployee,
    getAllEmployees,
    verify,
    IdVerification,
    DeleteEmployee
};