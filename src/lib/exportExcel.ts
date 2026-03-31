import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type AdvanceItem = { description: string; amount: number; note: string };

export interface AdvanceRequest {
  id: string;
  requester_id: string;
  department: string;
  bank_account: string;
  total_amount: number;
  items: AdvanceItem[];
  status: string;
  type: 'Advance' | 'Clearance';
  related_advance_id?: string;
  created_at: string;
}

export interface UserProfile {
  full_name: string;
  department: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const removeVietnameseTones = (str: string) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
  str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
  str = str.replace(/đ/g,"d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
};

const sanitizeFileName = (name: string) => {
  return removeVietnameseTones(name).replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

const numberToWordsVN = (num: number): string => {
  if (num === 0) return 'Không đồng';
  
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  
  let strNum = Math.round(num).toString();
  let result = [];
  let unitIndex = 0;

  while (strNum.length > 0) {
    let group = strNum.slice(-3);
    strNum = strNum.slice(0, -3);
    
    if (group !== '000' || (strNum.length === 0 && group === '000')) {
      let paddedGroup = group;
      if (strNum.length > 0) {
        paddedGroup = group.padStart(3, '0');
      }
      
      let groupText = '';
      const h = paddedGroup.length === 3 ? parseInt(paddedGroup[0]) : -1;
      const t = paddedGroup.length >= 2 ? parseInt(paddedGroup[paddedGroup.length - 2]) : -1;
      const o = parseInt(paddedGroup[paddedGroup.length - 1]);

      if (h > 0) {
        groupText += digits[h] + ' trăm ';
      } else if (h === 0) {
        groupText += 'không trăm ';
      }

      if (t > 1) {
        groupText += digits[t] + ' mươi ';
      } else if (t === 1) {
        groupText += 'mười ';
      } else if (t === 0 && o > 0 && h !== -1) {
        groupText += 'lẻ ';
      }

      if (o === 1 && t > 1) {
        groupText += 'mốt';
      } else if (o === 5 && t > 0) {
        groupText += 'lăm';
      } else if (o === 4 && t > 1) {
        groupText += 'tư';
      } else if (o > 0 || (paddedGroup.length === 1 && o === 0)) {
        if (o !== 0) groupText += digits[o];
      }
      
      groupText = groupText.trim();
      if (groupText) {
        result.unshift(groupText + (units[unitIndex] ? ' ' + units[unitIndex] : ''));
      }
    }
    unitIndex++;
  }

  let finalStr = result.join(' ').trim();
  finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' đồng';
  return finalStr;
};

export const exportAdvanceForm = async (request: AdvanceRequest, user: UserProfile) => {
  try {
    // 1. Fetch template file
    const response = await fetch('/Advance Form.xlsx');
    if (!response.ok) {
      throw new Error('Could not find template file /Advance Form.xlsx');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    // 3. Inject fixed data
    worksheet.getCell('E7').value = user.full_name;
    worksheet.getCell('E8').value = user.department;
    
    let bankAccount = request.bank_account || '';
    const namePrefix = user.full_name + ' - ';
    if (bankAccount.startsWith(namePrefix)) {
      bankAccount = bankAccount.substring(namePrefix.length);
    } else if (bankAccount.startsWith(user.full_name)) {
      bankAccount = bankAccount.substring(user.full_name.length).replace(/^[\s-]+/, '');
    }
    worksheet.getCell('E9').value = bankAccount;
    
    worksheet.getCell('E10').value = formatDate(request.created_at);

    // 4. Inject items starting from row 14
    let currentRow = 14;
    request.items.forEach((item, index) => {
      const row = worksheet.getRow(currentRow);
      row.getCell('A').value = index + 1;
      row.getCell('B').value = item.description;
      row.getCell('F').value = item.amount;
      row.getCell('G').value = item.note || '';
      
      currentRow++;
    });

    // Add amount in words at E21
    const amountInWordsCell = worksheet.getCell('E21');
    amountInWordsCell.value = numberToWordsVN(request.total_amount);
    amountInWordsCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

    // 5. Export file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const dateStr = formatDate(request.created_at).replace(/\//g, '');
    const fileName = `[De_nghi_tam_ung]_${sanitizeFileName(user.full_name)}_${dateStr}.xlsx`;
    
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error exporting Advance form:', error);
    throw error;
  }
};

export const exportClearanceForm = async (request: AdvanceRequest, user: UserProfile, originalAdvanceAmount: number = 0) => {
  try {
    // 1. Fetch template file
    const response = await fetch('/Clearance Form.xlsx');
    if (!response.ok) {
      throw new Error('Could not find template file /Clearance Form.xlsx');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    // 3. Inject fixed data
    worksheet.getCell('E7').value = user.full_name;
    worksheet.getCell('E8').value = user.department;
    worksheet.getCell('E9').value = formatDate(request.created_at);

    // 4. Inject original advance amount
    worksheet.getCell('E12').value = originalAdvanceAmount;

    // 5. Inject items starting from row 17
    let currentRow = 17;
    request.items.forEach((item, index) => {
      const row = worksheet.getRow(currentRow);
      row.getCell('A').value = index + 1;
      row.getCell('B').value = item.description;
      row.getCell('F').value = item.amount;
      row.getCell('G').value = item.note || '';
      
      currentRow++;
    });

    // 6. Inject totals at the end
    // Adjust these coordinates based on your actual template
    const totalSpent = request.items.reduce((sum, item) => sum + Number(item.amount), 0);
    const difference = originalAdvanceAmount - totalSpent;

    const totalSpentRow = 22; 
    const differenceRow = 23;

    worksheet.getCell(`F${totalSpentRow}`).value = totalSpent;
    worksheet.getCell(`F${differenceRow}`).value = difference;

    // 7. Export file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const dateStr = formatDate(request.created_at).replace(/\//g, '');
    const fileName = `[Quyet_toan]_${sanitizeFileName(user.full_name)}_${dateStr}.xlsx`;
    
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error exporting Clearance form:', error);
    throw error;
  }
};
