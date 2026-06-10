import * as argon2 from 'argon2';

import { env } from '../constant';
import logger from '../logger';

const hashPassword = async (password: string): Promise<string | null> => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    logger.error('Error hashing password', { error });
    return null;
  }
};

const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean | null> => {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch (error) {
    logger.error('Error comparing password', { error });
    return null;
  }
};

export const PASSWORD = {
  hash: hashPassword,
  compare: comparePassword,
};
