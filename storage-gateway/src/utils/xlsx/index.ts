import { readFile } from 'fs';
import * as xlsx from 'xlsx';

export class XlsxService {
  async readFile(file: any) {
    const workbook = xlsx.read(file.buffer);

    // Assuming you want to read data from the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    return jsonData;
  }
}

export const XLSX = {
  readFile: readFile,
};
