import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Receipt, 
  RefreshCw,
  Loader2,
  FileType,
  AlertCircle,
  CheckCircle,
  BarChart3,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  TrendingUp,
  Calendar,
  Package,
  Home,
  Shield,
  Car,
  Trash2,
  Droplets,
  Users,
  Clock
} from "lucide-react";
import InvoiceService from "@/services/InvoiceService";
import { expenseService } from "@/services/expenseService";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentSummaryTabProps {}

// Define interfaces for data from APIs
interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface TaxInvoice {
  _id: string;
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  client: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  date: string;
  dueDate?: string;
  invoiceType: "tax" | "perform";
  items: InvoiceItem[];
  tax: number;
  clientEmail?: string;
  site?: string;
  serviceType?: string;
  gstNumber?: string;
  panNumber?: string;
  managementFeesPercent?: number;
  managementFeesAmount?: number;
  sacCode?: string;
  serviceLocation?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  roundUp?: number;
  baseAmount?: number;
  paymentMethod?: string;
  subtotal?: number;
  discount?: number;
}

interface Expense {
  _id: string;
  expenseId: string;
  category: string;
  description: string;
  amount: number;
  baseAmount: number;
  gst: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  paymentMethod: string;
  site: string;
  expenseType: "operational" | "office" | "other";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentMethodDistribution {
  method: string;
  count: number;
  amount: number;
  percentage: number;
  Icon: React.ComponentType<{ className?: string }>;
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Helper function to get icon component for payment method
const getPaymentMethodIcon = (method: string): React.ComponentType<{ className?: string }> => {
  const methodLower = method.toLowerCase();
  if (methodLower.includes('bank') || methodLower.includes('transfer')) return Banknote;
  if (methodLower.includes('upi') || methodLower.includes('phonepe') || methodLower.includes('google')) return Smartphone;
  if (methodLower.includes('credit') || methodLower.includes('debit') || methodLower.includes('card')) return CreditCard;
  if (methodLower.includes('cash')) return Wallet;
  return CreditCard;
};

// Get service icon component
const getServiceIcon = (serviceType: string = ""): React.ReactNode => {
  switch (serviceType.toLowerCase()) {
    case "housekeeping management": return <Home className="h-4 w-4 text-blue-600" />;
    case "security management": return <Shield className="h-4 w-4 text-green-600" />;
    case "parking management": return <Car className="h-4 w-4 text-purple-600" />;
    case "waste management": return <Trash2 className="h-4 w-4 text-red-600" />;
    case "stp tank cleaning": return <Droplets className="h-4 w-4 text-cyan-600" />;
    case "consumables supply": return <Package className="h-4 w-4 text-orange-600" />;
    default: return <Users className="h-4 w-4 text-gray-600" />;
  }
};

// Get expense category icon component
const getExpenseCategoryIcon = (category: string = ""): React.ReactNode => {
  switch (category.toLowerCase()) {
    case "cleaning supplies": return <Package className="h-4 w-4 text-blue-600" />;
    case "security equipment": return <Shield className="h-4 w-4 text-green-600" />;
    case "office supplies": return <Package className="h-4 w-4 text-purple-600" />;
    case "utilities": return <Droplets className="h-4 w-4 text-cyan-600" />;
    case "maintenance": return <Trash2 className="h-4 w-4 text-red-600" />;
    case "transportation": return <Car className="h-4 w-4 text-orange-600" />;
    default: return <Receipt className="h-4 w-4 text-gray-600" />;
  }
};

// Get badge variant for status
const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
    case "approved":
      return "default";
    case "pending":
      return "secondary";
    case "overdue":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const PaymentSummaryTab: React.FC<PaymentSummaryTabProps> = () => {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState({
    invoices: true,
    expenses: true,
    all: true
  });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<'summary' | 'invoices' | 'expenses'>('summary');
  const [paymentMethodDistribution, setPaymentMethodDistribution] = useState<PaymentMethodDistribution[]>([]);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      setLoading(prev => ({ ...prev, all: true }));
      
      await Promise.all([
        fetchTaxInvoices(),
        fetchExpenses()
      ]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
      setLoading(prev => ({ ...prev, all: false }));
    }
  };

  const fetchTaxInvoices = async () => {
    try {
      setLoading(prev => ({ ...prev, invoices: true }));
      let data;
      try {
        // Try to use InvoiceService
        const invoiceService = new InvoiceService();
        data = await invoiceService.getAllInvoices();
      } catch (serviceError) {
        console.log('InvoiceService failed, trying direct API call...', serviceError);
        // Fallback to direct API call
        const response = await fetch('http://localhost:5001/api/invoices');
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const result = await response.json();
        data = result.data || result;
      }
      
      // Ensure we have an array
      const invoicesArray = Array.isArray(data) ? data : [];
      
      // Filter only tax invoices and ensure proper typing
      const taxInvoices = invoicesArray
        .filter((invoice: any) => invoice.invoiceType === "tax")
        .map((invoice: any): TaxInvoice => ({
          _id: invoice._id || invoice.id,
          id: invoice.id || invoice._id || `INV-${Date.now()}`,
          invoiceNumber: invoice.invoiceNumber || invoice.id || `INV-${Date.now()}`,
          voucherNo: invoice.voucherNo,
          client: invoice.client || "Unknown Client",
          amount: Number(invoice.amount) || 0,
          status: (invoice.status as "pending" | "paid" | "overdue") || "pending",
          date: invoice.date || new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate,
          invoiceType: "tax",
          items: Array.isArray(invoice.items) ? invoice.items : [],
          tax: Number(invoice.tax) || 0,
          clientEmail: invoice.clientEmail,
          site: invoice.site,
          serviceType: invoice.serviceType,
          gstNumber: invoice.gstNumber,
          panNumber: invoice.panNumber,
          managementFeesPercent: Number(invoice.managementFeesPercent) || 5,
          managementFeesAmount: Number(invoice.managementFeesAmount) || 0,
          sacCode: invoice.sacCode,
          serviceLocation: invoice.serviceLocation,
          servicePeriodFrom: invoice.servicePeriodFrom,
          servicePeriodTo: invoice.servicePeriodTo,
          roundUp: Number(invoice.roundUp) || 0,
          baseAmount: Number(invoice.baseAmount) || Number(invoice.amount) || 0,
          paymentMethod: invoice.paymentMethod,
          subtotal: Number(invoice.subtotal) || Number(invoice.amount) || 0,
          discount: Number(invoice.discount) || 0
        }));
      
      setInvoices(taxInvoices);
      return taxInvoices;
    } catch (err: any) {
      console.error('Error fetching tax invoices:', err);
      setInvoices([]);
      toast.error("Failed to fetch tax invoices");
      return [];
    } finally {
      setLoading(prev => ({ ...prev, invoices: false }));
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(prev => ({ ...prev, expenses: true }));
      let data;
      try {
        // Try to use expenseService
        const result = await expenseService.getExpenses({});
        data = result.data || result;
      } catch (serviceError) {
        console.log('ExpenseService failed, trying direct API call...', serviceError);
        // Fallback to direct API call
        const response = await fetch('http://localhost:5001/api/expenses');
        if (!response.ok) throw new Error('Failed to fetch expenses');
        const result = await response.json();
        data = result.data || result;
      }
      
      // Ensure we have an array
      const expensesArray = Array.isArray(data) ? data : [];
      
      // Map to Expense interface
      const mappedExpenses = expensesArray.map((expense: any): Expense => ({
        _id: expense._id || expense.id,
        expenseId: expense.expenseId || expense._id || `EXP-${Date.now()}`,
        category: expense.category || "Uncategorized",
        description: expense.description || "No description",
        amount: Number(expense.amount) || 0,
        baseAmount: Number(expense.baseAmount) || Number(expense.amount) || 0,
        gst: Number(expense.gst) || 0,
        date: expense.date || new Date().toISOString().split('T')[0],
        status: (expense.status as "pending" | "approved" | "rejected") || "pending",
        vendor: expense.vendor || "Unknown Vendor",
        paymentMethod: expense.paymentMethod || "Unknown",
        site: expense.site || "Unknown Site",
        expenseType: (expense.expenseType as "operational" | "office" | "other") || "other",
        notes: expense.notes,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }));
      
      setExpenses(mappedExpenses);
      return mappedExpenses;
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
      toast.error("Failed to fetch expenses");
      return [];
    } finally {
      setLoading(prev => ({ ...prev, expenses: false }));
    }
  };

  // Calculate payment methods distribution
  const calculatePaymentMethods = (): PaymentMethodDistribution[] => {
    const methodTotals: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;

    // Count payment methods from approved expenses
    const approvedExpenses = expenses.filter(e => e.status === "approved");
    approvedExpenses.forEach(expense => {
      const method = expense.paymentMethod || "Unknown";
      if (!methodTotals[method]) {
        methodTotals[method] = { count: 0, amount: 0 };
      }
      methodTotals[method].count++;
      methodTotals[method].amount += expense.amount;
      totalAmount += expense.amount;
    });

    // Count payment methods from paid invoices
    const paidTaxInvoices = invoices.filter(i => i.status === "paid");
    paidTaxInvoices.forEach(invoice => {
      const method = invoice.paymentMethod || "Unknown";
      if (!methodTotals[method]) {
        methodTotals[method] = { count: 0, amount: 0 };
      }
      methodTotals[method].count++;
      methodTotals[method].amount += invoice.amount;
      totalAmount += invoice.amount;
    });

    // Convert to array and calculate percentages
    const distribution = Object.entries(methodTotals).map(([method, data]) => {
      const percentage = totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0;
      const Icon = getPaymentMethodIcon(method);
      return {
        method,
        ...data,
        percentage,
        Icon
      };
    });

    // Sort by amount descending
    return distribution.sort((a, b) => b.amount - a.amount);
  };

  // Update payment methods distribution when data changes
  useEffect(() => {
    const distribution = calculatePaymentMethods();
    setPaymentMethodDistribution(distribution);
  }, [invoices, expenses]);

  // Filter data
  const paidTaxInvoices = invoices.filter(i => i.status === "paid");
  const approvedExpenses = expenses.filter(e => e.status === "approved");
  const pendingInvoices = invoices.filter(i => i.status === "pending");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const pendingExpenses = expenses.filter(e => e.status === "pending");

  // Calculate totals
  const totalTaxRevenue = paidTaxInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalTaxableValue = paidTaxInvoices.reduce((sum, inv) => 
    sum + (inv.baseAmount || inv.amount - inv.tax - (inv.managementFeesAmount || 0)), 0);
  const totalGST = paidTaxInvoices.reduce((sum, inv) => sum + inv.tax, 0);
  const totalExpensesAmount = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpensesGST = approvedExpenses.reduce((sum, exp) => sum + exp.gst, 0);
  const totalExpensesBase = totalExpensesAmount - totalExpensesGST;
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingExpensesAmount = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate net profit
  const netProfit = totalTaxRevenue - totalExpensesAmount;
  const profitMargin = totalTaxRevenue > 0 ? (netProfit / totalTaxRevenue) * 100 : 0;

  const topPaymentMethod = paymentMethodDistribution.length > 0 ? paymentMethodDistribution[0] : null;

  // Loading state
  if (loading.all && !refreshing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading Financial Data</h3>
          <p className="text-muted-foreground">Please wait while we fetch your financial information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={fetchAllData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Payment Summary
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAllData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      {/* View Toggle */}
      <div className="px-6 pb-4">
        <div className="flex border rounded-lg p-1 w-fit">
          <Button
            variant={selectedView === 'summary' ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedView('summary')}
            className="flex-1"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Summary
          </Button>
          <Button
            variant={selectedView === 'invoices' ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedView('invoices')}
            className="flex-1"
          >
            <FileType className="mr-2 h-4 w-4" />
            Tax Invoices ({paidTaxInvoices.length})
          </Button>
          <Button
            variant={selectedView === 'expenses' ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedView('expenses')}
            className="flex-1"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Expenses ({approvedExpenses.length})
          </Button>
        </div>
      </div>

      <CardContent className="space-y-6">
        {/* UPDATED SUMMARY CARDS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Paid Invoices Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid Invoices</p>
                  <p className="text-2xl font-bold text-primary">
                    {paidTaxInvoices.length}
                  </p>
                  <p className="text-sm text-primary font-semibold">
                    {formatCurrency(totalTaxRevenue)}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Taxable Value:</span>
                  <span>{formatCurrency(totalTaxableValue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Total GST:</span>
                  <span className="text-blue-600">{formatCurrency(totalGST)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Pending Invoices Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-secondary">
                    {pendingInvoices.length}
                  </p>
                  <p className="text-sm text-secondary font-semibold">
                    {formatCurrency(pendingAmount)}
                  </p>
                </div>
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-secondary" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Average Amount:</span>
                  <span>
                    {pendingInvoices.length > 0 ? 
                      formatCurrency(pendingAmount / pendingInvoices.length) : 
                      formatCurrency(0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Latest:</span>
                  <span>
                    {pendingInvoices.length > 0 ? 
                      formatDate(pendingInvoices[0].date) : 
                      'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Overdue Invoices Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">
                    {overdueInvoices.length}
                  </p>
                  <p className="text-sm text-destructive font-semibold">
                    {formatCurrency(overdueAmount)}
                  </p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Average Overdue:</span>
                  <span>
                    {overdueInvoices.length > 0 ? 
                      formatCurrency(overdueAmount / overdueInvoices.length) : 
                      formatCurrency(0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Oldest:</span>
                  <span>
                    {overdueInvoices.length > 0 ? 
                      formatDate(overdueInvoices[overdueInvoices.length - 1].date) : 
                      'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Total Expenses Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">
                    {approvedExpenses.length}
                  </p>
                  <p className="text-sm text-destructive font-semibold">
                    {formatCurrency(totalExpensesAmount)}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Base Amount:</span>
                  <span>{formatCurrency(totalExpensesBase)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>GST Paid:</span>
                  <span className="text-blue-600">{formatCurrency(totalExpensesGST)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedView === 'summary' ? (
          <>
            {/* Payment Methods Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Methods Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethodDistribution.map((method) => {
                      const IconComponent = method.Icon;
                      return (
                        <div key={method.method} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <IconComponent className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{method.method}</p>
                                <p className="text-xs text-muted-foreground">
                                  {method.count} transactions • {formatCurrency(method.amount)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">{method.percentage}%</p>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${method.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No payment methods data available</p>
                    <p className="text-sm mt-1">Add some paid invoices or approved expenses to see payment methods</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Paid Tax Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recent Paid Tax Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Taxable Value</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidTaxInvoices.length > 0 ? (
                        paidTaxInvoices.slice(0, 5).map((invoice) => (
                          <TableRow key={invoice._id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {invoice.voucherNo || invoice.invoiceNumber || invoice.id}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{invoice.client}</p>
                                {invoice.clientEmail && (
                                  <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getServiceIcon(invoice.serviceType)}
                                <span>{invoice.serviceType || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(invoice.date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(invoice.baseAmount || invoice.amount - invoice.tax - (invoice.managementFeesAmount || 0))}
                            </TableCell>
                            <TableCell className="text-blue-600 font-medium">
                              {formatCurrency(invoice.tax)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(invoice.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <FileType className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No paid tax invoices found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Mark tax invoices as paid to see them here
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Approved Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recent Approved Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedExpenses.length > 0 ? (
                        approvedExpenses.slice(0, 5).map((expense) => (
                          <TableRow key={expense._id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{expense.expenseId}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getExpenseCategoryIcon(expense.category)}
                                <span>{expense.category}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell>{expense.vendor}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(expense.date)}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const IconComponent = getPaymentMethodIcon(expense.paymentMethod);
                                return (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <IconComponent className="h-3 w-3" />
                                    {expense.paymentMethod}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(expense.status)}>
                                {expense.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No approved expenses found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Approve expenses in the Expenses tab to see them here
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Financial Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Revenue Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Revenue:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(totalTaxRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Invoices:</span>
                      <span className="font-medium">{paidTaxInvoices.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Invoice:</span>
                      <span className="font-medium">
                        {paidTaxInvoices.length > 0 ? 
                          formatCurrency(totalTaxRevenue / paidTaxInvoices.length) : 
                          formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total GST:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(totalGST)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">GST Rate:</span>
                      <span className="font-semibold text-blue-600">
                        {totalTaxableValue > 0 ? 
                          ((totalGST / totalTaxableValue) * 100).toFixed(2) : 
                          "0.00"}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-red-600" />
                    Expenses Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Expenses:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(totalExpensesAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Items:</span>
                      <span className="font-medium">{approvedExpenses.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Expense:</span>
                      <span className="font-medium">
                        {approvedExpenses.length > 0 ? 
                          formatCurrency(totalExpensesAmount / approvedExpenses.length) : 
                          formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Expenses:</span>
                      <span className="font-medium text-yellow-600">{formatCurrency(pendingExpensesAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">GST Rate:</span>
                      <span className="font-semibold text-blue-600">
                        {totalExpensesBase > 0 ? 
                          ((totalExpensesGST / totalExpensesBase) * 100).toFixed(2) : 
                          "0.00"}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : selectedView === 'invoices' ? (
          /* All Paid Tax Invoices Table View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileType className="h-5 w-5 text-green-600" />
                All Paid Tax Invoices ({paidTaxInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.invoices ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading invoices...</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead>Taxable Value</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidTaxInvoices.map((invoice) => (
                        <TableRow key={invoice._id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {invoice.voucherNo || invoice.invoiceNumber || invoice.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{invoice.client}</p>
                              <p className="text-xs text-muted-foreground">{invoice.clientEmail || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.serviceType || "-"}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell className="font-mono text-xs">{invoice.gstNumber || "-"}</TableCell>
                          <TableCell>
                            {formatCurrency(invoice.baseAmount || invoice.amount - invoice.tax - (invoice.managementFeesAmount || 0))}
                          </TableCell>
                          <TableCell className="text-blue-600 font-medium">{formatCurrency(invoice.tax)}</TableCell>
                          <TableCell className="font-semibold text-green-600">{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>
                            {invoice.paymentMethod ? (
                              (() => {
                                const IconComponent = getPaymentMethodIcon(invoice.paymentMethod);
                                return (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <IconComponent className="h-3 w-3" />
                                    {invoice.paymentMethod}
                                  </Badge>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {paidTaxInvoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <FileType className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No paid tax invoices found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Mark tax invoices as paid to see them here
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* All Approved Expenses View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                All Approved Expenses ({approvedExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.expenses ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading expenses...</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedExpenses.map((expense) => (
                        <TableRow key={expense._id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{expense.expenseId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getExpenseCategoryIcon(expense.category)}
                              <span>{expense.category}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                          <TableCell>{expense.vendor}</TableCell>
                          <TableCell>
                            {(() => {
                              const IconComponent = getPaymentMethodIcon(expense.paymentMethod);
                              return (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <IconComponent className="h-3 w-3" />
                                  {expense.paymentMethod}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{formatDate(expense.date)}</TableCell>
                          <TableCell>{formatCurrency(expense.baseAmount)}</TableCell>
                          <TableCell className="text-blue-600">{formatCurrency(expense.gst)}</TableCell>
                          <TableCell className="font-semibold text-red-600">{formatCurrency(expense.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {approvedExpenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No approved expenses found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Approve expenses in the Expenses tab to see them here
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSummaryTab;