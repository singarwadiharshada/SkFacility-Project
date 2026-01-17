import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle, TrendingUp, TrendingDown, FileText, Building } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";
import { SiteProfit, formatCurrency } from "../Billing";
import { siteService, Site } from "@/services/SiteService";
import InvoiceService from "@/services/InvoiceService";
import { expenseService } from "@/services/expenseService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface RevenueAnalyticsTabProps {
  siteProfits: SiteProfit[];
  onExportData: (type: string) => void;
  refreshTrigger?: number;
}

interface EnhancedSiteProfit extends SiteProfit {
  siteDetails?: Site;
  location?: string;
  clientName?: string;
  siteType?: string;
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
  items: any[];
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
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;
  companyState?: string;
  companyStateCode?: string;
  consignee?: string;
  consigneeAddress?: string;
  consigneeGSTIN?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  buyer?: string;
  buyerAddress?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  buyerRef?: string;
  dispatchedThrough?: string;
  paymentTerms?: string;
  notes?: string;
  destination?: string;
  deliveryTerms?: string;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  branchAndIFSC?: string;
  amountInWords?: string;
  termsConditions?: string;
  footerNote?: string;
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
  siteId?: string;
  expenseType: "operational" | "office" | "other";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#A3E4D7',
  '#F1948A', '#AED6F1', '#D7BDE2', '#A9DFBF', '#F9E79F', '#D5DBDB',
  '#A569BD', '#5DADE2', '#58D68D', '#F7DC6F', '#EB984E', '#CD6155'
];

const REFRESH_INTERVAL = 10000; // 10 seconds

const RevenueAnalyticsTab: React.FC<RevenueAnalyticsTabProps> = ({
  siteProfits,
  onExportData,
  refreshTrigger = 0
}) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [enhancedSiteProfits, setEnhancedSiteProfits] = useState<EnhancedSiteProfit[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const [invoicesData, expensesData, sitesData] = await Promise.all([
        fetchInvoices(),
        fetchExpenses(),
        siteService.getAllSites().catch(() => [])
      ]);

      setInvoices(invoicesData);
      setExpenses(expensesData);
      setSites(sitesData || []);
      
      if (sitesData && sitesData.length > 0 && siteProfits.length > 0) {
        const enhanced = enhanceSiteProfitsWithSiteData(sitesData);
        setEnhancedSiteProfits(enhanced);
      } else {
        setEnhancedSiteProfits(siteProfits as EnhancedSiteProfit[]);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data. Please try refreshing.");
      toast.error("Failed to load analytics data");
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [siteProfits]);

  const fetchInvoices = async (): Promise<TaxInvoice[]> => {
    try {
      const data = await InvoiceService.getAllInvoices();
      return data.map(invoice => ({
        ...invoice,
        invoiceType: invoice.invoiceType || "tax",
        status: invoice.status || "pending"
      })) as TaxInvoice[];
    } catch (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }
  };

  const fetchExpenses = async (): Promise<Expense[]> => {
    try {
      const data = await expenseService.getExpenses();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching expenses:", error);
      return [];
    }
  };

  const enhanceSiteProfitsWithSiteData = (sitesData: Site[]) => {
    if (!sitesData.length || !siteProfits.length) return siteProfits as EnhancedSiteProfit[];

    return siteProfits.map(profit => {
      const foundSite = sitesData.find(site => 
        site.name.toLowerCase() === profit.site.toLowerCase() ||
        profit.site.toLowerCase().includes(site.name.toLowerCase()) ||
        site.name.toLowerCase().includes(profit.site.toLowerCase())
      );

      const site = foundSite;

      return {
        ...profit,
        siteDetails: site,
        location: site?.location || 'Location not available',
        clientName: site?.clientName || site?.client || 'Client not available',
        siteType: site?.type || site?.siteType || 'Type not specified'
      } as EnhancedSiteProfit;
    });
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Calculate all analytics data
  const calculateRevenueTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const revenueTrend = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[month.getMonth()];
      const year = month.getFullYear();
      
      const monthlyRevenue = invoices
        .filter(invoice => {
          try {
            const invoiceDate = new Date(invoice.date);
            return invoiceDate.getFullYear() === year && 
                   invoiceDate.getMonth() === month.getMonth() &&
                   invoice.status === 'paid';
          } catch {
            return false;
          }
        })
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      const monthlyExpenses = expenses
        .filter(expense => {
          try {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === year && 
                   expenseDate.getMonth() === month.getMonth() &&
                   expense.status === 'approved';
          } catch {
            return false;
          }
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      revenueTrend.push({
        month: `${monthName} ${year.toString().slice(-2)}`,
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
        profit: monthlyRevenue - monthlyExpenses
      });
    }
    
    return revenueTrend;
  };

  const calculateExpenseByCategory = () => {
    const categoryMap: Record<string, { value: number; count: number; site: string }> = {};
    
    expenses.forEach(expense => {
      if (expense.status === 'approved') {
        const category = expense.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = { value: 0, count: 0, site: expense.site || 'Unknown Site' };
        }
        categoryMap[category].value += expense.amount;
        categoryMap[category].count += 1;
        // Store site information if not already set
        if (categoryMap[category].site === 'Unknown Site' && expense.site) {
          categoryMap[category].site = expense.site;
        }
      }
    });
    
    const expenseCategories = Object.entries(categoryMap)
      .map(([name, data]) => ({ 
        name, 
        value: data.value,
        count: data.count,
        site: data.site
      }))
      .sort((a, b) => b.value - a.value);
    
    return expenseCategories;
  };

  const calculateServiceRevenueDistribution = () => {
    const serviceMap: Record<string, { revenue: number; count: number; site: string }> = {};
    
    invoices.forEach(invoice => {
      if (invoice.status === 'paid') {
        const serviceType = invoice.serviceType || 'Other Services';
        if (!serviceMap[serviceType]) {
          serviceMap[serviceType] = { revenue: 0, count: 0, site: invoice.site || 'Unknown Site' };
        }
        serviceMap[serviceType].revenue += invoice.amount;
        serviceMap[serviceType].count += 1;
        // Store site information if not already set
        if (serviceMap[serviceType].site === 'Unknown Site' && invoice.site) {
          serviceMap[serviceType].site = invoice.site;
        }
      }
    });
    
    const serviceRevenue = Object.entries(serviceMap)
      .map(([service, data]) => ({ 
        service, 
        revenue: data.revenue,
        count: data.count,
        site: data.site
      }))
      .sort((a, b) => b.revenue - a.revenue);
    
    return serviceRevenue;
  };

  const calculateSummaryStats = () => {
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    
    const approvedExpenses = expenses.filter(e => e.status === 'approved');
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    const rejectedExpenses = expenses.filter(e => e.status === 'rejected');
    
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const avgInvoiceValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
    const avgExpenseValue = approvedExpenses.length > 0 ? totalExpenses / approvedExpenses.length : 0;
    
    const revenueExpenseRatio = totalExpenses > 0 ? totalRevenue / totalExpenses : 0;
    
    const uniqueServiceTypes = [...new Set(invoices.map(inv => inv.serviceType || 'Unknown'))];
    const uniqueExpenseCategories = [...new Set(expenses.map(exp => exp.category || 'Uncategorized'))];
    
    // Get site information for expenses
    const expenseSites = [...new Set(expenses.map(exp => exp.site).filter(Boolean))];
    
    return {
      totalInvoices: invoices.length,
      paidInvoices: paidInvoices.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalRevenue,
      
      totalExpenses: expenses.length,
      approvedExpenses: approvedExpenses.length,
      pendingExpenses: pendingExpenses.length,
      rejectedExpenses: rejectedExpenses.length,
      totalExpensesAmount: totalExpenses,
      
      netProfit,
      avgInvoiceValue,
      avgExpenseValue,
      revenueExpenseRatio,
      
      serviceTypesCount: uniqueServiceTypes.length,
      expenseCategoriesCount: uniqueExpenseCategories.length,
      expenseSitesCount: expenseSites.length,
      uniqueServiceTypes,
      uniqueExpenseCategories,
      expenseSites
    };
  };

  const revenueData = calculateRevenueTrend();
  const expenseByCategory = calculateExpenseByCategory();
  const serviceRevenueData = calculateServiceRevenueDistribution();
  const summaryStats = calculateSummaryStats();

  const formatCurrencyTooltip = (value: number) => {
    return formatCurrency(value);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-sm">{data.name || data.service || 'Category'}</p>
          <p className="mt-1">{`Amount: ${formatCurrency(data.value || data.revenue)}`}</p>
          {data.count && <p>{`Transactions: ${data.count}`}</p>}
          {data.site && <p>{`Site: ${data.site}`}</p>}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">Financial Analytics</CardTitle>
          <Badge variant="outline" className="text-xs">
            Auto-refresh: 10s
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated: {formatTimeAgo(lastUpdated)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAllData}
            disabled={refreshing}
            className="h-8 px-2"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExportData("analytics")} className="h-8 px-2">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAllData}
              className="mt-2 h-7 px-2 text-xs"
              disabled={refreshing}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Summary Stats - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(summaryStats.totalRevenue)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {summaryStats.paidInvoices} paid
                    </Badge>
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-green-500 mt-1" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(summaryStats.totalExpensesAmount)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {summaryStats.approvedExpenses} approved
                    </Badge>
                  </div>
                </div>
                <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                  <p className={`text-lg font-bold ${summaryStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(summaryStats.netProfit)}
                  </p>
                  <div className="mt-1">
                    <Badge variant={summaryStats.netProfit >= 0 ? "default" : "destructive"} className="text-[10px] px-1">
                      {summaryStats.totalRevenue > 0 
                        ? `${((summaryStats.netProfit / summaryStats.totalRevenue) * 100).toFixed(1)}% margin`
                        : '0% margin'}
                    </Badge>
                  </div>
                </div>
                {summaryStats.netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-blue-500 mt-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mt-1" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sites Active</p>
                  <p className="text-lg font-bold text-purple-600">
                    {summaryStats.expenseSitesCount}
                  </p>
                  <div className="mt-1 text-xs">
                    <span className="text-green-600">{summaryStats.serviceTypesCount} services</span>
                    <span className="mx-1">•</span>
                    <span className="text-red-600">{summaryStats.expenseCategoriesCount} categories</span>
                  </div>
                </div>
                <Building className="h-4 w-4 text-purple-500 mt-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Single column layout */}
        <div className="space-y-4">
          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip 
                      formatter={(value) => [formatCurrencyTooltip(value as number), "Amount"]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar 
                      dataKey="revenue" 
                      fill="#10b981" 
                      name="Revenue" 
                      radius={[2, 2, 0, 0]}
                      barSize={20}
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="#ef4444" 
                      name="Expenses" 
                      radius={[2, 2, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Profit Trend Chart */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">Profit Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip 
                      formatter={(value) => [formatCurrencyTooltip(value as number), "Profit"]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Net Profit"
                      dot={{ r: 3 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Revenue Distribution Only */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Service Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-80">
              {serviceRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceRevenueData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {serviceRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{
                        paddingLeft: '10px',
                        fontSize: '10px',
                        maxHeight: '250px',
                        overflowY: 'auto'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-sm">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-center">No service revenue data available</p>
                </div>
              )}
            </div>
            
            {/* Services List - Compact */}
            {serviceRevenueData.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Service Breakdown</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 px-2 text-xs">Service Type</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-right">Invoices</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-right">Revenue</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-right">Site</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceRevenueData.map((service, index) => {
                        const totalRevenue = serviceRevenueData.reduce((sum, s) => sum + s.revenue, 0);
                        const percentage = totalRevenue > 0 ? (service.revenue / totalRevenue * 100) : 0;
                        return (
                          <TableRow key={index} className="h-8">
                            <TableCell className="px-2 py-1">
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-xs truncate">{service.service}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right">
                              <Badge variant="outline" className="text-[10px] px-1">{service.count}</Badge>
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right text-xs font-semibold">
                              {formatCurrency(service.revenue)}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right">
                              <Badge variant="outline" className="text-[10px] px-1 truncate max-w-[80px]">
                                {service.site || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Data Summary - Compact */}
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Financial Summary</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Updated: {formatTimeAgo(lastUpdated)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Invoices Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-primary">Invoices</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center p-2 bg-muted rounded text-xs">
                    <span>Total</span>
                    <Badge variant="secondary" className="text-[10px] px-1">{summaryStats.totalInvoices}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded text-xs">
                    <span className="text-green-700 font-medium">Paid</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="default" className="text-[10px] px-1">{summaryStats.paidInvoices}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-xs">
                    <span className="text-yellow-700 font-medium">Pending</span>
                    <Badge variant="outline" className="text-[10px] px-1">{summaryStats.pendingInvoices}</Badge>
                  </div>
                </div>
              </div>

              {/* Expenses Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-destructive">Expenses</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center p-2 bg-muted rounded text-xs">
                    <span>Total</span>
                    <Badge variant="secondary" className="text-[10px] px-1">{summaryStats.totalExpenses}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded text-xs">
                    <span className="text-green-700 font-medium">Approved</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="default" className="text-[10px] px-1">{summaryStats.approvedExpenses}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-xs">
                    <span className="text-yellow-700 font-medium">Pending</span>
                    <Badge variant="outline" className="text-[10px] px-1">{summaryStats.pendingExpenses}</Badge>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-blue-600">Performance</h4>
                <div className="space-y-1">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-[10px] text-blue-700">Net Profit</div>
                    <div className={`text-sm font-bold ${summaryStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summaryStats.netProfit)}
                    </div>
                  </div>
                  
                  <div className="p-2 bg-gray-50 rounded text-xs">
                    <div className="text-gray-600">Profit Margin</div>
                    <div className={`font-bold ${summaryStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryStats.totalRevenue > 0 
                        ? `${((summaryStats.netProfit / summaryStats.totalRevenue) * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Averages and Ratios */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-purple-600">Averages</h4>
                <div className="space-y-1">
                  <div className="p-2 bg-gray-50 rounded text-xs">
                    <div className="text-gray-600">Avg. Invoice</div>
                    <div className="font-bold">{formatCurrency(summaryStats.avgInvoiceValue)}</div>
                  </div>
                  
                  <div className="p-2 bg-gray-50 rounded text-xs">
                    <div className="text-gray-600">Avg. Expense</div>
                    <div className="font-bold">{formatCurrency(summaryStats.avgExpenseValue)}</div>
                  </div>
                  
                  <div className="p-2 bg-purple-50 rounded text-xs">
                    <div className="text-purple-600">R/E Ratio</div>
                    <div className={`font-bold ${summaryStats.revenueExpenseRatio >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {summaryStats.revenueExpenseRatio.toFixed(1)}:1
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity - Compact */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-xs mb-2">Recent Activity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-medium mb-1 text-green-600">Recent Invoices</h5>
                  <div className="space-y-1">
                    {invoices.slice(0, 3).map(invoice => (
                      <div key={invoice._id} className="flex justify-between items-center p-1.5 hover:bg-gray-50 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-xs">{invoice.client}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{invoice.site || 'No site'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'pending' ? 'secondary' : 'destructive'
                          } className="text-[10px] px-1">
                            {invoice.status}
                          </Badge>
                          <span className="font-medium text-xs">{formatCurrency(invoice.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-xs font-medium mb-1 text-red-600">Recent Expenses</h5>
                  <div className="space-y-1">
                    {expenses.slice(0, 3).map(expense => (
                      <div key={expense._id} className="flex justify-between items-center p-1.5 hover:bg-gray-50 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-xs">{expense.site || 'Unknown Site'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{expense.category}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={
                            expense.status === 'approved' ? 'default' : 
                            expense.status === 'pending' ? 'secondary' : 'destructive'
                          } className="text-[10px] px-1">
                            {expense.status}
                          </Badge>
                          <span className="font-medium text-xs">{formatCurrency(expense.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default RevenueAnalyticsTab;