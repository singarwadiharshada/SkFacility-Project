import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Home,
  Shield,
  Car,
  Trash2,
  Droplets,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  List,
  PieChart,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Users,
  Building,
  CalendarDays,
  Filter,
  Eye
} from 'lucide-react';

// Recharts for charts
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Chart color constants (EXACTLY THE SAME)
const CHART_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  payroll: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444']
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Generate attendance data from today going backwards
const generateAttendanceData = () => {
  const data = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);

    const dayName = i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
        date.toLocaleDateString('en-US', { weekday: 'long' });

    const present = Math.floor(Math.random() * 30) + 85;
    const absent = Math.floor(Math.random() * 15) + 5;
    const total = present + absent;
    const rate = ((present / total) * 100).toFixed(1) + '%';

    data.push({
      date: date.toISOString().split('T')[0],
      day: dayName,
      present,
      absent,
      total,
      rate,
      index: i
    });
  }

  return data;
};

const attendanceData = generateAttendanceData();

// Department View Data
const departmentViewData = [
  {
    department: 'Housekeeping',
    present: 56,
    total: 65,
    rate: '86.2%',
    icon: Home,
    color: 'from-blue-50 to-blue-100 border-blue-200'
  },
  {
    department: 'Security',
    present: 26,
    total: 28,
    rate: '92.9%',
    icon: Shield,
    color: 'from-green-50 to-green-100 border-green-200'
  },
  {
    department: 'Parking',
    present: 5,
    total: 5,
    rate: '100%',
    icon: Car,
    color: 'from-purple-50 to-purple-100 border-purple-200'
  },
  {
    department: 'Waste Management',
    present: 8,
    total: 10,
    rate: '80.0%',
    icon: Trash2,
    color: 'from-gray-50 to-gray-100 border-gray-200'
  },
  {
    department: 'Consumables',
    present: 3,
    total: 3,
    rate: '100%',
    icon: ShoppingCart,
    color: 'from-orange-50 to-orange-100 border-orange-200'
  },
  {
    department: 'Other',
    present: 5,
    total: 7,
    rate: '71.4%',
    icon: Droplets,
    color: 'from-cyan-50 to-cyan-100 border-cyan-200'
  },
];

// Outstanding Amount Data
const outstandingData = {
  totalInvoices: 45,
  receivedTotalAmount: 3250000,
  totalOutstandingDue: 1850000
};

// Site Names Data (shortened for readability)
const siteNames = [
  'ALYSSUM DEVELOPERS PVT. LTD.',
  'ARYA ASSOCIATES',
  'ASTITVA ASSET MANAGEMENT LLP',
  'A.T.C COMMERCIAL PREMISES CO. OPERATIVE SOCIETY LTD',
  'BAHIRAT ESTATE LLP',
  'CHITRALI PROPERTIES PVT LTD',
  'Concretely Infra Llp',
  'COORTUS ADVISORS LLP',
  'CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.',
];

const generatePayrollData = () => {
  const payrollData = [];

  siteNames.forEach((siteName, index) => {
    const billingAmount = Math.floor(Math.random() * 500000) + 200000;
    const totalPaid = Math.floor(Math.random() * billingAmount * 0.8) + (billingAmount * 0.2);
    const holdSalary = billingAmount - totalPaid;

    const remarks = [
      'Payment processed',
      'Pending approval',
      'Under review',
      'Payment scheduled',
      'Awaiting documents',
      'Completed',
      'On hold'
    ];

    payrollData.push({
      id: index + 1,
      siteName,
      billingAmount,
      totalPaid,
      holdSalary: holdSalary > 0 ? holdSalary : 0,
      remark: remarks[Math.floor(Math.random() * remarks.length)],
      status: holdSalary > 0 ? 'Pending' : 'Paid'
    });
  });

  return payrollData;
};

const years = ['2024', '2023', '2022', '2021'];
const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

// Enhanced Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <motion.div
      className="flex items-center justify-between px-2 py-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold">{startItem}-{endItem}</span> of{" "}
        <span className="font-semibold">{totalItems}</span> entries
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <motion.div
              key={pageNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="min-w-[2rem] hover:shadow-md transition-shadow"
              >
                {pageNum}
              </Button>
            </motion.div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

const exportToExcel = (data: any[], filename: string) => {
  const headers = ['Site Name', 'Billing Amount (₹)', 'Total Paid (₹)', 'Hold Salary (₹)', 'Difference (₹)', 'Status', 'Remark'];

  const csvContent = [
    headers.join(','),
    ...data.map(item => {
      const difference = item.billingAmount - item.totalPaid + item.holdSalary;
      return [
        `"${item.siteName}"`,
        item.billingAmount,
        item.totalPaid,
        item.holdSalary,
        difference,
        item.status,
        `"${item.remark}"`
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

const SuperAdminDashboard = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const navigate = useNavigate();

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [sixDaysStartIndex, setSixDaysStartIndex] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [payrollData, setPayrollData] = useState(generatePayrollData());
  const [payrollTab, setPayrollTab] = useState('list-view');
  const [selectedSite, setSelectedSite] = useState(siteNames[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const currentDayData = attendanceData[currentDayIndex];
  const sixDaysData = attendanceData.slice(sixDaysStartIndex, sixDaysStartIndex + 6);

  const currentDayPieData = [
    { name: 'Present', value: currentDayData.present, color: CHART_COLORS.present },
    { name: 'Absent', value: currentDayData.absent, color: CHART_COLORS.absent }
  ];

  const payrollSummary = useMemo(() => {
    const totalBilling = payrollData.reduce((sum, item) => sum + item.billingAmount, 0);
    const totalPaid = payrollData.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalHold = payrollData.reduce((sum, item) => sum + item.holdSalary, 0);
    const totalDifference = payrollData.reduce((sum, item) => sum + (item.billingAmount - item.totalPaid + item.holdSalary), 0);

    return {
      totalBilling,
      totalPaid,
      totalHold,
      totalDifference,
      completionRate: ((totalPaid / totalBilling) * 100).toFixed(1)
    };
  }, [payrollData]);

  const filteredPayrollData = useMemo(() => {
    return payrollData.filter(item =>
      item.siteName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payrollData, searchTerm]);

  const paginatedPayrollData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayrollData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayrollData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPayrollData.length / itemsPerPage);
  const selectedSiteData = payrollData.find(item => item.siteName === selectedSite);

  const sitePieChartData = selectedSiteData ? [
    { name: 'Total Paid', value: selectedSiteData.totalPaid, color: CHART_COLORS.payroll[1] },
    { name: 'Hold Salary', value: selectedSiteData.holdSalary, color: CHART_COLORS.payroll[5] }
  ] : [];

  const handlePreviousDay = () => {
    setCurrentDayIndex(prev => (prev > 0 ? prev - 1 : attendanceData.length - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex(prev => (prev < attendanceData.length - 1 ? prev + 1 : 0));
  };

  const handleSixDaysPrevious = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev + 6;
      const maxIndex = attendanceData.length - 6;
      return newIndex <= maxIndex ? newIndex : prev;
    });
  };

  const handleSixDaysNext = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev - 6;
      return newIndex >= 1 ? newIndex : prev;
    });
  };

  const canGoSixDaysPrevious = sixDaysStartIndex < attendanceData.length - 6;
  const canGoSixDaysNext = sixDaysStartIndex > 1;

  const getDateRangeText = () => {
    if (sixDaysData.length === 0) return '';

    const firstDate = new Date(sixDaysData[0].date);
    const lastDate = new Date(sixDaysData[sixDaysData.length - 1].date);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
  };

  const handlePayrollFilterChange = () => {
    setPayrollData(generatePayrollData());
    setCurrentPage(1);
    toast.success(`Payroll data updated for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExportToExcel = () => {
    const monthName = months.find(m => m.value === selectedMonth)?.label;
    const filename = `Payroll_Data_${monthName}_${selectedYear}.csv`;

    exportToExcel(filteredPayrollData, filename);
    toast.success(`Payroll data exported to ${filename}`);
  };

  const handlePieChartClick = (date?: string) => {
    const selectedDate = date || currentDayData.date;
    navigate(`/superadmin/attendaceview?view=site&date=${selectedDate}`);
  };

  const handleSmallPieChartClick = (dayData: any) => {
    navigate(`/superadmin/attendaceview?view=site&date=${dayData.date}`);
  };

  const handleDepartmentCardClick = (department: string) => {
    navigate(`/superadmin/attendaceview?view=department&department=${department}&date=Today`);
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 border rounded-lg shadow-lg"
        >
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            {data.value} employees ({((data.value / currentDayData.total) * 100).toFixed(1)}%)
          </p>
        </motion.div>
      );
    }
    return null;
  };

  const CustomPayrollTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 border rounded-lg shadow-lg"
        >
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            {formatCurrency(data.value)} ({((data.value / (selectedSiteData?.billingAmount || 1)) * 100).toFixed(1)}%)
          </p>
        </motion.div>
      );
    }
    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDifference = (item: any) => {
    return item.billingAmount - item.totalPaid + item.holdSalary;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50/50">
      <DashboardHeader
        title={
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Super Admin Dashboard
          </span>
        }
        subtitle="Comprehensive Overview of Attendance, Departments, and Payroll"
        onMenuClick={onMenuClick}
      />
      <div className="p-4 sm:p-6 space-y-6">
        {/* 7 Days Attendance Rate Pie Charts - Moved to Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-blue-100/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="px-4 sm:px-6 bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                    <PieChartIcon className="h-5 w-5" />
                    7 Days Attendance Rate
                  </CardTitle>
                  <p className="text-sm text-blue-600/80 mt-1">
                    Daily attendance overview with interactive navigation
                  </p>
                </div>
                <Badge variant="outline" className="bg-white/80 border-blue-200">
                  <Eye className="h-3 w-3 mr-1" />
                  Interactive
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {/* 6 Days Small Pie Charts */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Historical Overview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getDateRangeText()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSixDaysPrevious}
                      disabled={!canGoSixDaysPrevious}
                      className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSixDaysNext}
                      disabled={!canGoSixDaysNext}
                      className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {sixDaysData.map((dayData, index) => {
                    const pieData = [
                      { name: 'Present', value: dayData.present, color: CHART_COLORS.present },
                      { name: 'Absent', value: dayData.absent, color: CHART_COLORS.absent }
                    ];

                    return (
                      <motion.div
                        key={`${dayData.date}-${index}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          className="cursor-pointer transform transition-all duration-200 hover:shadow-lg border-2 hover:border-blue-300"
                          onClick={() => handleSmallPieChartClick(dayData)}
                        >
                          <CardContent className="p-3">
                            <div className="text-center mb-2">
                              <p className="text-xs font-medium text-gray-700">{dayData.day}</p>
                              <p className="text-xs text-muted-foreground">{dayData.date}</p>
                              <Badge variant={
                                parseFloat(dayData.rate) > 90 ? 'default' :
                                  parseFloat(dayData.rate) > 80 ? 'secondary' : 'destructive'
                              } className="mt-1 text-xs">
                                {dayData.rate}
                              </Badge>
                            </div>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={40}
                                    fill="#8884d8"
                                    dataKey="value"
                                    labelLine={false}
                                  >
                                    {pieData.map((entry, cellIndex) => (
                                      <Cell key={`cell-${cellIndex}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-2">
                              <div className="flex justify-center space-x-4 text-xs">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                  <span>{dayData.present}</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                  <span>{dayData.absent}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Main Today's Pie Chart */}
              <div className="border-t pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      Today's Overview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Total Employees: {currentDayData.total} | Attendance Rate: {currentDayData.rate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousDay}
                      className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground mx-2 min-w-[60px] text-center">
                      Day {currentDayIndex + 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextDay}
                      className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="cursor-pointer"
                  onClick={() => handlePieChartClick(currentDayData.date)}
                >
                  <div className="w-full h-80 sm:h-96 bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-xl p-4 border-2 border-blue-200/50 hover:border-blue-400 transition-colors duration-300 backdrop-blur-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={currentDayPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {currentDayPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Click on the chart to view detailed site-wise attendance for {currentDayData.date}
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="px-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100/30 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-800">Department Performance</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click on each department to view detailed attendance metrics
                  </p>
                </div>
                <Badge variant="outline" className="bg-white/80 border-gray-200">
                  <Users className="h-3 w-3 mr-1" />
                  {departmentViewData.reduce((sum, dept) => sum + dept.total, 0)} Employees
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
              >
                {departmentViewData.map((dept, index) => {
                  const IconComponent = dept.icon;
                  return (
                    <motion.div
                      key={dept.department}
                      variants={itemVariants}
                      custom={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card
                        className={`text-center cursor-pointer transform transition-all duration-200 hover:shadow-xl border-2 hover:border-blue-400 bg-gradient-to-b ${dept.color}`}
                        onClick={() => handleDepartmentCardClick(dept.department)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="p-2 bg-white/50 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                            <IconComponent className="h-6 w-6 text-gray-700" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 mb-2">{dept.department}</p>
                          <div className="space-y-1">
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{dept.present}</p>
                            <p className="text-xs text-muted-foreground">of {dept.total} employees</p>
                          </div>
                          <Badge variant={
                            parseFloat(dept.rate) > 90 ? 'default' :
                              parseFloat(dept.rate) > 80 ? 'secondary' : 'destructive'
                          } className="mt-2 text-xs">
                            {dept.rate} Attendance
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payroll Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="px-4 sm:px-6 bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-t-lg border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-blue-800">Payroll Management</CardTitle>
                  <p className="text-sm text-blue-600/80 mt-1">
                    Site-wise payroll details with advanced filtering and analytics
                  </p>
                </div>
                <Badge className="bg-blue-600 hover:bg-blue-700">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatCurrency(payrollSummary.totalBilling)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {/* Payroll Filters */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-4 mb-6"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Select Year
                    </label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-3 w-3" />
                      Select Month
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium invisible">Apply</label>
                    <Button
                      onClick={handlePayrollFilterChange}
                      className="w-full bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Payroll Summary Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
              >
                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Total Billing</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(payrollSummary.totalBilling)}
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="p-2 bg-blue-500/10 rounded-full"
                        >
                          <DollarSign className="h-6 w-6 text-blue-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Total Paid</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(payrollSummary.totalPaid)}
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="p-2 bg-green-500/10 rounded-full"
                        >
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-800">Hold Salary</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(payrollSummary.totalHold)}
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="p-2 bg-orange-500/10 rounded-full"
                        >
                          <Clock className="h-6 w-6 text-orange-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-800">Difference</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(payrollSummary.totalDifference)}
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="p-2 bg-purple-500/10 rounded-full"
                        >
                          <AlertCircle className="h-6 w-6 text-purple-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Payroll Tabs */}
              <div className="mb-6">
                <div className="border-b">
                  <div className="flex space-x-8">
                    <button
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${payrollTab === 'list-view'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      onClick={() => setPayrollTab('list-view')}
                    >
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        List View
                      </div>
                    </button>
                    <button
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${payrollTab === 'pie-chart'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      onClick={() => setPayrollTab('pie-chart')}
                    >
                      <div className="flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Pie Chart View
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* List View */}
              <AnimatePresence mode="wait">
                {payrollTab === 'list-view' && (
                  <motion.div
                    key="list-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 w-full">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by site name..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="pl-10 w-full"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportToExcel}
                          className="hover:scale-105 transition-transform"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>

                    {/* Payroll Table */}
                    <div className="rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50">
                              {['Site Name', 'Billing Amount', 'Total Paid', 'Hold Salary', 'Difference', 'Status', 'Remark'].map((header, index) => (
                                <th key={header} className="h-12 px-4 text-left align-middle font-semibold text-gray-700">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPayrollData.map((item, index) => {
                              const difference = calculateDifference(item);
                              return (
                                <motion.tr
                                  key={item.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="border-b hover:bg-gray-50/50 transition-colors"
                                >
                                  <td className="p-4 align-middle font-medium">
                                    <div>
                                      <div className="font-medium text-sm">{item.siteName.split(',')[0]}</div>
                                    </div>
                                  </td>
                                  <td className="p-4 align-middle font-bold text-gray-800">
                                    {formatCurrency(item.billingAmount)}
                                  </td>
                                  <td className="p-4 align-middle text-green-600 font-semibold">
                                    {formatCurrency(item.totalPaid)}
                                  </td>
                                  <td className="p-4 align-middle text-orange-600 font-semibold">
                                    {formatCurrency(item.holdSalary)}
                                  </td>
                                  <td className="p-4 align-middle font-bold" style={{
                                    color: difference > 0 ? '#ef4444' : difference < 0 ? '#10b981' : '#6b7280'
                                  }}>
                                    {formatCurrency(difference)}
                                  </td>
                                  <td className="p-4 align-middle">
                                    <Badge
                                      variant={item.status === 'Paid' ? 'default' : 'secondary'}
                                      className="text-xs px-3 py-1 rounded-full"
                                    >
                                      {item.status}
                                    </Badge>
                                  </td>
                                  <td className="p-4 align-middle">
                                    <span className="text-xs text-muted-foreground">{item.remark}</span>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={filteredPayrollData.length}
                        itemsPerPage={itemsPerPage}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Pie Chart View */}
                {payrollTab === 'pie-chart' && (
                  <motion.div
                    key="pie-chart"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Building className="h-3 w-3" />
                          Select Site
                        </label>
                        <Select value={selectedSite} onValueChange={setSelectedSite}>
                          <SelectTrigger className="hover:border-blue-400 transition-colors">
                            <SelectValue placeholder="Select Site" />
                          </SelectTrigger>
                          <SelectContent>
                            {siteNames.map(site => (
                              <SelectItem key={site} value={site}>
                                {site.split(',')[0]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {selectedSiteData && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Payroll Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <Pie
                                    data={sitePieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {sitePieChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomPayrollTooltip />} />
                                  <Legend />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Site Details */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Site Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <motion.div
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              className="space-y-4"
                            >
                              <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                  <span className="font-medium">Billing Amount:</span>
                                  <span className="font-bold text-blue-600">
                                    {formatCurrency(selectedSiteData.billingAmount)}
                                  </span>
                                </div>
                              </motion.div>
                              <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                  <span className="font-medium">Total Paid:</span>
                                  <span className="font-bold text-green-600">
                                    {formatCurrency(selectedSiteData.totalPaid)}
                                  </span>
                                </div>
                              </motion.div>
                              <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                  <span className="font-medium">Hold Salary:</span>
                                  <span className="font-bold text-orange-600">
                                    {formatCurrency(selectedSiteData.holdSalary)}
                                  </span>
                                </div>
                              </motion.div>
                              <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                                  <span className="font-medium">Difference:</span>
                                  <span className="font-bold text-purple-600">
                                    {formatCurrency(calculateDifference(selectedSiteData))}
                                  </span>
                                </div>
                              </motion.div>
                              <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <span className="font-medium">Status:</span>
                                  <Badge variant={selectedSiteData.status === 'Paid' ? 'default' : 'secondary'}>
                                    {selectedSiteData.status}
                                  </Badge>
                                </div>
                              </motion.div>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;