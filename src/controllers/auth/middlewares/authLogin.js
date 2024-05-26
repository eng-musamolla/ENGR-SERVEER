const jwt = require('jsonwebtoken');

const authLogin = (req, res, next) => {
    console.log("authLoginBody:", req);
    const { email, displayName } = req.body;
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
    res.status(200).json({ token });

    // if (email === process.env.ADMIN_USERNAME && displayName === process.env.ADMIN_PASSWORD) {
    // } else {
    //     res.status(401).json({ message: 'Invalid username or password' });
    // }
};

module.exports = authLogin;
