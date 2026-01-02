import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Download, Search, ChevronLeft, ChevronRight, List, Grid, FileText, Receipt } from "lucide-react";
import { Invoice, getServiceIcon, getStatusColor, formatCurrency } from "../Billing";
import { PerformInvoiceForm } from "./PerformInvoiceForm";
import { TaxInvoiceForm } from "./TaxInvoiceForm";
import jsPDF from "jspdf";

interface InvoicesTabProps {
  invoices: Invoice[];
  onInvoiceCreate: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string) => void;
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  onInvoiceCreate,
  onMarkAsPaid
}) => {
  const [performInvoiceDialogOpen, setPerformInvoiceDialogOpen] = useState(false);
  const [taxInvoiceDialogOpen, setTaxInvoiceDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Format date to DD-MMM-YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Generate Sales Order PDF for existing invoices
  const generateSalesOrderPDF = (invoice: Invoice) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
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
        doc.setFontSize(options.size || 10);
        doc.setFont(options.font || "helvetica", options.style || "normal");
        doc.setTextColor(options.color || 0, 0, 0);
        doc.text(text, x, y, { align: options.align || 'left' });
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
      addText(invoice.companyName || "S K Enterprises", pageWidth / 2, yPos, { 
        size: 12, 
        style: 'bold', 
        align: 'center' 
      });
      yPos += 6;
      
      // Company Address
      const companyAddress = invoice.companyAddress || "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune";
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
      addText(`GSTIN/UIN: ${invoice.companyGSTIN || "27ALKPK7734N1ZE"}`, pageWidth / 2, yPos, { 
        size: 9, 
        align: 'center' 
      });
      yPos += 4;
      
      // State and Code
      addText(`State Name : ${invoice.companyState || "Maharashtra"}, Code : ${invoice.companyStateCode || "27"}`, 
        pageWidth / 2, yPos, { 
          size: 9, 
          align: 'center' 
        });
      yPos += 4;
      
      // Email
      addText(`E-Mail : ${invoice.email || "s.k.enterprises7583@gmail.com"}`, 
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
      const consigneeName = invoice.consignee || invoice.client || "";
      addText(consigneeName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      // Consignee Address
      if (invoice.consigneeAddress) {
        const consigneeAddressLines = invoice.consigneeAddress.split('\n');
        consigneeAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
      // Consignee GSTIN
      if (invoice.consigneeGSTIN) {
        addText(`GSTIN/UIN : ${invoice.consigneeGSTIN}`, leftMargin, yPos, { size: 9 });
        yPos += 4;
      }
      
      if (invoice.consigneeState && invoice.consigneeStateCode) {
        addText(`State Name : ${invoice.consigneeState}, Code : ${invoice.consigneeStateCode}`, 
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
      const buyerName = invoice.buyer || invoice.client || "";
      addText(buyerName, leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 4;
      
      // Buyer Address
      if (invoice.buyerAddress) {
        const buyerAddressLines = invoice.buyerAddress.split('\n');
        buyerAddressLines.forEach((line: string) => {
          addText(line, leftMargin, yPos, { size: 9 });
          yPos += 4;
        });
      }
      
      // Buyer GSTIN
      if (invoice.buyerGSTIN) {
        addText(`GSTIN/UIN : ${invoice.buyerGSTIN}`, leftMargin, yPos, { size: 9 });
        yPos += 4;
      }
      
      if (invoice.buyerState && invoice.buyerStateCode) {
        addText(`State Name : ${invoice.buyerState}, Code : ${invoice.buyerStateCode}`, 
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
      addText(invoice.voucherNo || invoice.id || "", col1X + 40, orderDetailsY, { 
        size: 9, 
        style: 'bold' 
      });
      
      addText("Buyer's Ref./Order No.", col1X, orderDetailsY + 6, { size: 9 });
      addText(invoice.buyerRef || invoice.voucherNo || "", col1X + 40, orderDetailsY + 6, { size: 9 });
      
      addText("Dispatched through", col1X, orderDetailsY + 12, { size: 9 });
      addText(invoice.dispatchedThrough || "", col1X + 40, orderDetailsY + 12, { size: 9 });
      
      addText("Dated", col1X, orderDetailsY + 18, { size: 9 });
      addText(invoice.date || "", col1X + 40, orderDetailsY + 18, { size: 9 });
      
      // Column 2 - Right side
      addText("Mode/Terms of Payment", col2X, orderDetailsY, { size: 9 });
      addText(invoice.paymentTerms || "", col2X + 50, orderDetailsY, { size: 9 });
      
      addText("Other References", col2X, orderDetailsY + 6, { size: 9 });
      addText(invoice.notes || "", col2X + 50, orderDetailsY + 6, { size: 9 });
      
      addText("Destination", col2X, orderDetailsY + 12, { size: 9 });
      addText(invoice.site || invoice.destination || "", col2X + 50, orderDetailsY + 12, { size: 9 });
      
      addText("Terms of Delivery", col2X, orderDetailsY + 18, { size: 9 });
      addText(invoice.deliveryTerms || "", col2X + 50, orderDetailsY + 18, { size: 9 });

      yPos = orderDetailsY + 24;

      // ==================== ITEMS TABLE HEADER ====================
      // Table Headers - Fixed aligned positions
      const columnPositions = {
        slNo: leftMargin + 5,
        description: leftMargin + 20,
        quantity: leftMargin + 130,
        rate: leftMargin + 155,
        amount: leftMargin + 180
      };

      // Draw header line
      drawLine(yPos);
      yPos += 8;

      // Table headers - All aligned properly
      addText("Sl No.", columnPositions.slNo, yPos, { size: 9, style: 'bold', align: 'center' });
      addText("Description of Goods", columnPositions.description, yPos, { size: 9, style: 'bold', align: 'left' });
      addText("Quantity", columnPositions.quantity, yPos, { size: 9, style: 'bold', align: 'right' });
      addText("Rate per", columnPositions.rate, yPos, { size: 9, style: 'bold', align: 'right' });
      addText("Amount", columnPositions.amount, yPos, { size: 9, style: 'bold', align: 'right' });
      
      yPos += 3;
      drawLine(yPos);
      yPos += 6;

      // ==================== ITEMS TABLE ROWS ====================
      // CHECKPOINT: This is where we need to handle the unit display
      // The invoice items should have a 'unit' property
      invoice.items.forEach((item, index) => {
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
          addText("Quantity", columnPositions.quantity, yPos, { size: 9, style: 'bold', align: 'right' });
          addText("Rate per", columnPositions.rate, yPos, { size: 9, style: 'bold', align: 'right' });
          addText("Amount", columnPositions.amount, yPos, { size: 9, style: 'bold', align: 'right' });
          yPos += 3;
          drawLine(yPos);
          yPos += 6;
        }

        // Serial Number - Centered
        addText(`${index + 1}`, columnPositions.slNo, yPos, { size: 9, align: 'center' });
        
        // Description - Left aligned
        let description = item.description || "";
        let unit = "No";
        
        // Extract unit from description or use item.unit if available
        // First check if item has a unit property (for newly created invoices)
        if ((item as any).unit) {
          unit = (item as any).unit;
        } else {
          // Fallback: Try to extract unit from description for backward compatibility
          const unitMatch = description.match(/\s(\w+)$/);
          if (unitMatch) {
            unit = unitMatch[1];
            description = description.replace(/\s\w+$/, '');
          }
        }
        
        // Display description without unit in description column
        addText(description, columnPositions.description, yPos, { size: 9, align: 'left' });
        
        // Quantity with unit in the same cell but on different lines
        // First line: Quantity value
        addText(`${item.quantity}`, columnPositions.quantity, yPos, { size: 9, align: 'right' });
        
        // Rate per - Right aligned
        addText(formatCurrency(item.rate), columnPositions.rate, yPos, { size: 9, align: 'right' });
        
        // Amount - Right aligned
        addText(formatCurrency(item.amount), columnPositions.amount, yPos, { size: 9, align: 'right' });
        
        // Add unit on the next line under quantity column
        yPos += 4;
        addText(unit, columnPositions.quantity, yPos, { size: 8, align: 'right', style: 'italic' });
        
        yPos += 6;
      });

      // Draw line after items
      drawLine(yPos);
      yPos += 8;

      // ==================== TOTAL SECTION ====================
      const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      
      // Total label
      addText("Total", columnPositions.description, yPos, { size: 10, style: 'bold', align: 'left' });
      
      // Total amount
      addText(formatCurrency(invoice.amount), columnPositions.amount, yPos, { 
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
      
      const amountInWords = invoice.amountInWords || convertToIndianWords(invoice.amount);
      const wordsLines = doc.splitTextToSize(amountInWords, contentWidth);
      wordsLines.forEach((line: string) => {
        addText(line, leftMargin, yPos, { size: 9 });
        yPos += 4;
      });

      yPos += 8;

      // ==================== TERMS & CONDITIONS ====================
      addText("E. & O.E", leftMargin, yPos, { size: 9, style: 'italic' });
      yPos += 8;

      // ==================== BANK DETAILS ====================
      // Section title
      addText("Company's Bank Details", leftMargin, yPos, { 
        size: 10, 
        style: 'bold' 
      });
      yPos += 6;
      
      // Bank details
      addText(`A/c Holder's Name : ${invoice.accountHolder || "S K ENTEPRISES"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Bank Name : ${invoice.bankName || "BANK OF MAHARASHTRA"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`A/c No. : ${invoice.accountNumber || "CA 60168661338"}`, leftMargin, yPos, { size: 9 });
      yPos += 4;
      
      addText(`Branch & IFS Code : ${invoice.branchAndIFSC || "KALYANI NAGAR & MAHB0001233"}`, leftMargin, yPos, { size: 9 });
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
      
      addText("This is a Computer Generated Document", pageWidth / 2, footerY, { 
        size: 8, 
        style: 'italic', 
        align: 'center' 
      });

      // ==================== SAVE PDF ====================
      const fileName = `Sales_Order_${invoice.voucherNo || invoice.id}_${invoice.date || formatDate(new Date().toISOString())}.pdf`;
      doc.save(fileName);
      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please check the console for details.");
      return false;
    }
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

  // Download Invoice Function
  const handleDownloadInvoice = (invoice: Invoice) => {
    try {
      generateSalesOrderPDF(invoice);
    } catch (error) {
      console.error("Error generating PDF:", error);
      // Fallback to simple print
      const htmlContent = generateInvoiceHTML(invoice);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // HTML generation fallback (for print)
  const generateInvoiceHTML = (invoice: Invoice) => {
    const items = invoice.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td align="right">${item.quantity}</td>
        <td align="right">${formatCurrency(item.rate)}</td>
        <td align="right">${formatCurrency(item.amount)}</td>
      </tr>
    `).join('');

    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    
    const taxDetails = invoice.invoiceType === "tax" ? `
      <tr><td colspan="3">Management Fees (${invoice.managementFeesPercent || 5}%)</td><td align="right">${formatCurrency(invoice.managementFeesAmount || 0)}</td></tr>
      <tr><td colspan="3">SGST @9%</td><td align="right">${formatCurrency(invoice.tax / 2)}</td></tr>
      <tr><td colspan="3">CGST @9%</td><td align="right">${formatCurrency(invoice.tax / 2)}</td></tr>
      <tr><td colspan="3">Round Up</td><td align="right">${formatCurrency(invoice.roundUp || 0)}</td></tr>
    ` : `
      <tr><td colspan="3">GST (18%)</td><td align="right">${formatCurrency(invoice.tax)}</td></tr>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoice.invoiceType === "tax" ? "Tax Invoice" : "Sales Order"} - ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-title { font-size: 24px; font-weight: bold; }
            .company-name { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .details { margin: 20px 0; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 8px; vertical-align: top; }
            .items { margin: 20px 0; }
            .items table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
            .items th { background-color: #f2f2f2; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .items td { padding: 10px; border-bottom: 1px solid #ddd; }
            .total { margin-top: 30px; text-align: right; }
            .total table { margin-left: auto; width: 300px; }
            .total td { padding: 5px; }
            .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">S K ENTERPRISES</div>
            <div class="invoice-title">SALES ORDER</div>
            <div>Office No 505, 5th Floor, Global Square</div>
            <div>Deccan College Road, Yerwada, Pune</div>
            <div>GSTIN/UIN: 27ALKPK7734N1ZE</div>
          </div>

          <div class="details">
            <table>
              <tr>
                <td width="50%">
                  <strong>Consignee (Ship to):</strong><br>
                  ${invoice.consignee || invoice.client}<br>
                  ${invoice.consigneeAddress || ''}
                </td>
                <td width="50%" align="right">
                  <strong>Order Details:</strong><br>
                  Voucher No: ${invoice.voucherNo || invoice.id}<br>
                  Date: ${invoice.date}<br>
                  Buyer's Ref: ${invoice.buyerRef || ''}<br>
                  ${invoice.paymentTerms ? `Payment Terms: ${invoice.paymentTerms}<br>` : ''}
                </td>
              </tr>
            </table>
          </div>

          <div class="items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th align="right">Quantity</th>
                  <th align="right">Rate (₹)</th>
                  <th align="right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${items}
              </tbody>
            </table>
          </div>

          <div class="total">
            <table>
              <tr><td>Subtotal:</td><td align="right">${formatCurrency(subtotal)}</td></tr>
              ${taxDetails}
              <tr class="grand-total"><td>Total:</td><td align="right">${formatCurrency(invoice.amount)}</td></tr>
            </table>
          </div>

          <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
            This is a Computer Generated Document
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()">Print Invoice</button>
            <button onclick="window.close()" style="margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `;
  };

  // Filter invoices by type
  const performInvoices = invoices.filter(inv => inv.invoiceType === "perform");
  const taxInvoices = invoices.filter(inv => inv.invoiceType === "tax");

  const getFilteredInvoices = (invoiceList: Invoice[]) => {
    return invoiceList.filter(invoice => 
      invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.site?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.voucherNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPaginatedData = (data: Invoice[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = (data: Invoice[]) => Math.ceil(data.length / itemsPerPage);

  const filteredPerformInvoices = getFilteredInvoices(performInvoices);
  const filteredTaxInvoices = getFilteredInvoices(taxInvoices);
  const paginatedPerformInvoices = getPaginatedData(filteredPerformInvoices);
  const paginatedTaxInvoices = getPaginatedData(filteredTaxInvoices);

  // Render tables based on view mode
  const renderTable = (invoicesToShow: Invoice[]) => {
    if (viewMode === "table") {
      return (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Invoice ID</TableHead>
                  <TableHead className="min-w-[150px]">Client</TableHead>
                  <TableHead className="min-w-[120px]">Voucher No</TableHead>
                  <TableHead className="min-w-[100px]">Amount</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[100px]">Type</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesToShow.map((invoice) => (
                  <TableRow key={invoice.id} className={
                    invoice.status === "overdue" ? "bg-red-50 hover:bg-red-100" :
                    invoice.status === "pending" ? "bg-yellow-50 hover:bg-yellow-100" : ""
                  }>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.client}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px]">{invoice.clientEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{invoice.voucherNo || invoice.id}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.invoiceType === "tax" ? "secondary" : "outline"}>
                        {invoice.invoiceType === "tax" ? "Tax" : "Sales"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPreviewDialogOpen(true);
                          }}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="h-8 px-2"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.status !== "paid" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onMarkAsPaid(invoice.id)}
                            className="h-8 px-2"
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invoicesToShow.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, invoicesToShow.length)} of {invoicesToShow.length} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages(invoicesToShow)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(invoicesToShow)))}
                  disabled={currentPage === totalPages(invoicesToShow)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      );
    } else {
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {invoicesToShow.map((invoice) => (
              <Card key={invoice.id} className={`hover:shadow-md transition-shadow ${
                invoice.status === "overdue" ? "border-red-200 bg-red-50" :
                invoice.status === "pending" ? "border-yellow-200 bg-yellow-50" : ""
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base truncate">{invoice.id}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">{invoice.client}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                      <Badge variant={invoice.invoiceType === "tax" ? "secondary" : "outline"} className="text-xs">
                        {invoice.invoiceType === "tax" ? "Tax" : "Sales"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium">Voucher: {invoice.voucherNo || invoice.id}</div>
                    <div>Date: {invoice.date}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="truncate max-w-[150px]">{invoice.serviceType}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">{formatCurrency(invoice.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.items.length} items
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleDownloadInvoice(invoice)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {invoice.status !== "paid" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => onMarkAsPaid(invoice.id)}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {invoicesToShow.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, invoicesToShow.length)} of {invoicesToShow.length} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages(invoicesToShow)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(invoicesToShow)))}
                  disabled={currentPage === totalPages(invoicesToShow)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      );
    }
  };

  const renderEmptyState = (type: "perform" | "tax") => {
    const typeName = type === "perform" ? "Sales Order" : "Tax";
    
    return (
      <div className="text-center py-8">
        <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No {typeName.toLowerCase()} invoices found</h3>
        <p className="text-muted-foreground">
          {searchTerm ? "Try adjusting your search terms" : `Get started by creating your first ${typeName.toLowerCase()} invoice`}
        </p>
        {!searchTerm && (
          <Button 
            className="mt-4" 
            onClick={() => type === "perform" ? setPerformInvoiceDialogOpen(true) : setTaxInvoiceDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create {typeName} Invoice
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <CardTitle>Invoice Management</CardTitle>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="h-8 px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Sales Order Button */}
            <Button 
              variant="outline" 
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={() => setPerformInvoiceDialogOpen(true)}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Performance Invoice</span>
              <span className="sm:hidden">Sales</span>
            </Button>

            {/* Tax Invoice Button */}
            <Button 
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={() => setTaxInvoiceDialogOpen(true)}
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Tax Invoice</span>
              <span className="sm:hidden">Tax</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="perform" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="perform" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Performance invoice</span>
                <span className="sm:hidden">Sales</span>
                <Badge variant="secondary" className="ml-2">
                  {performInvoices.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Tax Invoices</span>
                <span className="sm:hidden">Tax</span>
                <Badge variant="secondary" className="ml-2">
                  {taxInvoices.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            {/* Sales Orders Tab */}
            <TabsContent value="perform" className="space-y-4">
              {searchTerm && filteredPerformInvoices.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    Showing {filteredPerformInvoices.length} of {performInvoices.length} Performance invoice matching "{searchTerm}"
                  </p>
                </div>
              )}
              
              {filteredPerformInvoices.length > 0 ? (
                renderTable(paginatedPerformInvoices)
              ) : (
                renderEmptyState("perform")
              )}
            </TabsContent>
            
            {/* Tax Invoices Tab */}
            <TabsContent value="tax" className="space-y-4">
              {searchTerm && filteredTaxInvoices.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    Showing {filteredTaxInvoices.length} of {taxInvoices.length} tax invoices matching "{searchTerm}"
                  </p>
                </div>
              )}
              
              {filteredTaxInvoices.length > 0 ? (
                renderTable(paginatedTaxInvoices)
              ) : (
                renderEmptyState("tax")
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import the Forms */}
      <PerformInvoiceForm
        isOpen={performInvoiceDialogOpen}
        onClose={() => setPerformInvoiceDialogOpen(false)}
        onInvoiceCreate={onInvoiceCreate}
        performInvoicesCount={performInvoices.length}
      />

      <TaxInvoiceForm
        isOpen={taxInvoiceDialogOpen}
        onClose={() => setTaxInvoiceDialogOpen(false)}
        onInvoiceCreate={onInvoiceCreate}
        taxInvoicesCount={taxInvoices.length}
      />

      {/* Invoice Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview - {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 border rounded-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedInvoice.invoiceType === "tax" ? "TAX INVOICE" : "SALES ORDER"}
                  </h2>
                  <p className="text-muted-foreground">{selectedInvoice.id}</p>
                  {selectedInvoice.voucherNo && selectedInvoice.voucherNo !== selectedInvoice.id && (
                    <p className="text-muted-foreground">Voucher: {selectedInvoice.voucherNo}</p>
                  )}
                </div>
                <Badge variant={getStatusColor(selectedInvoice.status)}>
                  {selectedInvoice.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Consignee (Ship to):</p>
                  <p className="font-semibold text-lg">{selectedInvoice.consignee || selectedInvoice.client}</p>
                  <p className="text-muted-foreground">{selectedInvoice.clientEmail}</p>
                  {selectedInvoice.consigneeAddress && <p className="text-sm mt-1 whitespace-pre-line">{selectedInvoice.consigneeAddress}</p>}
                  {selectedInvoice.consigneeGSTIN && <p className="text-sm mt-1">GSTIN: {selectedInvoice.consigneeGSTIN}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-medium">{selectedInvoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium">{selectedInvoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Type:</span>
                    <span className="font-medium">{selectedInvoice.serviceType}</span>
                  </div>
                  {selectedInvoice.buyerRef && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer's Ref:</span>
                      <span className="font-medium">{selectedInvoice.buyerRef}</span>
                    </div>
                  )}
                  {selectedInvoice.paymentTerms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms:</span>
                      <span className="font-medium">{selectedInvoice.paymentTerms}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate (₹)</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 border-t pt-4">
                <div className="space-y-2">
                  {selectedInvoice.paymentTerms && (
                    <div className="text-sm">
                      <p className="font-medium">Payment Terms: {selectedInvoice.paymentTerms}</p>
                    </div>
                  )}
                  {selectedInvoice.status !== "paid" && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        onMarkAsPaid(selectedInvoice.id);
                        setPreviewDialogOpen(false);
                      }}
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
                <div className="text-right space-y-2 min-w-[300px]">
                  <div className="flex justify-between gap-8">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.items.reduce((sum, item) => sum + item.amount, 0))}</span>
                  </div>
                  
                  {selectedInvoice.invoiceType === "tax" ? (
                    <>
                      <div className="flex justify-between gap-8">
                        <span>Management Fees ({selectedInvoice.managementFeesPercent}%):</span>
                        <span>{formatCurrency(selectedInvoice.managementFeesAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span>SGST @9%:</span>
                        <span>{formatCurrency(selectedInvoice.tax / 2)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span>CGST @9%:</span>
                        <span>{formatCurrency(selectedInvoice.tax / 2)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span>Round Up:</span>
                        <span>{formatCurrency(selectedInvoice.roundUp || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between gap-8">
                      <span>GST (18%):</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between gap-8 border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    handleDownloadInvoice(selectedInvoice);
                    setPreviewDialogOpen(false);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as PDF
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewDialogOpen(false)}
                >
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoicesTab;