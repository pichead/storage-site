import * as crypto from 'crypto';

const randomString = (length: number) => {
  let result = '';
  while (result.length < length) {
    result += Math.random().toString(36).substring(2);
  }
  return result.substring(0, length);
};

const randomNumber = (length: number) => {
  let result = '';
  while (result.length < length) {
    const buffer = crypto.randomBytes(1);
    const num = buffer[0] % 10;
    result += num.toString();
  }
  return result;
};

export const GENERATE = {
  randomString: randomString,
  randomNumber: randomNumber,
};
