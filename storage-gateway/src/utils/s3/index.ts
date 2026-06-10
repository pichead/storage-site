import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { UUID } from 'src/utils/uuid';
import { extname } from 'path';
import { env } from 'src/utils/constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TIME } from 'src/utils/time';
import logger from '../logger';

const AWS_S3_BUCKET = env.s3BucketName;
const AWS_S3_REGION = env.s3BucketRegion;
const AWS_S3_SECRET_ACCESS_KEY = env.s3SecretKey;
const AWS_S3_ACCESS_KEY = env.s3AccessKey;
const cdnUrl = env.s3CdnUrl;

const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_S3_ACCESS_KEY,
    secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  },
  endpoint: cdnUrl, // ใช้ endpoint สำหรับ MinIO
  forcePathStyle: true, // บังคับใช้ Path-style URL สำหรับ MinIO
  region: AWS_S3_REGION,
});

const save = async (file: Express.Multer.File, folder: string) => {
  const AWS_S3_URL = cdnUrl
    ? `${cdnUrl}`
    : `https://s3.${AWS_S3_REGION}.amazonaws.com/${AWS_S3_BUCKET}`;
  const { originalname } = file;
  const id = await UUID();
  const filepath = extname(originalname);
  const fileName = TIME.timestampNow() + '_' + id + '_' + folder + filepath;
  const key = `${folder}/${fileName}`;
  const fileType = file.mimetype;
  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);

  try {
    const save = await s3.send(command);
    const fileUrl = `${AWS_S3_URL}/${AWS_S3_BUCKET}/${key}`;

    if (save && save['$metadata'].httpStatusCode === 200) {
      return { src: fileUrl, fileName: fileName, path: key, type: fileType };
    } else {
      return null;
    }
  } catch (error) {
    logger.error('Error uploading file to S3', { error, folder, fileName: originalname });
    return null;
  }
};

const remove = async (filename: string, folder: string) => {
  try {
    const params = {
      Bucket: AWS_S3_BUCKET,
      Key: `${folder}/${filename}`,
    };

    const command = new DeleteObjectCommand(params);

    const removeFile = await s3.send(command);

    return { removeFile };
  } catch (error) {
    logger.error('Error removing file from S3', { error, folder, filename });
    return null;
  }
};

const getSigned = async (url: string) => {
  const key = url.split(cdnUrl + '/' + AWS_S3_BUCKET + '/')[1];
  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
  };

  const command = new GetObjectCommand(params);

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 ชั่วโมง
    return url;
  } catch (error) {
    logger.error('Error generating signed URL', { error, key });
    return null;
  }
};

export const S3 = {
  save,
  remove,
  getSigned,
};


