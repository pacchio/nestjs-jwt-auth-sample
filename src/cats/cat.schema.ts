import * as mongoose from 'mongoose';

export const CatSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
});
