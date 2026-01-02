import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Download, FileText } from "lucide-react";
import { Invoice, InvoiceItem, clients, serviceTypes, formatCurrency } from "../Billing";
import jsPDF from "jspdf";

interface PerformInvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface PerformInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreate: (invoice: Invoice) => void;
  performInvoicesCount: number;
}

export const PerformInvoiceForm: React.FC<PerformInvoiceFormProps> = ({
  isOpen,
  onClose,
  onInvoiceCreate,
  performInvoicesCount
}) => {
  const [items, setItems] = useState<PerformInvoiceItem[]>([
    { description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    // Company Details
    companyName: "S K Enterprises",
    companyAddress: "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune",
    companyGSTIN: "27ALKPK7734N1ZE",
    companyState: "Maharashtra",
    companyStateCode: "27",
    companyEmail: "s.k.enterprises7583@gmail.com",
    
    // Consignee Details (Ship to)
    consigneeName: "",
    consigneeAddress: "",
    consigneeGSTIN: "",
    consigneeState: "",
    consigneeStateCode: "",
    
    // Buyer Details (Bill to)
    buyerName: "",
    buyerAddress: "",
    buyerGSTIN: "",
    buyerState: "",
    buyerStateCode: "",
    
    // Order Details
    voucherNo: `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`,
    buyerRef: "",
    orderDate: new Date().toISOString().split('T')[0],
    dispatchedThrough: "",
    paymentTerms: "",
    otherReferences: "",
    destination: "",
    deliveryTerms: "",
    
    // Client details (for backward compatibility)
    client: "",
    clientEmail: "",
    serviceType: "",
    dueDate: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    
    // Additional fields
    accountHolder: "S K ENTEPRISES",
    bankName: "BANK OF MAHARASHTRA",
    accountNumber: "CA 60168661338",
    branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
    authorisedSignatory: "",
    footerNote: "This is a Computer Generated Document",
    termsConditions: "E. & O.E"
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Number to words converter
  const convertToIndianWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    function convert_hundreds(num: number) {
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
    
    function convert_number(num: number) {
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

  // Generate Sales Order PDF - UPDATED VERSION with separate UNIT column
  const generateSalesOrderPDF = (invoiceData: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      let yPos = 15;

      // Helper functions
      const drawLine = (y: number, width = contentWidth) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.line(leftMargin, y, leftMargin + width, y);
      };

      const addText = (text: string, x: number, y: number, options: any = {}) => {
        const fontSize = options.size || 10;
        const fontStyle = options.style || "normal";
        const align = options.align || 'left';
        
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.setTextColor(options.color || 0, 0, 0);
        doc.text(text, x, y, { align: align });
      };

      // ==================== HEADER SECTION ====================
      // Sales Order Title
      addText("SALES ORDER", pageWidth / 2, yPos, { 
        size: 16, 
        style: 'bold', 
        align: 'center' 
      });
      yPos += 8;
      
      // Company Name
      addText(formData.companyName || "S K Enterprises", pageWidth / 2, yPos, { 
        size: 12, 
        style: 'bold', 
        align: 'center' 
      });
      yPos += 6;
      
      // Company Address
      const companyAddress = formData.companyAddress || "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune";
      const companyAddressLines = companyAddress.split('\n');
      companyAddressLines.forEach((line: string) => {
        addText(line, pageWidth / 2, yPos, { 
          size: 10, 
          align: 'center' 
        });
        yPos += 4;
      });
      
      yPos += 2;
      
      // GSTIN
      addText(`GSTIN/UIN: ${formData.companyGSTIN || "27ALKPK7734N1ZE"}`, pageWidth / 2, yPos, { 
        size: 9, 
        align: 'center' 
      });
      yPos += 4;
      
      // State and Code
      addText(`State Name : ${formData.companyState || "Maharashtra"}, Code : ${formData.companyStateCode || "27"}`, 
        pageWidth / 2, yPos, { 
          size: 9, 
          align: 'center' 
        });
      yPos += 4;
      
      // Email
      addText(`E-Mail : ${formData.companyEmail || "s.k.enterprises7583@gmail.com"}`, 
        pageWidth / 2, yPos, { 
          size: 9, 
          align: 'center' 
        });
      yPos += 10;

      // ==================== CONSIGNEE SECTION ====================
      // Section Title
      addText("Consignee (Ship to)", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 5;
      
      // Consignee Name
      const consigneeName = formData.consigneeName || formData.buyerName || "";
      addText(consigneeName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      // Consignee Address
      if (formData.consigneeAddress) {
        const consigneeAddressLines = formData.consigneeAddress.split('\n');
        consigneeAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
      // Consignee GSTIN
      if (formData.consigneeGSTIN) {
        addText(`GSTIN/UIN : ${formData.consigneeGSTIN}`, leftMargin, yPos, { size: 9 });
        yPos += 4;
      }
      
      if (formData.consigneeState && formData.consigneeStateCode) {
        addText(`State Name : ${formData.consigneeState}, Code : ${formData.consigneeStateCode}`, 
          leftMargin, yPos, { size: 9 });
        yPos += 4;
      }

      yPos += 8;

      // ==================== BUYER SECTION ====================
      // Section Title
      addText("Buyer (Bill to)", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 5;
      
      // Buyer Name
      const buyerName = formData.buyerName || "";
      addText(buyerName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      // Buyer Address
      if (formData.buyerAddress) {
        const buyerAddressLines = formData.buyerAddress.split('\n');
        buyerAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
      // Buyer GSTIN
      if (formData.buyerGSTIN) {
        addText(`GSTIN/UIN : ${formData.buyerGSTIN}`, leftMargin, yPos, { size: 9 });
        yPos += 4;
      }
      
      if (formData.buyerState && formData.buyerStateCode) {
        addText(`State Name : ${formData.buyerState}, Code : ${formData.buyerStateCode}`, 
          leftMargin, yPos, { size: 9 });
        yPos += 4;
      }

      yPos += 8;

      // ==================== ORDER DETAILS TABLE ====================
      // Create a 2-column layout for order details
      const orderDetailsY = yPos;
      const col1X = leftMargin;
      const col2X = leftMargin + contentWidth * 0.6;
      
      // Column 1 - Left side
      addText("Voucher No.", col1X, orderDetailsY, { size: 9 });
      addText(formData.voucherNo || "", col1X + 35, orderDetailsY, { 
        size: 9, 
        style: 'bold' 
      });
      
      addText("Buyer's Ref./Order No.", col1X, orderDetailsY + 6, { size: 9 });
      addText(formData.buyerRef || "", col1X + 35, orderDetailsY + 6, { size: 9 });
      
      addText("Dispatched through", col1X, orderDetailsY + 12, { size: 9 });
      addText(formData.dispatchedThrough || "", col1X + 35, orderDetailsY + 12, { size: 9 });
      
      addText("Dated", col1X, orderDetailsY + 18, { size: 9 });
      addText(formatDate(formData.orderDate) || "", col1X + 35, orderDetailsY + 18, { size: 9 });
      
      // Column 2 - Right side
      addText("Mode/Terms of Payment", col2X, orderDetailsY, { size: 9 });
      addText(formData.paymentTerms || "", col2X + 45, orderDetailsY, { size: 9 });
      
      addText("Other References", col2X, orderDetailsY + 6, { size: 9 });
      addText(formData.otherReferences || "", col2X + 45, orderDetailsY + 6, { size: 9 });
      
      addText("Destination", col2X, orderDetailsY + 12, { size: 9 });
      addText(formData.destination || "", col2X + 45, orderDetailsY + 12, { size: 9 });
      
      addText("Terms of Delivery", col2X, orderDetailsY + 18, { size: 9 });
      addText(formData.deliveryTerms || "", col2X + 45, orderDetailsY + 18, { size: 9 });

      yPos = orderDetailsY + 24;

      // ==================== ITEMS TABLE HEADER ====================
      // Table Headers - Fixed aligned positions with UNIT column
      const columnPositions = {
        slNo: leftMargin + 5,
        description: leftMargin + 15,
        quantity: leftMargin + 110,
        unit: leftMargin + 130,      // NEW: Unit column position
        rate: leftMargin + 150,      // Adjusted for unit column
        amount: leftMargin + 175     // Adjusted for unit column
      };

      // Draw header line
      drawLine(yPos);
      yPos += 8;

      // Table headers - INCLUDING UNIT COLUMN
      addText("Sl No.", columnPositions.slNo, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Description of Goods", columnPositions.description, yPos, { size: 9, style: 'bold', align: 'left' });
      addText("Quantity", columnPositions.quantity, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Unit", columnPositions.unit, yPos, { size: 9, style: 'bold', align: 'center' }); // NEW: Unit header
      addText("Rate per", columnPositions.rate, yPos, { size: 9, style: 'bold', align: 'right' });
      addText("Amount", columnPositions.amount, yPos, { size: 9, style: 'bold', align: 'right' });
      
      yPos += 3;
      drawLine(yPos);
      yPos += 6;

      // ==================== ITEMS TABLE ROWS ====================
      items.forEach((item, index) => {
        // Check for page break
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
          addText("Continued...", pageWidth / 2, yPos, { size: 10, align: 'center' });
          yPos += 15;
          
          // Redraw table header on new page
          drawLine(yPos - 8);
          addText("Sl No.", columnPositions.slNo, yPos, { size: 9, style: 'bold', align: 'center' });
          addText("Description of Goods", columnPositions.description, yPos, { size: 9, style: 'bold', align: 'left' });
          addText("Quantity", columnPositions.quantity, yPos, { size: 9, style: 'bold', align: 'center' });
          addText("Unit", columnPositions.unit, yPos, { size: 9, style: 'bold', align: 'center' });
          addText("Rate per", columnPositions.rate, yPos, { size: 9, style: 'bold', align: 'right' });
          addText("Amount", columnPositions.amount, yPos, { size: 9, style: 'bold', align: 'right' });
          yPos += 3;
          drawLine(yPos);
          yPos += 6;
        }

        // Serial Number - Centered
        addText(`${index + 1}`, columnPositions.slNo, yPos, { size: 9, align: 'center' });
        
        // Description - Left aligned
        const description = item.description || "";
        addText(description, columnPositions.description, yPos, { 
          size: 9,
          align: 'left'
        });
        
        // Quantity - Centered
        addText(`${item.quantity}`, columnPositions.quantity, yPos, { 
          size: 9,
          align: 'center'
        });
        
        // Unit - Centered (NEW COLUMN)
        addText(item.unit || "No", columnPositions.unit, yPos, { 
          size: 9,
          align: 'center'
        });
        
        // Rate per - Right aligned
        addText(formatCurrency(item.rate), columnPositions.rate, yPos, { 
          size: 9,
          align: 'right'
        });
        
        // Amount - Right aligned
        addText(formatCurrency(item.amount), columnPositions.amount, yPos, { 
          size: 9,
          align: 'right'
        });
        
        yPos += 8;
      });

      // Draw line after items
      drawLine(yPos);
      yPos += 8;

      // ==================== TOTAL SECTION ====================
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const gst = subtotal * 0.18;
      const totalAmount = subtotal + gst;
      
      // Total label
      addText("Total", columnPositions.rate - 5, yPos, { 
        size: 10, 
        style: 'bold',
        align: 'left'
      });
      
      // Total amount
      addText(formatCurrency(totalAmount), columnPositions.amount, yPos, { 
        size: 10, 
        style: 'bold',
        align: 'right'
      });

      yPos += 10;
      drawLine(yPos);
      yPos += 8;

      // ==================== AMOUNT IN WORDS ====================
      addText("Amount Chargeable (in words)", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 6;
      
      const amountInWords = convertToIndianWords(totalAmount);
      const wordsLines = doc.splitTextToSize(amountInWords, contentWidth);
      wordsLines.forEach((line: string) => {
        addText(line, leftMargin, yPos, { size: 9 });
        yPos += 4;
      });

      yPos += 8;

      // ==================== TERMS & CONDITIONS ====================
      addText(formData.termsConditions || "E. & O.E", leftMargin, yPos, { 
        size: 9, 
        style: 'italic' 
      });
      yPos += 8;

      // ==================== BANK DETAILS ====================
      // Section title
      addText("Company's Bank Details", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 6;
      
      // Bank details
      addText(`A/c Holder's Name : ${formData.accountHolder || "S K ENTEPRISES"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Bank Name : ${formData.bankName || "BANK OF MAHARASHTRA"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`A/c No. : ${formData.accountNumber || "CA 60168661338"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Branch & IFS Code : ${formData.branchAndIFSC || "KALYANI NAGAR & MAHB0001233"}`, leftMargin, yPos, { size: 9 });
      yPos += 12;

      // ==================== SIGNATURE SECTION ====================
      // Draw line for signature
      const signatureY = pageHeight - 40;
      drawLine(signatureY - 10);
      
      // Company signature
      addText("for S K Enterprises", leftMargin + contentWidth * 0.25, signatureY, { 
        size: 9, 
        align: 'center' 
      });
      addText("Authorised Signatory", leftMargin + contentWidth * 0.25, signatureY + 6, { 
        size: 8, 
        align: 'center' 
      });

      // ==================== FOOTER ====================
      const footerY = pageHeight - 15;
      drawLine(footerY - 5);
      
      addText(formData.footerNote || "This is a Computer Generated Document", pageWidth / 2, footerY, { 
        size: 8, 
        style: 'italic', 
        align: 'center' 
      });

      // ==================== SAVE PDF ====================
      const fileName = `Sales_Order_${formData.voucherNo || 'temp'}_${formatDate(formData.orderDate)}.pdf`;
      doc.save(fileName);
      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please check the console for details.");
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Create invoice items with unit information
    const invoiceItems: (InvoiceItem & { unit?: string })[] = items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      unit: item.unit // Include unit in the invoice item
    }));

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const gst = subtotal * 0.18;
    const totalAmount = subtotal + gst;

    const formattedDate = formatDate(formData.orderDate);
    const amountInWords = convertToIndianWords(totalAmount);

    const newInvoice: Invoice & { items: (InvoiceItem & { unit?: string })[] } = {
      id: formData.voucherNo,
      client: formData.consigneeName || formData.buyerName || formData.client,
      clientEmail: formData.clientEmail,
      amount: totalAmount,
      status: "pending",
      date: formattedDate,
      dueDate: formData.dueDate ? formatDate(formData.dueDate) : "",
      items: invoiceItems,
      tax: gst,
      discount: 0,
      serviceType: formData.serviceType,
      site: formData.destination,
      invoiceType: "perform",
      paymentTerms: formData.paymentTerms,
      
      // Sales Order specific fields
      voucherNo: formData.voucherNo,
      buyerRef: formData.buyerRef,
      consignee: formData.consigneeName,
      consigneeAddress: formData.consigneeAddress,
      consigneeGSTIN: formData.consigneeGSTIN,
      buyer: formData.buyerName,
      buyerAddress: formData.buyerAddress,
      buyerGSTIN: formData.buyerGSTIN,
      companyGSTIN: formData.companyGSTIN,
      companyState: formData.companyState,
      companyStateCode: formData.companyStateCode,
      email: formData.companyEmail,
      
      // Bank details
      accountHolder: formData.accountHolder,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      branchAndIFSC: formData.branchAndIFSC,
      
      // Additional fields
      notes: formData.otherReferences,
      dispatchedThrough: formData.dispatchedThrough,
      deliveryTerms: formData.deliveryTerms,
      amountInWords: amountInWords,
      
      // For backward compatibility
      servicePeriodFrom: "",
      servicePeriodTo: "",
      managementFeesPercent: 0,
      managementFeesAmount: 0,
      roundUp: 0,
      sacCode: "",
      panNumber: "",
      gstNumber: formData.companyGSTIN,
      serviceLocation: "",
      esicNumber: "",
      lwfNumber: "",
      pfNumber: "",
      ifscCode: "MAHB0001233",
      branch: "KALYANI NAGAR",
      clientAddress: formData.buyerAddress,
      invoiceNumber: formData.voucherNo,
      companyName: formData.companyName,
      companyAddress: formData.companyAddress,
    };
    
    // First generate PDF
    const pdfGenerated = generateSalesOrderPDF({
      ...newInvoice,
      items: invoiceItems,
      consigneeName: formData.consigneeName,
      consigneeAddress: formData.consigneeAddress,
      consigneeGSTIN: formData.consigneeGSTIN,
      buyerName: formData.buyerName,
      buyerAddress: formData.buyerAddress,
      buyerGSTIN: formData.buyerGSTIN,
      voucherNo: formData.voucherNo,
      date: formattedDate
    });
    
    if (pdfGenerated) {
      // Then save invoice to system
      onInvoiceCreate(newInvoice as Invoice);
      onClose();
      resetForm();
    }
  };

  // Function to download PDF only without saving to system
  const handleDownloadOnly = () => {
    const invoiceItems = items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      amount: item.amount
    }));

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const gst = subtotal * 0.18;
    const totalAmount = subtotal + gst;

    const formattedDate = formatDate(formData.orderDate);

    const tempInvoice = {
      id: formData.voucherNo,
      client: formData.consigneeName || formData.buyerName || formData.client,
      amount: totalAmount,
      date: formattedDate,
      items: invoiceItems,
      consigneeName: formData.consigneeName,
      consigneeAddress: formData.consigneeAddress,
      consigneeGSTIN: formData.consigneeGSTIN,
      consigneeState: formData.consigneeState,
      consigneeStateCode: formData.consigneeStateCode,
      buyerName: formData.buyerName,
      buyerAddress: formData.buyerAddress,
      buyerGSTIN: formData.buyerGSTIN,
      buyerState: formData.buyerState,
      buyerStateCode: formData.buyerStateCode,
      voucherNo: formData.voucherNo,
      buyerRef: formData.buyerRef,
      paymentTerms: formData.paymentTerms,
      notes: formData.otherReferences,
      site: formData.destination,
      dispatchedThrough: formData.dispatchedThrough,
      deliveryTerms: formData.deliveryTerms,
    };

    generateSalesOrderPDF(tempInvoice);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof PerformInvoiceItem, value: string | number) => {
    const newItems = [...items];
    const parsedValue = typeof value === 'string' ? (field === 'description' || field === 'unit' ? value : parseFloat(value) || 0) : value;
    
    newItems[index] = {
      ...newItems[index],
      [field]: parsedValue
    };

    if (field === 'rate' || field === 'quantity') {
      const item = newItems[index];
      newItems[index].amount = item.quantity * item.rate;
    }

    setItems(newItems);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setItems([{ description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }]);
    setFormData({
      companyName: "S K Enterprises",
      companyAddress: "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune",
      companyGSTIN: "27ALKPK7734N1ZE",
      companyState: "Maharashtra",
      companyStateCode: "27",
      companyEmail: "s.k.enterprises7583@gmail.com",
      
      consigneeName: "",
      consigneeAddress: "",
      consigneeGSTIN: "",
      consigneeState: "",
      consigneeStateCode: "",
      
      buyerName: "",
      buyerAddress: "",
      buyerGSTIN: "",
      buyerState: "",
      buyerStateCode: "",
      
      voucherNo: `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`,
      buyerRef: "",
      orderDate: new Date().toISOString().split('T')[0],
      dispatchedThrough: "",
      paymentTerms: "",
      otherReferences: "",
      destination: "",
      deliveryTerms: "",
      
      client: "",
      clientEmail: "",
      serviceType: "",
      dueDate: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      
      accountHolder: "S K ENTERPRISES",
      bankName: "BANK OF MAHARASHTRA",
      accountNumber: "CA 60168661338",
      branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
      authorisedSignatory: "",
      footerNote: "This is a Computer Generated Document",
      termsConditions: "E. & O.E"
    });
  };

  // Copy buyer details to consignee
  const handleCopyBuyerToConsignee = () => {
    setFormData(prev => ({
      ...prev,
      consigneeName: prev.buyerName,
      consigneeAddress: prev.buyerAddress,
      consigneeGSTIN: prev.buyerGSTIN,
      consigneeState: prev.buyerState,
      consigneeStateCode: prev.buyerStateCode
    }));
  };

  // Auto-generate voucher number
  const handleGenerateVoucherNo = () => {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    const formattedVoucherNo = `FY${nextYear}-${(nextYear + 1).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`;
    handleInputChange("voucherNo", formattedVoucherNo);
    if (!formData.buyerRef) {
      handleInputChange("buyerRef", formattedVoucherNo);
    }
  };

  const calculateSummary = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const gst = subtotal * 0.18;
    const totalAmount = subtotal + gst;

    return {
      subtotal,
      gst,
      totalAmount
    };
  };

  const summary = calculateSummary();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Perform Invoice / Sales Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Company Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyGSTIN">GSTIN/UIN</Label>
                <Input 
                  id="companyGSTIN" 
                  value={formData.companyGSTIN}
                  onChange={(e) => handleInputChange("companyGSTIN", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address (use Enter for new lines)</Label>
                <Textarea 
                  id="companyAddress" 
                  value={formData.companyAddress}
                  onChange={(e) => handleInputChange("companyAddress", e.target.value)}
                  rows={3}
                  required
                  placeholder="Line 1&#10;Line 2&#10;Line 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input 
                  id="companyEmail" 
                  value={formData.companyEmail}
                  onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                  type="email"
                  required
                />
              </div>
            </div>
          </div>

          {/* Consignee Details (Ship to) */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Consignee Details (Ship to)</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleCopyBuyerToConsignee}
              >
                Copy from Buyer
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consigneeName">Consignee Name *</Label>
                <Select 
                  value={formData.consigneeName}
                  onValueChange={(value) => handleInputChange("consigneeName", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select consignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consigneeGSTIN">Consignee GSTIN/UIN</Label>
                <Input 
                  id="consigneeGSTIN" 
                  value={formData.consigneeGSTIN}
                  onChange={(e) => handleInputChange("consigneeGSTIN", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consigneeAddress">Consignee Address (use Enter for new lines)</Label>
                <Textarea 
                  id="consigneeAddress" 
                  value={formData.consigneeAddress}
                  onChange={(e) => handleInputChange("consigneeAddress", e.target.value)}
                  rows={4}
                  placeholder="ALYSSUM DEVELOPERS PVT. LTD.&#10;OFFICE NO. 132/23, 133/1, 133/2/2/2, 133/3, 133/4, 169/1, 170/1, 171/1, 171/2, 172/1A, BEHIND SAYAJI-,&#10;HOTEL, PUNE-BANGLORE HIGHWAY, WAKAD, PUNE"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consigneeState">State Name</Label>
                  <Input 
                    id="consigneeState" 
                    value={formData.consigneeState}
                    onChange={(e) => handleInputChange("consigneeState", e.target.value)}
                    placeholder="Maharashtra"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consigneeStateCode">State Code</Label>
                  <Input 
                    id="consigneeStateCode" 
                    value={formData.consigneeStateCode}
                    onChange={(e) => handleInputChange("consigneeStateCode", e.target.value)}
                    placeholder="27"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Details (Bill to) */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Buyer Details (Bill to)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Name *</Label>
                <Select 
                  value={formData.buyerName}
                  onValueChange={(value) => handleInputChange("buyerName", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerGSTIN">Buyer GSTIN/UIN</Label>
                <Input 
                  id="buyerGSTIN" 
                  value={formData.buyerGSTIN}
                  onChange={(e) => handleInputChange("buyerGSTIN", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerAddress">Buyer Address (use Enter for new lines)</Label>
                <Textarea 
                  id="buyerAddress" 
                  value={formData.buyerAddress}
                  onChange={(e) => handleInputChange("buyerAddress", e.target.value)}
                  rows={4}
                  placeholder="ALYSSUM DEVELOPERS PVT. LTD.&#10;OFFICE NO. 132/23, 133/1, 133/2/2/2, 133/3, 133/4, 169/1, 170/1, 171/1, 171/2, 172/1A, BEHIND SAYAJI-,&#10;HOTEL, PUNE-BANGLORE HIGHWAY, WAKAD, PUNE"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerState">State Name</Label>
                  <Input 
                    id="buyerState" 
                    value={formData.buyerState}
                    onChange={(e) => handleInputChange("buyerState", e.target.value)}
                    placeholder="Maharashtra"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerStateCode">State Code</Label>
                  <Input 
                    id="buyerStateCode" 
                    value={formData.buyerStateCode}
                    onChange={(e) => handleInputChange("buyerStateCode", e.target.value)}
                    placeholder="27"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="voucherNo">Voucher No. *</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleGenerateVoucherNo}
                    className="h-6 px-2 text-xs"
                  >
                    Auto-generate
                  </Button>
                </div>
                <Input 
                  id="voucherNo" 
                  value={formData.voucherNo}
                  onChange={(e) => handleInputChange("voucherNo", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerRef">Buyer's Ref./Order No.</Label>
                <Input 
                  id="buyerRef" 
                  value={formData.buyerRef}
                  onChange={(e) => handleInputChange("buyerRef", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Dated *</Label>
                <Input 
                  id="orderDate" 
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  type="date" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatchedThrough">Dispatched through</Label>
                <Input 
                  id="dispatchedThrough" 
                  value={formData.dispatchedThrough}
                  onChange={(e) => handleInputChange("dispatchedThrough", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Mode/Terms of Payment</Label>
                <Input 
                  id="paymentTerms" 
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input 
                  id="destination" 
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherReferences">Other References</Label>
                <Input 
                  id="otherReferences" 
                  value={formData.otherReferences}
                  onChange={(e) => handleInputChange("otherReferences", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryTerms">Terms of Delivery</Label>
                <Input 
                  id="deliveryTerms" 
                  value={formData.deliveryTerms}
                  onChange={(e) => handleInputChange("deliveryTerms", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <Label className="text-lg font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead>Description of Goods</TableHead>
                    <TableHead className="w-32">Quantity</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-32">Rate per</TableHead>
                    <TableHead className="w-32">Amount (₹)</TableHead>
                    <TableHead className="w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Description of goods"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(index, 'unit', value)}
                        >
                          <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="Can">Can</SelectItem>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="Pair">Pair</SelectItem>
                            <SelectItem value="Ltr">Ltr</SelectItem>
                            <SelectItem value="Set">Set</SelectItem>
                            <SelectItem value="Piece">Piece</SelectItem>
                            <SelectItem value="Box">Box</SelectItem>
                            <SelectItem value="Meter">Meter</SelectItem>
                            <SelectItem value="Roll">Roll</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder's Name</Label>
                <Input 
                  id="accountHolder" 
                  value={formData.accountHolder}
                  onChange={(e) => handleInputChange("accountHolder", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input 
                  id="bankName" 
                  value={formData.bankName}
                  onChange={(e) => handleInputChange("bankName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input 
                  id="accountNumber" 
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchAndIFSC">Branch & IFS Code</Label>
                <Input 
                  id="branchAndIFSC" 
                  value={formData.branchAndIFSC}
                  onChange={(e) => handleInputChange("branchAndIFSC", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ₹{summary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>GST (18%):</span>
                <span className="font-medium">
                  ₹{summary.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-bold text-lg">Total Amount:</span>
                <span className="text-xl font-bold text-primary">
                  ₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-md text-sm">
              <div className="font-medium mb-1">Amount in Words:</div>
              <div>{convertToIndianWords(summary.totalAmount)}</div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="termsConditions">Terms & Conditions</Label>
            <Textarea 
              id="termsConditions"
              value={formData.termsConditions}
              onChange={(e) => handleInputChange("termsConditions", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Create & Download PDF
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDownloadOnly}
              className="flex-1"
              disabled={items.length === 0 || !formData.consigneeName}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF Only
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
              Reset Form
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};