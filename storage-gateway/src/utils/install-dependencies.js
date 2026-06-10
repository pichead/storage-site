const modules = [
  'nodemailer',
  'firebase',
  'jsonwebtoken',
  'axios',
  'bcrypt',
  '@aws-sdk/client-s3',
  'uuid',
  'xlsx',
  'path',
  'firebase-admin',
  'express',
  'multer',
  '@types/multer',
  '@types/express',
  'winston',
  'winston-daily-rotate-file',
  '@aws-sdk/s3-request-presigner',
  'ioredis',
  'dayjs',
  'jest-mock-extended',
  'dayjs',
  'redis',
  'ioredis',
  'argon2',
  '@google/generative-ai',

  // @types สำหรับ typescript

  '@types/ioredis',
  '@types/jsonwebtoken',
  '@types/uuid',
  '@types/node',
  '@types/argon2'
];

const { exec } = require('child_process');

const installDependencies = () => {
  const command = `npm install ${modules.join(' ')}`;
  console.log('Running command:', command);

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error installing dependencies:', err);
      process.exit(1);
    }
    console.log('Dependencies installed successfully');
    console.log(stdout);
    console.error(stderr);
  });
};

installDependencies();
