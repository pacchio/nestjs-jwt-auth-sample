import {Connection} from 'mongoose';
import {EmailVerificationSchema} from './schemas/emailverification.schema';
import {ForgottenPasswordSchema} from './schemas/forgottenpassword.schema';
import {ConsentRegistrySchema} from './schemas/consentregistry.schema';

export const authProviders = [
  {
    provide: 'EMAIL_VERIFICATION_MODEL',
    useFactory: (connection: Connection) => connection.model('EmailVerification', EmailVerificationSchema),
    inject: ['DATABASE_CONNECTION'],
  },
  {
    provide: 'FORGOTTEN_PASSWORD_MODEL',
    useFactory: (connection: Connection) => connection.model('ForgottenPassword', ForgottenPasswordSchema),
    inject: ['DATABASE_CONNECTION'],
  },
  {
    provide: 'CONSENT_REGISTRY_MODEL',
    useFactory: (connection: Connection) => connection.model('ConsentRegistry', ConsentRegistrySchema),
    inject: ['DATABASE_CONNECTION'],
  }
];
