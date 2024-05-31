const express = require('express');
const routes = express.Router();

const key = require('../controllers/Key');
const employee = require('../controllers/employee');
const sms = require('../controllers/sms');
const authLogin = require('../controllers/auth/middlewares/authLogin');

// Multer for file upload (if needed)
const multer = require('multer');
const storage = multer.memoryStorage(); // You can change this to a disk storage if needed
const upload = multer({ storage });


// Auth Middleware
const authVerify = require('../controllers/auth/middlewares/authVerify');
const ImageFile = upload.single('ImageFile');


// Auth Routes
routes.post('/key', key.adKey);
routes.get('/keys', key.getAllKeys);
routes.delete('/key', key.deleteKey);


// Employee Routes
routes.post('/employee', authVerify, ImageFile, employee.addNewEmployee);
routes.put('/employee/:id', authVerify, ImageFile, employee.EditEmployee);
routes.get('/employees', authVerify, employee.getAllEmployees);
routes.get('/verify', authVerify, employee.verify);
routes.get('/IdVerification', authVerify, employee.IdVerification);
routes.delete('/employee/:id', authVerify, employee.DeleteEmployee);

// SMS Routes
routes.get('/sms', authVerify, sms.getSMS);
routes.post('/sms/send', authVerify, sms.sendSMS);



module.exports = routes;
