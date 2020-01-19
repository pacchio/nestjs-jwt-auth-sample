import * as mongoose from 'mongoose';
import {Constants} from '../constants';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(Constants.mongoDbUrl),
  },
];
