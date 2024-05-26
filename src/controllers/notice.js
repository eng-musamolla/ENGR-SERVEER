const axios = require('axios');
const Notice = require('../models/notice');
require('dotenv').config();

const imgUploadURL = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;


const addNotice = async (req, res) => {
    try {
        const noticeData = {
            noticeTitle: req.body.NoticeTitle,
            noticeCategory: req.body.NoticeCategory
        };
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const formData = new FormData();
        formData.append('image', req.file.buffer.toString('base64'));

        axios.post(`${imgUploadURL}`, formData)
            .then(async (response) => {
                noticeData.noticeUrl = response.data?.data?.display_url;
                noticeData.noticeDeleteUrl = response.data?.data?.delete_url;
                const maxStackIndex = await Notice.find().sort('-stackIndex').limit(1);
                noticeData.stackIndex = (maxStackIndex[0]?.stackIndex || 0) + 1;
                const notice = new Notice(noticeData);
                const result = await notice.save();
                res.status(201).json(result);
            })
            .catch((error) => {
                res.status(500).json({ message: error.message });
            });


    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAllNotice = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const notices = await Notice.find().sort('-stackIndex').limit(limit);
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const DeleteNotice = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Notice.deleteOne({ _id: id });
        if (result.deletedCount === 1) {
            res.status(200).json({ message: `Notice with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: `Notice with ID ${id} not found` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }

};



module.exports = {
    addNotice,
    getAllNotice,
    DeleteNotice
};