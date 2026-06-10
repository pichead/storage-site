const resOk = (
  statusCode: number,
  messageEn: string,
  messageTh: string,
  data: { [key: string]: any }[] | { [key: string]: any } | null,
  extraParams?: { [key: string]: any } | null | undefined,
) => {
  return {
    statusCode: statusCode,
    messageEn: messageEn,
    messageTh: messageTh,
    data: data,
    ...extraParams,
  };
};

const resError = (statusCode: number, messageEn: string, messageTh: string) => {
  return {
    statusCode: statusCode,
    messageEn: messageEn,
    messageTh: messageTh,
  };
};

const resSystemError = () => {
  return {
    statusCode: 500,
    messageEn: 'System error',
    messageTh: 'เกิดข้อผิดพลาดจาก server',
  };
};

const resAny = (
  statusCode: number,
  messageEn: string,
  messageTh: string,
  extraParams: { [key: string]: any } | null | undefined,
) => {
  return {
    statusCode: statusCode,
    messageEn: messageEn,
    messageTh: messageTh,
    ...extraParams,
  };
};

export const RES = {
  ok: resOk,
  error: resError,
  any: resAny,
  errorSystem: resSystemError,
};
