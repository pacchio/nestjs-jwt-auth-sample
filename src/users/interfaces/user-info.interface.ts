export interface UserInfo {
    id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    roles: string[];
    auth: {
        email : {
            valid : boolean,
        },
        facebook: {
            userid: string
        },
        google: {
            userid: string
        }
    };
    settings: {};
}
