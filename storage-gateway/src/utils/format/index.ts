const oneToTwoString = (data: string) => {
  return data.length == 1 ? '0' + data : data;
};

export const FORMAT = {
  oneToTwoString: oneToTwoString,
};
