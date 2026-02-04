import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, DollarSign, TrendingUp, Eye, Download, Upload, IndianRupee, Calendar, Clock, CreditCard, Banknote, Receipt, Edit, Users, Filter, FileDown, Building, Home, Shield, Car, Trash2, Droplets, Package, List, Grid, ChevronLeft, ChevronRight, Search, AlertTriangle, BarChart3, PieChart } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Import components - Removed RevenueAnalyticsTab import
import InvoicesTab from "./billing/InvoicesTab";
import ExpensesTab from "./billing/ExpensesTab";
import PaymentSummaryTab from "./billing/PaymentSummaryTab";
import LedgerBalanceTab from "./billing/LedgerBalanceTab";

// Interfaces - Simplified to remove duplicates
export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  designation?: string;
  days?: number;
  hours?: number;
}

export interface Invoice {
  // Basic invoice info
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  invoiceType: 'perform' | 'tax';
  status: 'pending' | 'paid' | 'overdue';
  date: string;
  dueDate?: string;
  
  // User/Role tracking
  createdBy?: string;
  userId?: string;
  sharedWith?: string[];
  
  // Client info
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  
  // Company info (optional)
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;
  companyState?: string;
  companyStateCode?: string;
  companyEmail?: string;
  
  // Consignee info (optional)
  consignee?: string;
  consigneeAddress?: string;
  consigneeGSTIN?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  
  // Buyer info (optional)
  buyer?: string;
  buyerAddress?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  
  // Order details (optional)
  buyerRef?: string;
  dispatchedThrough?: string;
  paymentTerms?: string;
  notes?: string;
  site?: string;
  destination?: string;
  deliveryTerms?: string;
  serviceType?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Financials
  amount: number;
  subtotal?: number;
  tax: number;
  discount?: number;
  roundUp?: number;
  
  // Tax invoice specific (optional)
  managementFeesPercent?: number;
  managementFeesAmount?: number;
  
  // Bank details (optional)
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  branchAndIFSC?: string;
  
  // Additional fields
  amountInWords?: string;
  
  // Payment method
  paymentMethod?: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  paymentMethod: string;
  gst?: number;
  site?: string;
  expenseType: "operational" | "office" | "other";
}

export interface Payment {
  id: string;
  invoiceId: string;
  client: string;
  amount: number;
  date: string;
  method: string;
  status: "completed" | "failed" | "pending";
}

export interface LedgerEntry {
  id: string;
  party: string;
  type: "invoice" | "payment" | "expense" | "credit_note";
  reference: string;
  date: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  status: string;
  site?: string;
  serviceType?: string;
}

export interface PartyBalance {
  party: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  lastTransaction: string;
  status: "credit" | "debit" | "settled";
  site?: string;
}

export interface SiteProfit {
  site: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

// Constants
export const sites = [
  "Tech Park Bangalore",
  "Financial District Mumbai", 
  "IT Hub Hyderabad",
  "Commercial Complex Delhi",
  "Business Center Chennai"
];

export const serviceTypes = [
  "Housekeeping Management",
  "Security Management", 
  "Parking Management",
  "Waste Management",
  "STP Tank Cleaning",
  "Consumables Supply"
];

export const expenseCategories = [
  "Equipment",
  "Cleaning Supplies",
  "Infrastructure",
  "Waste Management",
  "STP Maintenance",
  "Security",
  "Parking",
  "Utilities",
  "Office Supplies",
  "Software & Technology",
  "Travel & Conveyance",
  "Professional Services",
  "Marketing & Advertising",
  "Repairs & Maintenance",
  "Other Expenses"
];

export const clients = [
  "ALYSSUM DEVELOPERS PVT. LTD.",
  "ARYA ASSOCIATES",
  "ASTITVA ASSET MANAGEMENT LLP",
  "A.T.C COMMERCIAL PREMISES CO. OPERATIVE SOCIETY LTD",
  "BAHIRAT ESTATE LLP",
  "CHITRALI PROPERTIES PVT LTD",
  "Concretely Infra Llp",
  "COORTUS ADVISORS LLP",
  "CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.",
  "DAKSHA INFRASTRUCTURE PVT. LTD.",
  "GANRAJ HOMES LLP-GANGA IMPERIA",
  "Global Lifestyle Hinjawadi Co-operative Housing Society Ltd",
  "GLOBAL PROPERTIES",
  "GLOBAL SQUARE PREMISES CO SOC LTD",
  "ISS FACILITY SERVICES INDIA PVT LTD",
  "JCSS CONSULTING INDIA PVT LTD",
  "KAPPA REALTORS LLP PUNE",
  "KRISHAK SEVITA ONLINE SOLUTIONS PRIVATE LIMITED",
  "LA MERE BUSINESS PVT. LTD.",
  "MATTER MOTOR WORKS PRIVATE LIMITED",
  "MEDIA PROTOCOL SERVICES",
  "MINDSPACE SHELTERS LLP (F2)",
  "NEXT GEN BUSINESS CENTRE LLP",
  "N G VENTURES",
  "PRIME VENTURES",
  "RADIANT INFRAPOWER",
  "RUHRPUMPEN INDIA PVT LTD",
  "SATURO TECHNOLOGIES PVT LTD",
  "SHUBH LANDMARKS",
  "SIDDHIVINAYAK POULTRY BREEDING FARM & HATCHERIES PRIVATE LIMITED",
  "SUVARNA FMS PVT LTD",
  "SYNERGY INFOTECH PVT LTD",
  "VILAS JAVDEKAR ECO SHELTERS PVT. LTD",
  "WEETAN SBRFS LLP",
  "WESTERN INDIA FORGINGS PVT LTD"
];

// Initial Data - Updated with required properties
const initialInvoices: Invoice[] = [
  {
    id: "INV-001",
    invoiceNumber: "INV-001",
    client: "ALYSSUM DEVELOPERS PVT. LTD.",
    clientEmail: "accounts@alyssum.com",
    amount: 125000,
    status: "paid",
    date: "2024-01-10",
    dueDate: "2024-01-20",
    invoiceType: "perform",
    items: [
      { description: "Housekeeping Management - Monthly Service", quantity: 1, rate: 75000, amount: 75000 },
      { description: "Security Personnel Services", quantity: 4, rate: 12500, amount: 50000 }
    ],
    tax: 22500,
    discount: 0,
    paymentMethod: "Bank Transfer",
    serviceType: "Housekeeping Management",
    site: "Tech Park Bangalore",
    createdBy: "admin"
  },
  {
    id: "INV-002",
    invoiceNumber: "INV-002",
    client: "ARYA ASSOCIATES",
    clientEmail: "billing@aryaassociates.com",
    amount: 89000,
    status: "pending",
    date: "2024-01-15",
    dueDate: "2024-01-25",
    invoiceType: "perform",
    items: [
      { description: "Parking Management Services", quantity: 1, rate: 45000, amount: 45000 },
      { description: "Waste Management - Monthly", quantity: 1, rate: 44000, amount: 44000 }
    ],
    tax: 16020,
    discount: 1000,
    paymentMethod: "UPI",
    serviceType: "Parking Management",
    site: "Financial District Mumbai",
    createdBy: "admin"
  },
  {
    id: "INV-003",
    invoiceNumber: "INV-003",
    client: "ASTITVA ASSET MANAGEMENT LLP",
    clientEmail: "finance@astitva.com",
    amount: 156000,
    status: "overdue",
    date: "2024-01-05",
    dueDate: "2024-01-15",
    invoiceType: "tax",
    items: [
      { description: "STP Tank Cleaning - Quarterly", quantity: 1, rate: 98000, amount: 98000 },
      { description: "Consumables Supply", quantity: 1, rate: 58000, amount: 58000 }
    ],
    tax: 28080,
    discount: 5000,
    serviceType: "STP Tank Cleaning",
    site: "IT Hub Hyderabad",
    createdBy: "admin"
  },
  {
    id: "INV-004",
    invoiceNumber: "INV-004",
    client: "CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.",
    clientEmail: "accounts@cushwake.com",
    amount: 67000,
    status: "paid",
    date: "2024-01-12",
    dueDate: "2024-01-22",
    invoiceType: "perform",
    items: [
      { description: "Security Management - Monthly", quantity: 1, rate: 67000, amount: 67000 }
    ],
    tax: 12060,
    discount: 0,
    paymentMethod: "Bank Transfer",
    serviceType: "Security Management",
    site: "Commercial Complex Delhi",
    createdBy: "admin"
  },
  {
    id: "INV-005",
    invoiceNumber: "INV-005",
    client: "ISS FACILITY SERVICES INDIA PVT LTD",
    clientEmail: "billing@issindia.com",
    amount: 45000,
    status: "pending",
    date: "2024-01-18",
    dueDate: "2024-01-28",
    invoiceType: "tax",
    items: [
      { description: "Consumables Supply - Office", quantity: 1, rate: 45000, amount: 45000 }
    ],
    tax: 8100,
    discount: 2000,
    serviceType: "Consumables Supply",
    site: "Business Center Chennai",
    createdBy: "admin"
  },
  {
    id: "INV-006",
    invoiceNumber: "INV-006",
    client: "GANRAJ HOMES LLP-GANGA IMPERIA",
    clientEmail: "accounts@ganraj.com",
    amount: 98000,
    status: "paid",
    date: "2024-01-08",
    dueDate: "2024-01-18",
    invoiceType: "perform",
    items: [
      { description: "Security Management Services", quantity: 3, rate: 20000, amount: 60000 },
      { description: "Housekeeping Services", quantity: 1, rate: 38000, amount: 38000 }
    ],
    tax: 17640,
    discount: 0,
    paymentMethod: "Bank Transfer",
    serviceType: "Security Management",
    site: "Tech Park Bangalore",
    createdBy: "admin"
  },
  {
    id: "INV-007",
    invoiceNumber: "INV-007",
    client: "PRIME VENTURES",
    clientEmail: "finance@primeventures.com",
    amount: 120000,
    status: "pending",
    date: "2024-01-20",
    dueDate: "2024-01-30",
    invoiceType: "tax",
    items: [
      { description: "Parking Management - Premium", quantity: 1, rate: 80000, amount: 80000 },
      { description: "Waste Management Services", quantity: 1, rate: 40000, amount: 40000 }
    ],
    tax: 21600,
    discount: 5000,
    serviceType: "Parking Management",
    site: "Financial District Mumbai",
    createdBy: "admin"
  },
  {
    id: "INV-008",
    invoiceNumber: "INV-008",
    client: "SYNERGY INFOTECH PVT LTD",
    clientEmail: "accounts@synergy.com",
    amount: 75000,
    status: "overdue",
    date: "2024-01-03",
    dueDate: "2024-01-13",
    invoiceType: "perform",
    items: [
      { description: "Consumables Supply - IT Equipment", quantity: 1, rate: 75000, amount: 75000 }
    ],
    tax: 13500,
    discount: 0,
    serviceType: "Consumables Supply",
    site: "IT Hub Hyderabad",
    createdBy: "admin"
  },
  {
    id: "INV-009",
    invoiceNumber: "INV-009",
    client: "WEETAN SBRFS LLP",
    clientEmail: "billing@weetan.com",
    amount: 185000,
    status: "paid",
    date: "2024-01-25",
    dueDate: "2024-02-04",
    invoiceType: "tax",
    items: [
      { description: "STP Tank Cleaning - Comprehensive", quantity: 1, rate: 120000, amount: 120000 },
      { description: "Waste Management - Advanced", quantity: 1, rate: 65000, amount: 65000 }
    ],
    tax: 33300,
    discount: 8000,
    paymentMethod: "UPI",
    serviceType: "STP Tank Cleaning",
    site: "Commercial Complex Delhi",
    createdBy: "admin"
  },
  {
    id: "INV-010",
    invoiceNumber: "INV-010",
    client: "WESTERN INDIA FORGINGS PVT LTD",
    clientEmail: "accounts@westernindia.com",
    amount: 55000,
    status: "pending",
    date: "2024-01-28",
    dueDate: "2024-02-07",
    invoiceType: "perform",
    items: [
      { description: "Housekeeping Management - Basic", quantity: 1, rate: 55000, amount: 55000 }
    ],
    tax: 9900,
    discount: 2000,
    serviceType: "Housekeeping Management",
    site: "Business Center Chennai",
    createdBy: "admin"
  }
];

const initialExpenses: Expense[] = [
  {
    id: "EXP-001",
    category: "Equipment",
    description: "Security Cameras and Monitoring System",
    amount: 185000,
    date: "2024-01-05",
    status: "approved",
    vendor: "Security Solutions India",
    paymentMethod: "Bank Transfer",
    gst: 33300,
    site: "Tech Park Bangalore",
    expenseType: "operational"
  },
  {
    id: "EXP-002",
    category: "Cleaning Supplies",
    description: "Housekeeping Consumables and Equipment",
    amount: 75000,
    date: "2024-01-12",
    status: "pending",
    vendor: "CleanTech Supplies",
    paymentMethod: "Credit Card",
    gst: 13500,
    site: "Financial District Mumbai",
    expenseType: "operational"
  },
  {
    id: "EXP-003",
    category: "Infrastructure",
    description: "Parking Management System Installation",
    amount: 320000,
    date: "2024-01-18",
    status: "approved",
    vendor: "ParkTech Solutions",
    paymentMethod: "Bank Transfer",
    gst: 57600,
    site: "IT Hub Hyderabad",
    expenseType: "operational"
  },
  {
    id: "EXP-004",
    category: "Waste Management",
    description: "Waste Processing Equipment Maintenance",
    amount: 45000,
    date: "2024-01-22",
    status: "approved",
    vendor: "EcoWaste Systems",
    paymentMethod: "UPI",
    gst: 8100,
    site: "Commercial Complex Delhi",
    expenseType: "operational"
  },
  {
    id: "EXP-005",
    category: "STP Maintenance",
    description: "STP Tank Cleaning Chemicals and Equipment",
    amount: 68000,
    date: "2024-01-25",
    status: "pending",
    vendor: "WaterTech Solutions",
    paymentMethod: "Bank Transfer",
    gst: 12240,
    site: "Business Center Chennai",
    expenseType: "operational"
  },
  {
    id: "EXP-006",
    category: "Office Supplies",
    description: "Office Stationery and Printer Cartridges",
    amount: 25000,
    date: "2024-01-14",
    status: "approved",
    vendor: "Office Depot India",
    paymentMethod: "Credit Card",
    gst: 4500,
    site: "Tech Park Bangalore",
    expenseType: "office"
  },
  {
    id: "EXP-007",
    category: "Software & Technology",
    description: "Accounting Software Subscription",
    amount: 45000,
    date: "2024-01-19",
    status: "approved",
    vendor: "Tech Solutions Ltd",
    paymentMethod: "Bank Transfer",
    gst: 8100,
    site: "Financial District Mumbai",
    expenseType: "office"
  },
  {
    id: "EXP-008",
    category: "Travel & Conveyance",
    description: "Client Meeting Travel Expenses",
    amount: 18000,
    date: "2024-01-28",
    status: "approved",
    vendor: "Multiple Vendors",
    paymentMethod: "Cash",
    gst: 3240,
    site: "IT Hub Hyderabad",
    expenseType: "office"
  },
  {
    id: "EXP-009",
    category: "Professional Services",
    description: "Legal Consultation Fees",
    amount: 35000,
    date: "2024-01-30",
    status: "pending",
    vendor: "Legal Associates LLP",
    paymentMethod: "Bank Transfer",
    gst: 6300,
    site: "Commercial Complex Delhi",
    expenseType: "other"
  },
  {
    id: "EXP-010",
    category: "Marketing & Advertising",
    description: "Digital Marketing Campaign",
    amount: 55000,
    date: "2024-01-31",
    status: "approved",
    vendor: "Digital Marketing Pro",
    paymentMethod: "UPI",
    gst: 9900,
    site: "Business Center Chennai",
    expenseType: "other"
  },
  {
    id: "EXP-011",
    category: "Other Expenses",
    description: "Miscellaneous Unplanned Expenses",
    amount: 15000,
    date: "2024-01-20",
    status: "approved",
    vendor: "Various Vendors",
    paymentMethod: "Cash",
    gst: 2700,
    site: "Tech Park Bangalore",
    expenseType: "other"
  }
];

const initialPayments: Payment[] = [
  {
    id: "PAY-001",
    invoiceId: "INV-001",
    client: "ALYSSUM DEVELOPERS PVT. LTD.",
    amount: 125000,
    date: "2024-01-12",
    method: "Bank Transfer",
    status: "completed"
  },
  {
    id: "PAY-002",
    invoiceId: "INV-004",
    client: "CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.",
    amount: 67000,
    date: "2024-01-20",
    method: "Bank Transfer",
    status: "completed"
  },
  {
    id: "PAY-003",
    invoiceId: "INV-003",
    client: "ASTITVA ASSET MANAGEMENT LLP",
    amount: 156000,
    date: "2024-01-20",
    method: "UPI",
    status: "failed"
  },
  {
    id: "PAY-004",
    invoiceId: "INV-006",
    client: "GANRAJ HOMES LLP-GANGA IMPERIA",
    amount: 98000,
    date: "2024-01-15",
    method: "Bank Transfer",
    status: "completed"
  },
  {
    id: "PAY-005",
    invoiceId: "INV-009",
    client: "WEETAN SBRFS LLP",
    amount: 185000,
    date: "2024-01-28",
    method: "UPI",
    status: "completed"
  }
];

// Utility functions - Fixed Badge variants
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": case "completed": case "approved": return "default";
    case "pending": return "secondary";
    case "overdue": case "failed": case "rejected": return "destructive";
    default: return "outline";
  }
};

export const getBalanceColor = (balance: number) => {
  if (balance > 0) return "text-green-600";
  if (balance < 0) return "text-red-600";
  return "text-gray-600";
};

export const getBalanceBadgeVariant = (status: string) => {
  switch (status) {
    case "debit": return "default";
    case "credit": return "destructive";
    case "settled": return "secondary";
    default: return "outline";
  }
};

export const getServiceIcon = (serviceType: string) => {
  switch (serviceType) {
    case "Housekeeping Management": return <Home className="h-4 w-4" />;
    case "Security Management": return <Shield className="h-4 w-4" />;
    case "Parking Management": return <Car className="h-4 w-4" />;
    case "Waste Management": return <Trash2 className="h-4 w-4" />;
    case "STP Tank Cleaning": return <Droplets className="h-4 w-4" />;
    case "Consumables Supply": return <Package className="h-4 w-4" />;
    default: return <Building className="h-4 w-4" />;
  }
};

export const getTypeIcon = (type: string) => {
  switch (type) {
    case "invoice": return <FileText className="h-4 w-4 text-blue-600" />;
    case "payment": return <DollarSign className="h-4 w-4 text-green-600" />;
    case "expense": return <Receipt className="h-4 w-4 text-red-600" />;
    case "credit_note": return <CreditCard className="h-4 w-4 text-purple-600" />;
    default: return <FileText className="h-4 w-4 text-gray-600" />;
  }
};

export const getExpenseTypeColor = (type: string) => {
  switch (type) {
    case "operational": return "bg-blue-100 text-blue-800 border-blue-200";
    case "office": return "bg-green-100 text-green-800 border-green-200";
    case "other": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Main Component
const Billing = () => {
  // State
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [partyBalances, setPartyBalances] = useState<PartyBalance[]>([]);
  const [siteProfits, setSiteProfits] = useState<SiteProfit[]>([]);
  
  // Calculations
  const totalRevenue = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingAmount = invoices
    .filter(i => i.status === "pending")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueAmount = invoices
    .filter(i => i.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalExpenses = expenses
    .filter(e => e.status === "approved")
    .reduce((sum, exp) => sum + exp.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  // Initialize Ledger
  const initializeLedger = () => {
    const entries: LedgerEntry[] = [];
    const balances: { [key: string]: PartyBalance } = {};

    // Process invoices
    invoices.forEach(invoice => {
      const entry: LedgerEntry = {
        id: `LED-${invoice.id}`,
        party: invoice.site || "Unknown Site",
        type: "invoice",
        reference: invoice.id,
        date: invoice.date,
        debit: invoice.amount,
        credit: 0,
        balance: 0,
        description: `${invoice.serviceType} - ${invoice.client}`,
        status: invoice.status,
        site: invoice.site,
        serviceType: invoice.serviceType
      };
      entries.push(entry);

      if (!balances[invoice.site || "Unknown Site"]) {
        balances[invoice.site || "Unknown Site"] = {
          party: invoice.site || "Unknown Site",
          totalDebit: 0,
          totalCredit: 0,
          currentBalance: 0,
          lastTransaction: invoice.date,
          status: "debit",
          site: invoice.site
        };
      }

      balances[invoice.site || "Unknown Site"].totalDebit += invoice.amount;
      balances[invoice.site || "Unknown Site"].lastTransaction = invoice.date;
    });

    // Process payments
    payments.forEach(payment => {
      if (payment.status === "completed") {
        const invoice = invoices.find(inv => inv.id === payment.invoiceId);
        const site = invoice?.site || "Unknown Site";
        
        const entry: LedgerEntry = {
          id: `LED-${payment.id}`,
          party: site,
          type: "payment",
          reference: payment.id,
          date: payment.date,
          debit: 0,
          credit: payment.amount,
          balance: 0,
          description: `Payment from ${payment.client}`,
          status: payment.status,
          site: site
        };
        entries.push(entry);

        if (!balances[site]) {
          balances[site] = {
            party: site,
            totalDebit: 0,
            totalCredit: 0,
            currentBalance: 0,
            lastTransaction: payment.date,
            status: "credit",
            site: site
          };
        }

        balances[site].totalCredit += payment.amount;
        balances[site].lastTransaction = payment.date;
      }
    });

    // Process expenses
    expenses.forEach(expense => {
      const entry: LedgerEntry = {
        id: `LED-${expense.id}`,
        party: expense.site || "Unknown Site",
        type: "expense",
        reference: expense.id,
        date: expense.date,
        debit: 0,
        credit: expense.amount,
        balance: 0,
        description: `${expense.description} - ${expense.vendor}`,
        status: expense.status,
        site: expense.site
      };
      entries.push(entry);

      if (!balances[expense.site || "Unknown Site"]) {
        balances[expense.site || "Unknown Site"] = {
          party: expense.site || "Unknown Site",
          totalDebit: 0,
          totalCredit: 0,
          currentBalance: 0,
          lastTransaction: expense.date,
          status: "credit",
          site: expense.site
        };
      }

      balances[expense.site || "Unknown Site"].totalCredit += expense.amount;
      balances[expense.site || "Unknown Site"].lastTransaction = expense.date;
    });

    // Calculate running balances
    const sortedEntries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const partyRunningBalances: { [key: string]: number } = {};

    sortedEntries.forEach(entry => {
      if (!partyRunningBalances[entry.party]) {
        partyRunningBalances[entry.party] = 0;
      }
      
      partyRunningBalances[entry.party] += entry.debit - entry.credit;
      entry.balance = partyRunningBalances[entry.party];
    });

    // Update party balances
    Object.keys(balances).forEach(party => {
      balances[party].currentBalance = partyRunningBalances[party] || 0;
      balances[party].status = 
        balances[party].currentBalance > 0 ? "debit" : 
        balances[party].currentBalance < 0 ? "credit" : "settled";
    });

    setLedgerEntries(sortedEntries);
    setPartyBalances(Object.values(balances));
  };

  const calculateSiteProfits = () => {
    const profits: SiteProfit[] = sites.map(site => {
      const siteInvoices = invoices.filter(inv => inv.site === site && inv.status === "paid");
      const siteExpenses = expenses.filter(exp => exp.site === site && exp.status === "approved");
      
      const revenue = siteInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const expensesTotal = siteExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const netProfit = revenue - expensesTotal;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      
      return {
        site,
        revenue,
        expenses: expensesTotal,
        netProfit,
        profitMargin
      };
    });
    
    setSiteProfits(profits);
  };

  // Event Handlers
  const handleCreateInvoice = (newInvoice: Invoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
    toast.success("Invoice created successfully!");
  };

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev]);
    toast.success("Expense added successfully!");
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
    toast.success("Expense updated successfully!");
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { ...inv, status: "paid" } : inv
    ));
    
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      const newPayment: Payment = {
        id: `PAY-${(payments.length + 1).toString().padStart(3, '0')}`,
        invoiceId,
        client: invoice.client,
        amount: invoice.amount,
        date: new Date().toISOString().split('T')[0],
        method: "Manual",
        status: "completed"
      };
      setPayments(prev => [newPayment, ...prev]);
    }
    
    toast.success("Invoice marked as paid!");
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const invoiceContent = `
      INVOICE: ${invoice.id}
      Client: ${invoice.client}
      Email: ${invoice.clientEmail}
      Date: ${invoice.date}
      Due Date: ${invoice.dueDate}
      Status: ${invoice.status}
      Service Type: ${invoice.serviceType}
      Site: ${invoice.site}
      
      Items:
      ${invoice.items.map(item => `
        ${item.description} - Qty: ${item.quantity} - Rate: ₹${item.rate} - Amount: ₹${item.amount}
      `).join('')}
      
      Subtotal: ₹${invoice.items.reduce((sum, item) => sum + item.amount, 0)}
      GST (18%): ₹${invoice.tax}
      Discount: ₹${invoice.discount}
      Total: ₹${invoice.amount}
    `;
    
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Invoice ${invoice.id} downloaded!`);
  };

  const handleExportData = (type: string) => {
    let data: any[] = [];
    let filename = "";
    let headers: string[] = [];
    let csvContent = "";

    switch (type) {
      case "payments":
        data = payments;
        filename = "payments-export.csv";
        headers = ["ID", "Invoice ID", "Client", "Amount", "Date", "Method", "Status"];
        csvContent = [
          headers.join(","),
          ...data.map(payment => [
            payment.id,
            payment.invoiceId,
            `"${payment.client}"`,
            payment.amount,
            payment.date,
            payment.method,
            payment.status
          ].join(","))
        ].join("\n");
        break;
      
      case "invoices":
        data = invoices;
        filename = "invoices-export.csv";
        headers = ["ID", "Client", "Client Email", "Amount", "Status", "Date", "Due Date", "Service Type", "Site", "Payment Method"];
        csvContent = [
          headers.join(","),
          ...data.map(invoice => [
            invoice.id,
            `"${invoice.client}"`,
            invoice.clientEmail,
            invoice.amount,
            invoice.status,
            invoice.date,
            invoice.dueDate,
            invoice.serviceType || "",
            invoice.site || "",
            invoice.paymentMethod || ""
          ].join(","))
        ].join("\n");
        break;
      
      case "expenses":
        data = expenses;
        filename = "expenses-export.csv";
        headers = ["ID", "Category", "Description", "Amount", "Date", "Status", "Vendor", "Payment Method", "GST", "Site", "Expense Type"];
        csvContent = [
          headers.join(","),
          ...data.map(expense => [
            expense.id,
            expense.category,
            `"${expense.description}"`,
            expense.amount,
            expense.date,
            expense.status,
            `"${expense.vendor}"`,
            expense.paymentMethod,
            expense.gst || 0,
            expense.site || "",
            expense.expenseType
          ].join(","))
        ].join("\n");
        break;
      
      case "site-profits":
        data = siteProfits;
        filename = "site-profits-export.csv";
        headers = ["Site", "Revenue", "Expenses", "Net Profit", "Profit Margin %"];
        csvContent = [
          headers.join(","),
          ...data.map(profit => [
            `"${profit.site}"`,
            profit.revenue,
            profit.expenses,
            profit.netProfit,
            profit.profitMargin.toFixed(2)
          ].join(","))
        ].join("\n");
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`);
  };

  // Effects
  useEffect(() => {
    initializeLedger();
    calculateSiteProfits();
  }, [invoices, payments, expenses]);

  // Pending Bills
  const pendingBills = invoices.filter(invoice => 
    invoice.status === "pending" || invoice.status === "overdue"
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Billing & Finance" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Enhanced Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">From {invoices.filter(i => i.status === "paid").length} paid invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">{invoices.filter(i => i.status === "pending").length} pending invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
              <p className="text-xs text-muted-foreground">{invoices.filter(i => i.status === "overdue").length} overdue invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">Revenue - Expenses</p>
            </CardContent>
          </Card>
        </div>


        {/* Main Tabs - Reduced from 5 to 4 tabs ..*/}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4"> {/* Changed from grid-cols-5 to grid-cols-4 */}
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payments">Payment Summary</TabsTrigger>
            <TabsTrigger value="ledger">Ledger & Balance</TabsTrigger>
            {/* Removed: <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger> */}
          </TabsList>

          <TabsContent value="invoices">
            {/* Note: InvoicesTab component fetches its own data, so we don't pass invoices prop */}
            <InvoicesTab
              onInvoiceCreate={handleCreateInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              userId="admin123" // Pass actual user ID
              userRole="admin" // Pass actual user role
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab
              expenses={expenses}
              onExpenseAdd={handleAddExpense}
              onExpenseUpdate={handleUpdateExpense}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSummaryTab
              invoices={invoices}
              payments={payments}
              expenses={expenses}
              onExportData={handleExportData}
            />
          </TabsContent>

          <TabsContent value="ledger">
            <LedgerBalanceTab
              ledgerEntries={ledgerEntries}
              partyBalances={partyBalances}
              onExportData={handleExportData}
            />
          </TabsContent>

          {/* Removed Revenue Analytics tab content */}
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Billing;