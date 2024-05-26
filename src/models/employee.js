const mongoose = require('mongoose');

// Define the employee schema with a reference to the receipt schema
const employeeSchema = new mongoose.Schema({
    EmployeeOf: { type: String, default: 'Charupath Hateykhari School (CHS)' },
    fullName: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    nid: { type: String },
    gender: { type: String },
    bloodGroup: { type: String },
    dob: { type: Date },
    maritalStatus: { type: String },
    presentAddress: { type: String },
    permanentAddress: { type: String },
    // ImageFile: { type: String },
    photoURL: { type: String },
    photoDeleteURL: { type: String },

    // Emergency Contact
    emergencyName: { type: String },
    emergencyRelationship: { type: String },
    emergencyPhoneNumber: { type: String },
    emergencyAddress: { type: String },

    // Employment Details
    jobTitle: { type: String },
    branch: { type: String },
    hireDate: { type: Date },
    supervisor: { type: String },
    employmentType: { type: String },
    salary: { type: Number },

    // Bank Account Information
    bankName: { type: String },
    accountNumber: { type: String },
    bankBranch: { type: String },
    routingCode: { type: String },

    // Additional Information
    education: { type: String },
    skills: { type: String },
    languages: { type: String },

}, { timestamps: true });


const Employee = mongoose.model('employee', employeeSchema);

module.exports = Employee;