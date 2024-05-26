const jwt = require('jsonwebtoken');
require('dotenv').config();

const authVerify = async (req, res, next) => {

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access denied. Unauthorized access.');
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send('Access denied.' + error.message);
    }
};

module.exports = authVerify;
