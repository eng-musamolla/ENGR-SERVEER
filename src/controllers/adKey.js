const AdKey = require('../models/adKey');

const adKey = async (req, res) => {
    const { P, OS, userName } = req.body;
    try {
        const existingKey = await AdKey.findOne({ P });
        if (existingKey) {
            const addedCount = await AdKey.countDocuments({ userName });
            return res.status(409).json(`Already added for [${userName}] | Total = ${addedCount}`);
        } else {
            const newKey = new AdKey({ P, OS, userName });
            if (!P) {
                return res.status(201).json(`Not applicable for this PC`);
            }

            await newKey.save();
            if (newKey.P) {
                const addedCount = await AdKey.countDocuments({ userName });
                return res.status(201).json(`Successfully added for [${userName}] | Total = ${addedCount}`);
            } else {
                return res.status(400).json('Failed to add');
            }
        }
    } catch (error) {
        return res.status(500).json(error.message);
    }
};


module.exports = {
    adKey
};