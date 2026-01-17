// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('₹', '₹ ');
};

// Format date to DD-MMM-YY
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (dateString.match(/\d{2}-[A-Za-z]{3}-\d{2}/)) {
        return dateString;
      }
      return dateString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString;
  }
};

// Calculate due date
export const calculateDueDate = (dateString: string, daysToAdd: number = 30): string => {
  try {
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(dateParts[0]);
      const monthIndex = months.indexOf(dateParts[1]);
      const year = parseInt('20' + dateParts[2]);
      
      if (!isNaN(day) && monthIndex >= 0 && !isNaN(year)) {
        const invoiceDate = new Date(year, monthIndex, day);
        invoiceDate.setDate(invoiceDate.getDate() + daysToAdd);
        
        const dueDay = invoiceDate.getDate().toString().padStart(2, '0');
        const dueMonth = months[invoiceDate.getMonth()];
        const dueYear = invoiceDate.getFullYear().toString().slice(-2);
        return `${dueDay}-${dueMonth}-${dueYear}`;
      }
    }
    return dateString;
  } catch (error) {
    return dateString;
  }
};

// Number to words converter
export const convertToIndianWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convert_hundreds(num: number): string {
    let result = '';
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num >= 10) {
      result += teens[num - 10] + ' ';
      return result;
    }
    if (num > 0) {
      result += ones[num] + ' ';
    }
    return result;
  }
  
  function convert_number(num: number): string {
    if (num === 0) return 'Zero';
    
    let result = '';
    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
      result += convert_hundreds(crore) + 'Crore ';
      num %= 10000000;
    }
    
    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
      result += convert_hundreds(lakh) + 'Lakh ';
      num %= 100000;
    }
    
    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
      result += convert_hundreds(thousand) + 'Thousand ';
      num %= 1000;
    }
    
    const hundred = Math.floor(num / 100);
    if (hundred > 0) {
      result += convert_hundreds(hundred) + 'Hundred ';
      num %= 100;
    }
    
    if (num > 0) {
      result += convert_hundreds(num);
    }
    
    return result.trim();
  }
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = convert_number(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert_number(paise) + ' Paise';
  }
  result += ' Only';
  
  return `INR ${result.toUpperCase()}`;
};