


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Download, FileText } from "lucide-react";
import { Invoice, InvoiceItem } from "../Billing";
import jsPDF from "jspdf";
import { formatCurrency, formatDate, convertToIndianWords, calculateDueDate } from "../../../utils/formatters";

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
  onInvoiceCreate: (invoice: Invoice) => Promise<boolean>;
  performInvoicesCount: number;
   userId?: string;  // Add this
  userRole?: string; // Add this

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
    
    // Client details
    clientEmail: "",
    serviceType: "",
    
    // Bank details
    accountHolder: "S K ENTEPRISES",
    bankName: "BANK OF MAHARASHTRA",
    accountNumber: "CA 60168661338",
    branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
    authorisedSignatory: "",
    footerNote: "This is a Computer Generated Document",
    termsConditions: "E. & O.E"
  });

  const [loading, setLoading] = useState(false);

  // Generate Sales Order PDF
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
      addText("SALES ORDER", pageWidth / 2, yPos, { 
        size: 16, 
        style: 'bold', 
        align: 'center' 
      });
      yPos += 8;
      
      addText(formData.companyName || "S K Enterprises", pageWidth / 2, yPos, { 
        size: 12, 
        style: 'bold', 
        align: 'center' 
      });
      yPos += 6;
      
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
      
      addText(`GSTIN/UIN: ${formData.companyGSTIN || "27ALKPK7734N1ZE"}`, pageWidth / 2, yPos, { 
        size: 9, 
        align: 'center' 
      });
      yPos += 4;
      
      addText(`State Name : ${formData.companyState || "Maharashtra"}, Code : ${formData.companyStateCode || "27"}`, 
        pageWidth / 2, yPos, { 
          size: 9, 
          align: 'center' 
        });
      yPos += 4;
      
      addText(`E-Mail : ${formData.companyEmail || "s.k.enterprises7583@gmail.com"}`, 
        pageWidth / 2, yPos, { 
          size: 9, 
          align: 'center' 
        });
      yPos += 10;

      // ==================== CONSIGNEE SECTION ====================
      addText("Consignee (Ship to)", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 5;
      
      const consigneeName = formData.consigneeName || formData.buyerName || "";
      addText(consigneeName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      if (formData.consigneeAddress) {
        const consigneeAddressLines = formData.consigneeAddress.split('\n');
        consigneeAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
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
      addText("Buyer (Bill to)", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 5;
      
      const buyerName = formData.buyerName || "";
      addText(buyerName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      if (formData.buyerAddress) {
        const buyerAddressLines = formData.buyerAddress.split('\n');
        buyerAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
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

      // ==================== ORDER DETAILS ====================
      const orderDetailsY = yPos;
      const col1X = leftMargin;
      const col2X = leftMargin + contentWidth * 0.6;
      
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
      
      addText("Mode/Terms of Payment", col2X, orderDetailsY, { size: 9 });
      addText(formData.paymentTerms || "", col2X + 45, orderDetailsY, { size: 9 });
      
      addText("Other References", col2X, orderDetailsY + 6, { size: 9 });
      addText(formData.otherReferences || "", col2X + 45, orderDetailsY + 6, { size: 9 });
      
      addText("Destination", col2X, orderDetailsY + 12, { size: 9 });
      addText(formData.destination || "", col2X + 45, orderDetailsY + 12, { size: 9 });
      
      addText("Terms of Delivery", col2X, orderDetailsY + 18, { size: 9 });
      addText(formData.deliveryTerms || "", col2X + 45, orderDetailsY + 18, { size: 9 });

      yPos = orderDetailsY + 24;

      // ==================== ITEMS TABLE ====================
      const columnPositions = {
        slNo: leftMargin + 5,
        description: leftMargin + 15,
        quantity: leftMargin + 110,
        unit: leftMargin + 130,
        rate: leftMargin + 150,
        amount: leftMargin + 175
      };

      drawLine(yPos);
      yPos += 8;

      addText("Sl No.", columnPositions.slNo, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Description of Goods", columnPositions.description, yPos, { size: 9, style: 'bold', align: 'left' });
      addText("Quantity", columnPositions.quantity, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Unit", columnPositions.unit, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Rate per", columnPositions.rate, yPos, { size: 9, style: 'bold', align: 'right' });
      addText("Amount", columnPositions.amount, yPos, { size: 9, style: 'bold', align: 'right' });
      
      yPos += 3;
      drawLine(yPos);
      yPos += 6;

      items.forEach((item, index) => {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 20;
          addText("Continued...", pageWidth / 2, yPos, { size: 10, align: 'center' });
          yPos += 15;
          
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

        addText(`${index + 1}`, columnPositions.slNo, yPos, { size: 9, align: 'center' });
        addText(item.description || "", columnPositions.description, yPos, { 
          size: 9,
          align: 'left'
        });
        addText(`${item.quantity}`, columnPositions.quantity, yPos, { 
          size: 9,
          align: 'center'
        });
        addText(item.unit || "No", columnPositions.unit, yPos, { 
          size: 9,
          align: 'center'
        });
        addText(formatCurrency(item.rate), columnPositions.rate, yPos, { 
          size: 9,
          align: 'right'
        });
        addText(formatCurrency(item.amount), columnPositions.amount, yPos, { 
          size: 9,
          align: 'right'
        });
        
        yPos += 8;
      });

      drawLine(yPos);
      yPos += 8;

      // ==================== TOTAL SECTION ====================
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const gst = subtotal * 0.18;
      const totalAmount = subtotal + gst;
      
      addText("Total", columnPositions.rate - 5, yPos, { 
        size: 10, 
        style: 'bold',
        align: 'left'
      });
      
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
      addText("Company's Bank Details", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 6;
      
      addText(`A/c Holder's Name : ${formData.accountHolder || "S K ENTEPRISES"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Bank Name : ${formData.bankName || "BANK OF MAHARASHTRA"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`A/c No. : ${formData.accountNumber || "CA 60168661338"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Branch & IFS Code : ${formData.branchAndIFSC || "KALYANI NAGAR & MAHB0001233"}`, leftMargin, yPos, { size: 9 });
      yPos += 12;

      // ==================== SIGNATURE SECTION ====================
      const signatureY = pageHeight - 40;
      drawLine(signatureY - 10);
      
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.consigneeName && !formData.buyerName) {
      alert("Please enter either Consignee Name or Buyer Name");
      return;
    }
    
    if (items.length === 0 || items.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      alert("Please add valid items with description, quantity, and rate");
      return;
    }
    
    setLoading(true);

    try {
      // Calculate amounts
      const invoiceItems: InvoiceItem[] = items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
        unit: item.unit
      }));

      const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
      const gst = subtotal * 0.18;
      const totalAmount = subtotal + gst;
      const formattedDate = formatDate(formData.orderDate);
      const dueDate = calculateDueDate(formData.orderDate, 30);
      const amountInWords = convertToIndianWords(totalAmount);

      const newInvoice: Invoice = {
        id: formData.voucherNo,
        invoiceNumber: formData.voucherNo,
        voucherNo: formData.voucherNo,
        invoiceType: "perform",
        status: "pending",
        
        // Client info
        client: formData.consigneeName || formData.buyerName || "",
        clientEmail: formData.clientEmail,
        clientAddress: formData.buyerAddress,
        
        // Company info
        companyName: formData.companyName,
        companyAddress: formData.companyAddress,
        companyGSTIN: formData.companyGSTIN,
        companyState: formData.companyState,
        companyStateCode: formData.companyStateCode,
        companyEmail: formData.companyEmail,
        
        // Consignee info
        consignee: formData.consigneeName,
        consigneeAddress: formData.consigneeAddress,
        consigneeGSTIN: formData.consigneeGSTIN,
        consigneeState: formData.consigneeState,
        consigneeStateCode: formData.consigneeStateCode,
        
        // Buyer info
        buyer: formData.buyerName,
        buyerAddress: formData.buyerAddress,
        buyerGSTIN: formData.buyerGSTIN,
        buyerState: formData.buyerState,
        buyerStateCode: formData.buyerStateCode,
        
        // Order details
        buyerRef: formData.buyerRef,
        dispatchedThrough: formData.dispatchedThrough,
        paymentTerms: formData.paymentTerms,
        notes: formData.otherReferences,
        site: formData.destination,
        destination: formData.destination,
        deliveryTerms: formData.deliveryTerms,
        serviceType: formData.serviceType,
        
        // Items
        items: invoiceItems,
        
        // Financials
        subtotal: subtotal,
        tax: gst,
        discount: 0,
        amount: totalAmount,
        roundUp: 0,
        
        // Dates
        date: formattedDate,
        dueDate: dueDate,
        
        // Bank details
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: "MAHB0001233",
        branch: "KALYANI NAGAR",
        accountHolder: formData.accountHolder,
        branchAndIFSC: formData.branchAndIFSC,
        
        // Additional
        amountInWords: amountInWords,
        termsConditions: formData.termsConditions,
        footerNote: formData.footerNote,
        
        // Initialize other fields
        managementFeesPercent: 0,
        managementFeesAmount: 0,
        sacCode: "",
        panNumber: "",
        gstNumber: formData.companyGSTIN,
        serviceLocation: "",
        esicNumber: "",
        lwfNumber: "",
        pfNumber: "",
        servicePeriodFrom: "",
        servicePeriodTo: ""
      };
      
      // First generate PDF
      generateSalesOrderPDF(newInvoice);
      
      // Then save to database
      const success = await onInvoiceCreate(newInvoice);
      
      if (success) {
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
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
    const parsedValue = typeof value === 'string' ? 
      (field === 'description' || field === 'unit' ? value : parseFloat(value) || 0) : value;
    
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
      
      clientEmail: "",
      serviceType: "",
      
      accountHolder: "S K ENTERPRISES",
      bankName: "BANK OF MAHARASHTRA",
      accountNumber: "CA 60168661338",
      branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
      authorisedSignatory: "",
      footerNote: "This is a Computer Generated Document",
      termsConditions: "E. & O.E"
    });
  };

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
          <DialogTitle>Create Perform Invoice / Sales Orders</DialogTitle>
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

          {/* Consignee Details */}
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
                <Input
                  id="consigneeName"
                  value={formData.consigneeName}
                  onChange={(e) => handleInputChange("consigneeName", e.target.value)}
                  placeholder="Consignee name"
                />
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
                <Label htmlFor="consigneeAddress">Consignee Address</Label>
                <Textarea 
                  id="consigneeAddress" 
                  value={formData.consigneeAddress}
                  onChange={(e) => handleInputChange("consigneeAddress", e.target.value)}
                  rows={3}
                  placeholder="Enter consignee address"
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

          {/* Buyer Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Buyer Details (Bill to)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Name *</Label>
                <Input
                  id="buyerName"
                  value={formData.buyerName}
                  onChange={(e) => handleInputChange("buyerName", e.target.value)}
                  placeholder="Buyer name"
                  required
                />
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
                <Label htmlFor="buyerAddress">Buyer Address</Label>
                <Textarea 
                  id="buyerAddress" 
                  value={formData.buyerAddress}
                  onChange={(e) => handleInputChange("buyerAddress", e.target.value)}
                  rows={3}
                  placeholder="Enter buyer address"
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
                <Label htmlFor="serviceType">Service Type</Label>
                <Input 
                  id="serviceType" 
                  value={formData.serviceType}
                  onChange={(e) => handleInputChange("serviceType", e.target.value)}
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
            <Button type="submit" className="flex-1" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create & Download PDF'}
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