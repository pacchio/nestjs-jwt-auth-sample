import { Document } from 'mongoose';

export interface User extends Document {
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    roles: string[];
    auth: {
        email : {
            valid : boolean,
        },
        facebook: {
            userid: string
        },
        gmail: {
            userid: string
        }
    };
    settings: {};
}
