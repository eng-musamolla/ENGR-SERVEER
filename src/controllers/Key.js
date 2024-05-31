const KeyModels = require('../models/Key');

const adKey = async (req, res) => {
    const { P, OS, userName } = req.body;
    try {
        const existingKey = await KeyModels.findOne({ P });
        if (existingKey) {
            const addedCount = await KeyModels.countDocuments({ userName });
            return res.status(409).json(`Already added for [${userName}] | Total = ${addedCount}`);
        } else {
            const newKey = new KeyModels({ P, OS, userName });
            if (!P) {
                return res.status(201).json(`Not applicable for this PC`);
            }

            await newKey.save();
            if (newKey.P) {
                const addedCount = await KeyModels.countDocuments({ userName });
                return res.status(201).json(`Successfully added for [${userName}] | Total = ${addedCount}`);
            } else {
                return res.status(400).json('Failed to add');
            }
        }
    } catch (error) {
        return res.status(500).json(error.message);
    }
};


const getAllKeys = async (req, res) => {
    const userName  = req.query.userName || {};
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;

   
    try {
        const keys = await KeyModels.aggregate[
            { $match: { userName: userName } },
            { $skip: page * size },
            { $limit: size }
        
        ];
        return res.status(200).json(keys);
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

const deleteKey = async (req, res) => {
    const { P } = req.query;
    try {
        const deletedKey = await KeyModels.findOneAndDelete({ P });
        if (deletedKey) {
            return res.status(200).json('Successfully deleted');
        } else {
            return res.status(404).json('Key not found');
        }
    } catch (error) {
        return res.status(500).json(error.message);
    }
};


module.exports = {
    adKey,
    getAllKeys,
    deleteKey
};