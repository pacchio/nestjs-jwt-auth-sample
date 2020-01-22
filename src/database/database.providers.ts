import * as mongoose from 'mongoose';
import {default as config} from '../config';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(config.mongoDbUrl),
  },
];
