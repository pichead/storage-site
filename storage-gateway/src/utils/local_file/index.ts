import * as fs from 'fs';
import * as path from 'path';

export const saveFile = (
  file: any,
  uploadDir: string = 'uploads',
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadPath = path.join(__dirname, '../../', uploadDir);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, file.originalname);

    fs.writeFile(filePath, file.buffer, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(filePath);
    });
  });
};

export const readFile = (
  fileName: string,
  uploadDir: string = 'uploads',
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, '../../', uploadDir, fileName);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
};

export const FILE_LOCAL = {
  save: saveFile,
  read: readFile,
};
