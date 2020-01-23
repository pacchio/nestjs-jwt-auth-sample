export interface GoogleUser {
    id: string;
    displayName: string;
    name: Name;
    emails: Email[];
    photos: Photo[];
    provider: string;
    _raw: string;
}

export interface GoogleUserRawObject {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale: string;
}

export interface Name {
    familyName: string;
    givenName: string;
}

export interface Email {
    value: string;
    verified: boolean;
}

export interface Photo {
    value: string;
}

