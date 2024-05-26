const mongoose = require('mongoose');

// Define the student schema with a reference to the receipt schema
const studentSchema = new mongoose.Schema({
    StudentId: { type: String, uppercase: true },
    StudentName: { type: String, required: true, uppercase: true },
    StudentNameBangla: { type: String },
    StudentPhotoURL: { type: String },
    StudentPhotoDeleteURL: { type: String },
    StudentPhotoDeleteURL: { type: String },
    StudentOf: { type: String, required: true },
    Branch: { type: String, required: true },
    Version: { type: String, required: true },
    Class: { type: String, required: true },
    Index: { type: String, required: true },
    Shift: { type: String },
    Gender: { type: String, required: true },
    DateOfBirth: { type: Date },
    PresentAddress: { type: String, required: true },
    PermanentAddress: { type: String },
    FathersName: { type: String, required: true }, //must be change on form 
    FathersProfession: { type: String },
    FathersMobileNumber: { type: String },
    MothersName: { type: String, required: true },
    MothersProfession: { type: String },
    MothersMobileNumber: { type: String },
    SMSNumber: { type: String, require: true },
    MonthlyTutionFee: { type: Number, required: true },
    // For Choching Student
    Batch: { type: String },
    NameOfSchool: { type: String },
    RollNumberSchool: { type: String },
    // For School Student

}, { timestamps: true });


const Student = mongoose.model('students', studentSchema);

module.exports = Student;