// const express = require('express');
const Student = require('../models/student');
const ScheduleSMS = require('../models/scheduleSMS');
const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
require('dotenv').config();

const MonthlySMS = async (req, res) => {
    const { Masking, authToken } = req.query;
    if (authToken !== process.env.ACCESS_TOKEN_SECRET) {
        console.log("authToken:", req.query);
        console.log("authToken:", req);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const unpaidStudents = await Student.aggregate([
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
                    // StudentName: 1,
                    // Class: 1,
                    Branch: 1,
                    Index: 1,
                    SMSNumber: 1,
                    MonthlyTutionFee: 1,

                    remainingFeeMonth: {
                        $setDifference: [
                            Array.from({ length: moment().month() + 1 }, (_, i) => moment().month(i).format('MMMM YYYY')),
                            "$paidFeeMonth"
                        ]
                    }
                }
            },
            {
                $match: {
                    remainingFeeMonth: { $ne: [] },
                    Branch: "Rupnagar"
                }
            }
        ]);

        const month = moment().format('MMMM YYYY');
        const twentiethOfMonth = moment().date(20).format('DD MMMM YYYY');

        const smsURL = unpaidStudents?.map((student) => {
            // const StudentName = student.StudentName.length > 25 ? student.StudentName.split(' ').slice(0, 2).join(' ') : student.StudentName;
            const standardReminder = `Tuition for ${student.StudentName} (ID-${student.Index}) is due on ${twentiethOfMonth}. Amount: BDT ${parseFloat(student.MonthlyTutionFee * student.remainingFeeMonth.length).toFixed(2)}.\n\nSincerely,\nchs.ac.bd`;
            const Emercency = `আপনার সন্তানের ${parseFloat(student.MonthlyTutionFee * student.remainingFeeMonth.length).toFixed(2)} টাকা বকেয়া রয়েছে অনুগ্রহ করে ৩০ এপ্রিলের মধ্যে পরিশোধ করুন।\n\nআন্তরিকভাবে,\nchs.edu.bd`;
            const overdueReminder = `${student.StudentName}'s (ID-${student.Index}) tuition for ${student.remainingFeeMonth.join(', ')} is overdue. Please pay by ${twentiethOfMonth}. Amount: BDT ${parseFloat(student.MonthlyTutionFee * student.remainingFeeMonth.length).toFixed(2)}.\n\nSincerely,\nchs.ac.bd`;
            const overdueWithLateFeeWarning = `${student.StudentName}'s (ID-${student.Index}) tuition for ${student.remainingFeeMonth.join(', ')} is overdue (amount: BDT ${parseFloat(student.MonthlyTutionFee * student.remainingFeeMonth.length).toFixed(2)}). Please pay by ${twentiethOfMonth} to avoid late fees.\n\nSincerely,\nchs.ac.bd`;

            let text = '';
            if (student.remainingFeeMonth.length === 1) {
                text = standardReminder;
            } else if (student.remainingFeeMonth.length === 2) {
                text = overdueReminder;
            } else if (student.remainingFeeMonth.length >= 3) {
                text = overdueWithLateFeeWarning;
            }
            // console.log("message.length:", text.length);
            // console.log("message:", text);
            const url = `https://panel2.smsbangladesh.com/api?user=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}${Masking ? `&from=${process.env.MASKING_NAME}&` : "&"}to=${student.SMSNumber}&text=${encodeURIComponent(Emercency)}`;
            return { url, student };
        });

        // console.log("smsURL:", smsURL);

        let totalStudents = unpaidStudents?.length || 0;
        let success = 0;
        let failed = 0;
        let totalCampaignCost = 0;
        let failedSMS = [];
        let succeedSMS = [];

        // const smsPromises = [];
        const smsPromises = smsURL.map(async smsData => await axios.get(smsData.url));
        const responses = await Promise.all(smsPromises);

        responses.forEach((response, i) => {
            if (response.data.message === 'SMS send successfully.') {
                success += response.data.success;
                totalCampaignCost += response.data.campaign_cost;
                succeedSMS.push(smsURL[i].url.match(/ID-(\w+)/)[1]);
            } else {
                failed++;
                failedSMS.push(smsURL[i].url.match(/ID-(\w+)/)[1]);
            }
        });


        const scheduleSave = new ScheduleSMS({
            totalStudents, success, failed, totalCampaignCost, failedSMS, succeedSMS,
        });
        await scheduleSave.save();



        // // SMS BALANCE =৳2389.00
        // console.log("smsURL", smsURL[0].student);

        // const Emercency = `আপনার সন্তানের ${parseFloat(smsURL[0].student.MonthlyTutionFee * smsURL[0].student.remainingFeeMonth.length).toFixed(2)} টাকা বকেয়া রয়েছে অনুগ্রহ করে ৩০ এপ্রিলের মধ্যে পরিশোধ করুন।\n\nআন্তরিকভাবে,\nchs.edu.bd`;

        // const url = `https://panel2.smsbangladesh.com/api?user=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}${Masking ? `&from=${process.env.MASKING_NAME}&` : "&"}to=01629443131&text=${encodeURIComponent(Emercency)}`;

        // axios.get(url).then((response) => {
        //     console.log("response", response.data);
        // }).catch((error) => {
        //     console.log("error", error);
        // });




        // // console.log("scheduleSMS", mongoresponse);
        // console.log("scheduleSMS", schedulesmsreport);


        let transporter = nodemailer.createTransport({
            host: 'mail.chs.ac.bd', // replace with your SMTP host
            port: 465, // replace with your SMTP port
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USERNAME, // replace with your SMTP username
                pass: process.env.SMTP_PASSWORD // replace with your SMTP password
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: `"CHS SERVER" <${process.env.SMTP_USERNAME}>`, // sender address
            to: 'musamolla3131@gmail.com',
            // to: 'charupath01@gmail.com, eng.musamolla@gmail.com', // list of receivers
            subject: `SMS Report for ${month}`, // Subject line
            text: JSON.stringify({ totalStudents, success, failed, totalCampaignCost }), // plain text body
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                               <h2><strong>Total <span style="color: #f60;">${totalStudents}</span> Students Didn't Pay Fees for <span style="color: #f60;">${month}</span> or previous</strong></h2>
                               <hr>
                               <h4><strong>SMS Sending Succeed :</strong> <span style="color: #65c46b;">${success || 0}</span></h4>
                               <h4><strong>SMS Sending Failed :</strong> <span style="color: red;">${failed || 0}</span></h4>
                               <h4><strong>Total Campaign Cost:</strong> <span style="color: #f60;">BDT ${totalCampaignCost.toFixed(2) || 0}৳</span></h4>
                               <p><strong>SMS Sending Failed Regarding Student IDs:</strong> <span style="color: red;">[${failedSMS.join(', ')}]</span></p>
                               <p><strong>SMS Sending succeed Regarding Student IDs:</strong> [${succeedSMS.join(', ')}]</p>
                           </div>` // html body
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log({ error });
            }
            // console.log('Message sent: %s', info.messageId);
        });


        const SMSReport = await ScheduleSMS.find({}).sort({ createdAt: -1 }).limit(3);
        res.json(SMSReport).status(200);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    MonthlySMS
};