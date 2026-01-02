import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { Invoice, InvoiceItem, clients, formatCurrency } from "../Billing";

interface TaxInvoiceItem {
  description: string;
  designation: string;
  quantity: number;
  days: number;
  hours: number;
  rate: number;
  amount: number;
}

interface TaxInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreate: (invoice: Invoice) => void;
  taxInvoicesCount: number;
}

export const TaxInvoiceForm: React.FC<TaxInvoiceFormProps> = ({
  isOpen,
  onClose,
  onInvoiceCreate,
  taxInvoicesCount
}) => {
  const [items, setItems] = useState<TaxInvoiceItem[]>([
    { description: "", designation: "", quantity: 0, days: 0, hours: 0, rate: 0, amount: 0 }
  ]);
  const [managementFeesPercent, setManagementFeesPercent] = useState<number>(5);
  const [roundUp, setRoundUp] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    clientName: "",
    clientAddress: "",
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    panNumber: "",
    serviceTaxCategory: "",
    esicNumber: "",
    gstNumber: "",
    lwfNumber: "",
    pfNumber: "",
    sacCode: "9985",
    serviceLocation: "Pune",
    servicePeriodFrom: "",
    servicePeriodTo: "",
    bankName: "BANK OF MAHARASHTRA",
    accountNumber: "CA 60168661338",
    ifscCode: "MAHB0001233",
    branch: "KALYANI NAGAR",
    termsConditions: "We declare that this invoice shows the actual price of the goods & service described and that all particulars are true and correct."
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const taxableValue = items.reduce((sum, item) => sum + item.amount, 0);
    const managementFees = (taxableValue * managementFeesPercent) / 100;
    const netTaxableValue = taxableValue + managementFees;
    const sgst = netTaxableValue * 0.09;
    const cgst = netTaxableValue * 0.09;
    const totalAmountBeforeRound = netTaxableValue + sgst + cgst;
    const roundedTotalAmount = Math.round(totalAmountBeforeRound + roundUp);
    const finalRoundUp = roundedTotalAmount - totalAmountBeforeRound;

    const invoiceItems: InvoiceItem[] = items.map(item => ({
      description: `${item.description} - ${item.designation}`,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));

    const newInvoice: Invoice = {
      id: formData.invoiceNumber || `TAX-${(taxInvoicesCount + 1).toString().padStart(3, '0')}`,
      client: formData.clientName,
      clientEmail: "",
      amount: roundedTotalAmount,
      status: "pending",
      date: formData.invoiceDate,
      dueDate: formData.dueDate,
      items: invoiceItems,
      tax: sgst + cgst,
      discount: 0,
      serviceType: formData.serviceTaxCategory,
      site: formData.clientAddress,
      invoiceType: "tax",
      sacCode: formData.sacCode,
      panNumber: formData.panNumber,
      gstNumber: formData.gstNumber,
      serviceLocation: formData.serviceLocation,
      esicNumber: formData.esicNumber,
      lwfNumber: formData.lwfNumber,
      pfNumber: formData.pfNumber,
      servicePeriodFrom: formData.servicePeriodFrom,
      servicePeriodTo: formData.servicePeriodTo,
      managementFeesPercent,
      managementFeesAmount: managementFees,
      roundUp: finalRoundUp,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      ifscCode: formData.ifscCode,
      branch: formData.branch,
      clientAddress: formData.clientAddress,
      invoiceNumber: formData.invoiceNumber,
    };
    
    onInvoiceCreate(newInvoice);
    onClose();
    resetForm();
  };

  const addItem = () => {
    setItems([...items, { description: "", designation: "", quantity: 0, days: 0, hours: 0, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof TaxInvoiceItem, value: string | number) => {
    const newItems = [...items];
    const parsedValue = typeof value === 'string' ? (field === 'description' || field === 'designation' ? value : parseFloat(value) || 0) : value;
    
    newItems[index] = {
      ...newItems[index],
      [field]: parsedValue
    };

    if (field === 'rate' || field === 'quantity' || field === 'days' || field === 'hours') {
      const item = newItems[index];
      const totalHours = item.days * item.hours;
      newItems[index].amount = totalHours * item.rate;
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
    setItems([{ description: "", designation: "", quantity: 0, days: 0, hours: 0, rate: 0, amount: 0 }]);
    setManagementFeesPercent(5);
    setRoundUp(0);
    setFormData({
      clientName: "",
      clientAddress: "",
      invoiceNumber: "",
      invoiceDate: "",
      dueDate: "",
      panNumber: "",
      serviceTaxCategory: "",
      esicNumber: "",
      gstNumber: "",
      lwfNumber: "",
      pfNumber: "",
      sacCode: "9985",
      serviceLocation: "Pune",
      servicePeriodFrom: "",
      servicePeriodTo: "",
      bankName: "BANK OF MAHARASHTRA",
      accountNumber: "CA 60168661338",
      ifscCode: "MAHB0001233",
      branch: "KALYANI NAGAR",
      termsConditions: "We declare that this invoice shows the actual price of the goods & service described and that all particulars are true and correct."
    });
  };

  const calculateSummary = () => {
    const taxableValue = items.reduce((sum, item) => sum + item.amount, 0);
    const managementFees = (taxableValue * managementFeesPercent) / 100;
    const netTaxableValue = taxableValue + managementFees;
    const sgst = netTaxableValue * 0.09;
    const cgst = netTaxableValue * 0.09;
    const totalAmountBeforeRound = netTaxableValue + sgst + cgst;
    const roundedTotalAmount = Math.round(totalAmountBeforeRound + roundUp);
    const finalRoundUp = roundedTotalAmount - totalAmountBeforeRound;

    return {
      taxableValue,
      managementFees,
      netTaxableValue,
      sgst,
      cgst,
      roundUp: finalRoundUp,
      totalAmount: roundedTotalAmount,
      totalAmountBeforeRound
    };
  };

  const summary = calculateSummary();

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
    
    return result.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tax Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client and Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Select 
                value={formData.clientName}
                onValueChange={(value) => handleInputChange("clientName", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Client Address</Label>
              <Textarea 
                value={formData.clientAddress}
                onChange={(e) => handleInputChange("clientAddress", e.target.value)}
                placeholder="Client address..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceTaxCategory">Service Tax Category *</Label>
              <Select 
                value={formData.serviceTaxCategory}
                onValueChange={(value) => handleInputChange("serviceTaxCategory", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manpower">Manpower</SelectItem>
                  <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="Parking">Parking</SelectItem>
                  <SelectItem value="Waste Management">Waste Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceLocation">Service Location</Label>
              <Input 
                value={formData.serviceLocation}
                onChange={(e) => handleInputChange("serviceLocation", e.target.value)}
                placeholder="Service location"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input 
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input 
                type="date" 
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
              />
            </div>
          </div>

          {/* Service Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servicePeriodFrom">Service Period From *</Label>
              <Input 
                type="date" 
                value={formData.servicePeriodFrom}
                onChange={(e) => handleInputChange("servicePeriodFrom", e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicePeriodTo">Service Period To *</Label>
              <Input 
                type="date" 
                value={formData.servicePeriodTo}
                onChange={(e) => handleInputChange("servicePeriodTo", e.target.value)}
                required 
              />
            </div>
          </div>

          {/* Tax and Registration Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input 
                value={formData.panNumber}
                onChange={(e) => handleInputChange("panNumber", e.target.value)}
                placeholder="PAN Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input 
                value={formData.gstNumber}
                onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                placeholder="GST Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sacCode">SAC Code</Label>
              <Input 
                value={formData.sacCode}
                onChange={(e) => handleInputChange("sacCode", e.target.value)}
                placeholder="SAC Code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicNumber">ESIC Number</Label>
              <Input 
                value={formData.esicNumber}
                onChange={(e) => handleInputChange("esicNumber", e.target.value)}
                placeholder="ESIC Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lwfNumber">LWF Number</Label>
              <Input 
                value={formData.lwfNumber}
                onChange={(e) => handleInputChange("lwfNumber", e.target.value)}
                placeholder="LWF Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfNumber">PF Number</Label>
              <Input 
                value={formData.pfNumber}
                onChange={(e) => handleInputChange("pfNumber", e.target.value)}
                placeholder="PF Number"
              />
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <Label className="text-lg font-semibold">Service Items</Label>
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
                    <TableHead>Description</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
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
                          placeholder="Service description"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[150px]"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.designation}
                          onChange={(e) => updateItem(index, 'designation', e.target.value)}
                          placeholder="Designation"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[100px]"
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
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-20"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.days || ''}
                          onChange={(e) => updateItem(index, 'days', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-20"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.hours || ''}
                          onChange={(e) => updateItem(index, 'hours', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-20"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-24"
                          required
                        />
                      </TableCell>
                      <TableCell className="font-medium min-w-[100px]">
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

          {/* Fees and Round Up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementFeesPercent">Management Fees (%)</Label>
              <Input 
                type="number"
                value={managementFeesPercent}
                onChange={(e) => setManagementFeesPercent(Number(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundUp">Round Up (+/-)</Label>
              <Input 
                type="number"
                value={roundUp}
                onChange={(e) => setRoundUp(Number(e.target.value))}
                placeholder="Round up amount"
                step="1"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Bank Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input 
                  value={formData.bankName}
                  onChange={(e) => handleInputChange("bankName", e.target.value)}
                  placeholder="Bank Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input 
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  placeholder="Account Number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input 
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange("ifscCode", e.target.value)}
                  placeholder="IFSC Code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input 
                  value={formData.branch}
                  onChange={(e) => handleInputChange("branch", e.target.value)}
                  placeholder="Branch"
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="termsConditions">Terms & Conditions</Label>
            <Textarea 
              value={formData.termsConditions}
              onChange={(e) => handleInputChange("termsConditions", e.target.value)}
              placeholder="Terms and conditions..."
              rows={3}
            />
          </div>

          {/* Calculation Summary */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">Invoice Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span>Taxable Value:</span>
                <span className="font-medium">
                  ₹{summary.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Management Fees ({managementFeesPercent}%):</span>
                <span className="font-medium">
                  ₹{summary.managementFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Net Taxable Value:</span>
                <span className="font-medium">
                  ₹{summary.netTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>SGST @9%:</span>
                <span className="font-medium">
                  ₹{summary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>CGST @9%:</span>
                <span className="font-medium">
                  ₹{summary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Round Up:</span>
                <span className="font-medium">
                  {summary.roundUp >= 0 ? '+' : ''}₹{summary.roundUp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          <Button type="submit" className="w-full">Create Tax Invoice</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};