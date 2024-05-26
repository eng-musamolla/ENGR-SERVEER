const express = require('express');
const cors = require('cors');
const app = express();
const { ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
const router = require('./src/routes/routes');

const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Dhaka");
require('dotenv').config();

const port = process.env.PORT || 3131;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);


app.get('/', (req, res) => {
    res.send('ENGR SERVER API');
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@eng.kst5yvp.mongodb.net/?retryWrites=true&w=majority&appName=ENG`;


//localhost testing
// const uri = `mongodb://localhost:27017/CHS2024`;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
    .then(() => {
        console.log('Connected correctly to server');
        app.listen(port, () => {
            console.log(`ENGR API listening at http://localhost:${port}`);
        });
    })
    .catch((err) => console.log(err.stack));