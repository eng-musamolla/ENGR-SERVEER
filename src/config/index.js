require('dotenv').config();


module.exports = {
    port: process.env.PORT || 3131,
    MONGO_URI: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@chs.i8wb108.mongodb.net/CHS2024?retryWrites=true&w=majority`,
    TEST_URI: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@chs.i8wb108.mongodb.net/TEST?retryWrites=true&w=majority`,
    imgUploadURL: `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    timezone: 'Asia/Dhaka'
};
