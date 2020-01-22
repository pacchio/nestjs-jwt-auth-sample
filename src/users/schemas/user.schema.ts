import * as mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
    name: String,
    surname: String,
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    roles: Array<String>(),
    auth: {
        email : {
            valid : { type: Boolean, default: false }
        },
        facebook: {
            userid: String
        },
        gmail: {
            userid: String
        }
    },
    settings: {},
});
