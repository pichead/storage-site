import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = 'Asia/Bangkok';
const unixToday = () => {
  // เวลาเริ่มต้นของวันนี้
  const startOfDay = dayjs().tz(tz).startOf('day');
  const startUnixTime = startOfDay.unix();

  // เวลาสิ้นสุดของวันนี้
  const endOfDay = dayjs().tz(tz).endOf('day');
  const endUnixTime = endOfDay.unix();

  return [startUnixTime, endUnixTime];
};

const unixFirstInMonth = (startUnix: number, endUnix: number) => {
  // แปลง unixtime เป็น dayjs objects
  const startDate = dayjs.unix(startUnix);
  const endDate = dayjs.unix(endUnix);

  // เริ่มต้นจากวันแรกของเดือนที่ startDate อยู่
  let current = startDate.startOf('month');
  const firstDaysUnix: number[] = [];

  // วนลูปจนกว่า current จะมากกว่า endDate
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    // ตรวจสอบว่าค่า unix ของวันแรกเดือนนั้นอยู่ในช่วงหรือไม่
    if (current.unix() >= startUnix && current.unix() <= endUnix) {
      firstDaysUnix.push(current.unix());
    }
    // เลื่อนไปเดือนถัดไป
    current = current.add(1, 'month');
  }

  return firstDaysUnix;
};

const unixWeek = () => {
  const startOfWeek = dayjs().tz(tz).startOf('week');
  const startUnixTime = startOfWeek.unix();

  // เวลาสิ้นสุดของสัปดาห์นี้ (วันเสาร์)
  const endOfWeek = dayjs().tz(tz).endOf('week');
  const endUnixTime = endOfWeek.unix();
  return [startUnixTime, endUnixTime];
};

const unixMonth = () => {
  const startOfWeek = dayjs().tz(tz).startOf('month');
  const startUnixTime = startOfWeek.unix();

  // เวลาสิ้นสุดของสัปดาห์นี้ (วันเสาร์)
  const endOfWeek = dayjs().tz(tz).endOf('month');
  const endUnixTime = endOfWeek.unix();
  return [startUnixTime, endUnixTime];
};

const timestampNow = () => {
  return Math.floor(Date.now() / 1000);
};

const hourDiff = (startHour: string, endHour: string) => {
  const startTimeObj = new Date(`2000-01-01T${startHour}`);
  const endTimeObj = new Date(`2000-01-01T${endHour}`);

  const timeDiff: number = endTimeObj.getTime() - startTimeObj.getTime();

  const hoursDiff: number = timeDiff / (1000 * 60 * 60);

  return hoursDiff;
};

const unixToThaiDateTime = (unixTimestamp: number) => {
  const date = new Date(unixTimestamp);
  const thaiMonthsFull = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];
  const thaiMonthsShort = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'ม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);

  const thaiMonthFull = thaiMonthsFull[monthIndex];
  const thaiMonthShort = thaiMonthsShort[monthIndex];

  return {
    full: `${day} ${thaiMonthFull} ${year + 543} ${hours}:${minutes}`,
    short: `${day} ${thaiMonthShort} ${year + 543} ${hours}:${minutes}`,
  };
};

export const TIME = {
  timestampNow: timestampNow,
  hourDiff: hourDiff,
  unixToThaiDateTime: unixToThaiDateTime,
  unixRange: {
    unixToday,
    unixWeek,
    unixMonth,
    unixFirstInMonth,
  },
};
