// src/components/hrms/HRMS.tsx
import { useState } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import EmployeesTab from "./EmployeesTab";
import OnboardingTab from "./OnboardingTab";
import AttendanceTab from "./AttendanceTab";
import LeaveManagementTab from "./LeaveManagementTab";
import ShiftRosterTab from "./ShiftRosterTab";
import PayrollTab from "./PayrollTab";
import PerformanceTab from "./PerformanceTab";
import ReportsTab from "./ReportsTab";
import { 
  Employee, 
  LeaveRequest, 
  Attendance, 
  Payroll, 
  Performance, 
  Shift, 
  SalaryStructure, 
  SalarySlip 
} from "./types";
import { Deduction } from "@/services/DeductionService";

// Initial Data (moved from original file)
const initialEmployees: Employee[] = [
  {
    id: 1,
    employeeId: "EMP001",
    name: "PRAVIN GAIKWAD",
    email: "pravin.gaikwad@company.com",
    phone: "9876543210",
    aadharNumber: "1234 5678 9012",
    department: "Housekeeping Management",
    position: "Housekeeping Supervisor",
    joinDate: "2023-01-15",
    status: "active",
    salary: 25000,
    uan: "101234567890",
    esicNumber: "231234567890",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-01-15",
        expiryDate: "2030-01-15",
        status: "valid"
      },
      {
        id: 2,
        type: "PAN Card",
        name: "pan_card.pdf",
        uploadDate: "2023-01-15",
        expiryDate: "2030-01-15",
        status: "valid"
      }
    ]
  },
  {
    id: 2,
    employeeId: "EMP002",
    name: "KAILASH WAGHMARE",
    email: "kailash.waghmare@company.com",
    phone: "9876543211",
    aadharNumber: "2345 6789 0123",
    department: "Security Management",
    position: "Security Supervisor",
    joinDate: "2022-03-10",
    status: "active",
    salary: 22000,
    uan: "101234567891",
    esicNumber: "231234567891",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2022-03-10",
        expiryDate: "2024-03-10",
        status: "expiring"
      }
    ]
  },
  {
    id: 3,
    employeeId: "EMP003",
    name: "KALPNA RATHOD",
    email: "kalpna.rathod@company.com",
    phone: "9876543212",
    aadharNumber: "3456 7890 1234",
    department: "Housekeeping Management",
    position: "Cleaner",
    joinDate: "2021-06-20",
    status: "active",
    salary: 18000,
    uan: "101234567892",
    esicNumber: "231234567892",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2021-06-20",
        expiryDate: "2021-12-20",
        status: "expired"
      }
    ]
  },
  {
    id: 4,
    employeeId: "EMP004",
    name: "GUNDU GHORGANE",
    email: "gundu.ghorgane@company.com",
    phone: "9876543213",
    aadharNumber: "4567 8901 2345",
    department: "Parking Management",
    position: "Parking Supervisor",
    joinDate: "2023-03-15",
    status: "active",
    salary: 20000,
    uan: "101234567893",
    esicNumber: "231234567893",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-03-15",
        expiryDate: "2030-03-15",
        status: "valid"
      }
    ]
  },
  {
    id: 5,
    employeeId: "EMP005",
    name: "GOVIND PILEWAD",
    email: "govind.pilewad@company.com",
    phone: "9876543214",
    aadharNumber: "5678 9012 3456",
    department: "Waste Management",
    position: "Waste Supervisor",
    joinDate: "2022-08-01",
    status: "active",
    salary: 21000,
    uan: "101234567894",
    esicNumber: "231234567894",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2022-08-01",
        expiryDate: "2030-08-01",
        status: "valid"
      }
    ]
  },
  {
    id: 6,
    employeeId: "EMP006",
    name: "LALJI KUMAR",
    email: "lalji.kumar@company.com",
    phone: "9876543215",
    aadharNumber: "6789 0123 4567",
    department: "STP Tank Cleaning",
    position: "STP Operator",
    joinDate: "2023-02-10",
    status: "active",
    salary: 23000,
    uan: "101234567895",
    esicNumber: "231234567895",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-02-10",
        expiryDate: "2030-02-10",
        status: "valid"
      }
    ]
  },
  {
    id: 7,
    employeeId: "EMP007",
    name: "KHUSHBOO",
    email: "khushboo@company.com",
    phone: "9876543216",
    aadharNumber: "7890 1234 5678",
    department: "Consumables Management",
    position: "Store Keeper",
    joinDate: "2021-11-15",
    status: "active",
    salary: 19000,
    uan: "101234567896",
    esicNumber: "231234567896",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2021-11-15",
        expiryDate: "2024-11-15",
        status: "expiring"
      }
    ]
  },
  {
    id: 8,
    employeeId: "EMP008",
    name: "SHOBHA RATHOD",
    email: "shobha.rathod@company.com",
    phone: "9876543217",
    aadharNumber: "8901 2345 6789",
    department: "Housekeeping Management",
    position: "Cleaner",
    joinDate: "2023-04-20",
    status: "active",
    salary: 18000,
    uan: "101234567897",
    esicNumber: "231234567897",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-04-20",
        expiryDate: "2030-04-20",
        status: "valid"
      }
    ]
  },
  {
    id: 9,
    employeeId: "EMP009",
    name: "RAJARAM S",
    email: "rajaram.s@company.com",
    phone: "9876543218",
    aadharNumber: "9012 3456 7890",
    department: "Security Management",
    position: "Security Guard",
    joinDate: "2023-07-01",
    status: "active",
    salary: 17000,
    uan: "101234567898",
    esicNumber: "231234567898",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-07-01",
        expiryDate: "2030-07-01",
        status: "valid"
      }
    ]
  },
  {
    id: 10,
    employeeId: "EMP010",
    name: "SWAPNIL S",
    email: "swapnil.s@company.com",
    phone: "9876543219",
    aadharNumber: "0123 4567 8901",
    department: "Parking Management",
    position: "Parking Attendant",
    joinDate: "2023-05-15",
    status: "active",
    salary: 16000,
    uan: "101234567899",
    esicNumber: "231234567899",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-05-15",
        expiryDate: "2030-05-15",
        status: "valid"
      }
    ]
  },
  {
    id: 11,
    employeeId: "EMP011",
    name: "RUPALI VAIRGAR",
    email: "rupali.vairgar@company.com",
    phone: "9876543220",
    aadharNumber: "1123 4567 8901",
    department: "Waste Management",
    position: "Waste Collector",
    joinDate: "2023-06-10",
    status: "active",
    salary: 16500,
    uan: "101234567900",
    esicNumber: "231234567900",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-06-10",
        expiryDate: "2030-06-10",
        status: "valid"
      }
    ]
  },
  {
    id: 12,
    employeeId: "EMP012",
    name: "MANISHA ADHAVE",
    email: "manisha.adhave@company.com",
    phone: "9876543221",
    aadharNumber: "1223 4567 8901",
    department: "STP Tank Cleaning",
    position: "Cleaning Technician",
    joinDate: "2023-08-15",
    status: "active",
    salary: 17500,
    uan: "101234567901",
    esicNumber: "231234567901",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-08-15",
        expiryDate: "2030-08-15",
        status: "valid"
      }
    ]
  },
  {
    id: 13,
    employeeId: "EMP013",
    name: "DHURABAI ADE",
    email: "dhurabai.ade@company.com",
    phone: "9876543222",
    aadharNumber: "1323 4567 8901",
    department: "Consumables Management",
    position: "Inventory Manager",
    joinDate: "2022-12-01",
    status: "active",
    salary: 24000,
    uan: "101234567902",
    esicNumber: "231234567902",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2022-12-01",
        expiryDate: "2030-12-01",
        status: "valid"
      }
    ]
  },
  {
    id: 14,
    employeeId: "EMP014",
    name: "ASHWINI KATAKR",
    email: "ashwini.katakr@company.com",
    phone: "9876543223",
    aadharNumber: "1423 4567 8901",
    department: "Housekeeping Management",
    position: "Sanitation Officer",
    joinDate: "2023-09-20",
    status: "active",
    salary: 22000,
    uan: "101234567903",
    esicNumber: "231234567903",
    documents: [
      {
        id: 1,
        type: "Aadhar Card",
        name: "aadhar_card.pdf",
        uploadDate: "2023-09-20",
        expiryDate: "2030-09-20",
        status: "valid"
      }
    ]
  }
];

const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 1,
    employee: "PRAVIN GAIKWAD",
    employeeId: "EMP001",
    type: "Sick Leave",
    from: "2024-01-15",
    to: "2024-01-16",
    reason: "Fever and cold",
    status: "pending"
  },
  {
    id: 2,
    employee: "KAILASH WAGHMARE",
    employeeId: "EMP002",
    type: "Vacation",
    from: "2024-02-01",
    to: "2024-02-05",
    reason: "Family vacation",
    status: "approved"
  },
  {
    id: 3,
    employee: "KALPNA RATHOD",
    employeeId: "EMP003",
    type: "Emergency Leave",
    from: "2024-01-20",
    to: "2024-01-20",
    reason: "Medical emergency",
    status: "rejected"
  },
  {
    id: 4,
    employee: "GUNDU GHORGANE",
    employeeId: "EMP004",
    type: "Personal Leave",
    from: "2024-01-25",
    to: "2024-01-26",
    reason: "Personal work",
    status: "pending"
  },
  {
    id: 5,
    employee: "GOVIND PILEWAD",
    employeeId: "EMP005",
    type: "Sick Leave",
    from: "2024-01-18",
    to: "2024-01-19",
    reason: "Health issues",
    status: "approved"
  },
  {
    id: 6,
    employee: "LALJI KUMAR",
    employeeId: "EMP006",
    type: "Casual Leave",
    from: "2024-01-22",
    to: "2024-01-22",
    reason: "Family function",
    status: "pending"
  }
];

const initialAttendance: Attendance[] = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "PRAVIN GAIKWAD",
    date: "2024-01-10",
    checkIn: "08:55",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "KAILASH WAGHMARE",
    date: "2024-01-10",
    checkIn: "09:15",
    checkOut: "17:00",
    status: "late"
  },
  {
    id: 3,
    employeeId: "EMP003",
    employeeName: "KALPNA RATHOD",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "13:00",
    status: "half-day"
  },
  {
    id: 4,
    employeeId: "EMP004",
    employeeName: "GUNDU GHORGANE",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 5,
    employeeId: "EMP005",
    employeeName: "GOVIND PILEWAD",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 6,
    employeeId: "EMP006",
    employeeName: "LALJI KUMAR",
    date: "2024-01-10",
    checkIn: "08:55",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 7,
    employeeId: "EMP007",
    employeeName: "KHUSHBOO",
    date: "2024-01-10",
    checkIn: "09:20",
    checkOut: "17:00",
    status: "late"
  },
  {
    id: 8,
    employeeId: "EMP008",
    employeeName: "SHOBHA RATHOD",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 9,
    employeeId: "EMP009",
    employeeName: "RAJARAM S",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 10,
    employeeId: "EMP010",
    employeeName: "SWAPNIL S",
    date: "2024-01-10",
    checkIn: "09:05",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 11,
    employeeId: "EMP011",
    employeeName: "RUPALI VAIRGAR",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 12,
    employeeId: "EMP012",
    employeeName: "MANISHA ADHAVE",
    date: "2024-01-10",
    checkIn: "08:50",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 13,
    employeeId: "EMP013",
    employeeName: "DHURABAI ADE",
    date: "2024-01-10",
    checkIn: "09:00",
    checkOut: "17:00",
    status: "present"
  },
  {
    id: 14,
    employeeId: "EMP014",
    employeeName: "ASHWINI KATAKR",
    date: "2024-01-10",
    checkIn: "09:10",
    checkOut: "17:00",
    status: "late"
  }
];

const initialPayroll: Payroll[] = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "PRAVIN GAIKWAD",
    month: "January 2024",
    basicSalary: 17500,
    allowances: 5000,
    deductions: 2500,
    netSalary: 20000,
    status: "processed",
    paymentDate: "2024-01-31",
    bankAccount: "XXXXXX1234",
    ifscCode: "SBIN0000123"
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "KAILASH WAGHMARE",
    month: "January 2024",
    basicSalary: 15400,
    allowances: 4500,
    deductions: 2400,
    netSalary: 17500,
    status: "pending",
    bankAccount: "XXXXXX5678",
    ifscCode: "HDFC0000456"
  },
  {
    id: 3,
    employeeId: "EMP003",
    employeeName: "KALPNA RATHOD",
    month: "January 2024",
    basicSalary: 12600,
    allowances: 4000,
    deductions: 2100,
    netSalary: 14500,
    status: "processed",
    paymentDate: "2024-01-31",
    bankAccount: "XXXXXX9012",
    ifscCode: "ICIC0000789"
  },
  {
    id: 4,
    employeeId: "EMP004",
    employeeName: "GUNDU GHORGANE",
    month: "January 2024",
    basicSalary: 14000,
    allowances: 4500,
    deductions: 2300,
    netSalary: 16200,
    status: "processed",
    paymentDate: "2024-01-31",
    bankAccount: "XXXXXX3456",
    ifscCode: "SBIN0000789"
  },
  {
    id: 5,
    employeeId: "EMP005",
    employeeName: "GOVIND PILEWAD",
    month: "January 2024",
    basicSalary: 14700,
    allowances: 4700,
    deductions: 2400,
    netSalary: 17000,
    status: "pending",
    bankAccount: "XXXXXX7890",
    ifscCode: "HDFC0000123"
  },
  {
    id: 6,
    employeeId: "EMP006",
    employeeName: "LALJI KUMAR",
    month: "January 2024",
    basicSalary: 16100,
    allowances: 5200,
    deductions: 2600,
    netSalary: 18700,
    status: "processed",
    paymentDate: "2024-01-31",
    bankAccount: "XXXXXX2345",
    ifscCode: "ICIC0000123"
  }
];

const initialPerformance: Performance[] = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "PRAVIN GAIKWAD",
    department: "Housekeeping Management",
    kpi: 85,
    rating: 4.5,
    reviewDate: "2024-01-05",
    feedback: "Excellent performance in maintaining cleanliness standards"
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "KAILASH WAGHMARE",
    department: "Security Management",
    kpi: 92,
    rating: 4.8,
    reviewDate: "2024-01-05",
    feedback: "Outstanding work in security monitoring and vigilance"
  },
  {
    id: 3,
    employeeId: "EMP003",
    employeeName: "KALPNA RATHOD",
    department: "Housekeeping Management",
    kpi: 78,
    rating: 4.2,
    reviewDate: "2024-01-05",
    feedback: "Good cleaning work with attention to detail"
  },
  {
    id: 4,
    employeeId: "EMP004",
    employeeName: "GUNDU GHORGANE",
    department: "Parking Management",
    kpi: 88,
    rating: 4.6,
    reviewDate: "2024-01-05",
    feedback: "Excellent parking management and customer service"
  },
  {
    id: 5,
    employeeId: "EMP005",
    employeeName: "GOVIND PILEWAD",
    department: "Waste Management",
    kpi: 95,
    rating: 4.9,
    reviewDate: "2024-01-05",
    feedback: "Outstanding waste management and recycling efforts"
  },
  {
    id: 6,
    employeeId: "EMP006",
    employeeName: "LALJI KUMAR",
    department: "STP Tank Cleaning",
    kpi: 82,
    rating: 4.3,
    reviewDate: "2024-01-05",
    feedback: "Good technical skills in STP operations"
  },
  {
    id: 7,
    employeeId: "EMP007",
    employeeName: "KHUSHBOO",
    department: "Consumables Management",
    kpi: 90,
    rating: 4.7,
    reviewDate: "2024-01-05",
    feedback: "Excellent inventory management and organization"
  }
];

const initialShifts: Shift[] = [
  {
    id: 1,
    name: "Morning Shift",
    startTime: "06:00",
    endTime: "14:00",
    employees: ["EMP001", "EMP003", "EMP008", "EMP014"]
  },
  {
    id: 2,
    name: "Evening Shift",
    startTime: "14:00",
    endTime: "22:00",
    employees: ["EMP002", "EMP004", "EMP009", "EMP010"]
  },
  {
    id: 3,
    name: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    employees: ["EMP005", "EMP006", "EMP011", "EMP012", "EMP013"]
  }
];

const initialSalaryStructures: SalaryStructure[] = [
  {
    id: 1,
    employeeId: "EMP001",
    basic: 17500,
    hra: 3500,
    da: 2625,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 3500,
    otherAllowances: 1750,
    pf: 2100,
    esic: 262.5,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 24,
    lopDays: 2
  },
  {
    id: 2,
    employeeId: "EMP002",
    basic: 15400,
    hra: 3080,
    da: 2310,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 3080,
    otherAllowances: 1540,
    pf: 1848,
    esic: 231,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 25,
    lopDays: 1
  },
  {
    id: 3,
    employeeId: "EMP003",
    basic: 12600,
    hra: 2520,
    da: 1890,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 2520,
    otherAllowances: 1260,
    pf: 1512,
    esic: 189,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 23,
    lopDays: 3
  },
  {
    id: 4,
    employeeId: "EMP004",
    basic: 14000,
    hra: 2800,
    da: 2100,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 2800,
    otherAllowances: 1400,
    pf: 1680,
    esic: 210,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 26,
    lopDays: 0
  },
  {
    id: 5,
    employeeId: "EMP005",
    basic: 14700,
    hra: 2940,
    da: 2205,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 2940,
    otherAllowances: 1470,
    pf: 1764,
    esic: 220.5,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 25,
    lopDays: 1
  },
  {
    id: 6,
    employeeId: "EMP006",
    basic: 16100,
    hra: 3220,
    da: 2415,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 3220,
    otherAllowances: 1610,
    pf: 1932,
    esic: 241.5,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 26,
    lopDays: 0
  },
  {
    id: 7,
    employeeId: "EMP007",
    basic: 13300,
    hra: 2660,
    da: 1995,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 2660,
    otherAllowances: 1330,
    pf: 1596,
    esic: 199.5,
    professionalTax: 200,
    tds: 0,
    otherDeductions: 0,
    workingDays: 26,
    paidDays: 24,
    lopDays: 2
  }
];

const initialSalarySlips: SalarySlip[] = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "PRAVIN GAIKWAD",
    month: "January 2024",
    paidDays: 24,
    designation: "Housekeeping Supervisor",
    uan: "101234567890",
    esicNumber: "231234567890",
    earnings: {
      basic: 17500,
      da: 2625,
      hra: 3500,
      cca: 1600,
      washing: 800,
      leave: 0,
      medical: 1250,
      bonus: 0,
      otherAllowances: 1750
    },
    deductions: {
      pf: 2100,
      esic: 262.5,
      monthlyDeductions: 0,
      mlwf: 25,
      professionalTax: 200
    },
    netSalary: 20000,
    generatedDate: "2024-01-31"
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "KAILASH WAGHMARE",
    month: "January 2024",
    paidDays: 25,
    designation: "Security Supervisor",
    uan: "101234567891",
    esicNumber: "231234567891",
    earnings: {
      basic: 15400,
      da: 2310,
      hra: 3080,
      cca: 1600,
      washing: 800,
      leave: 0,
      medical: 1250,
      bonus: 0,
      otherAllowances: 1540
    },
    deductions: {
      pf: 1848,
      esic: 231,
      monthlyDeductions: 0,
      mlwf: 25,
      professionalTax: 200
    },
    netSalary: 17500,
    generatedDate: "2024-01-31"
  }
];

const HRMS = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [payroll, setPayroll] = useState<Payroll[]>(initialPayroll);
  const [performance, setPerformance] = useState<Performance[]>(initialPerformance);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(initialSalaryStructures);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>(initialSalarySlips);
  const [activeTab, setActiveTab] = useState("employees");
    const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="HRMS - Human Resource Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="employees" className="flex-1 min-w-[120px]">Employees</TabsTrigger>
            <TabsTrigger value="onboarding" className="flex-1 min-w-[120px]">Onboarding</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 min-w-[120px]">Attendance</TabsTrigger>
            <TabsTrigger value="leave" className="flex-1 min-w-[120px]">Leave Management</TabsTrigger>
            <TabsTrigger value="shifts" className="flex-1 min-w-[120px]">Shift Roster</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1 min-w-[120px]">Payroll</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-[120px]">Deduction</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 min-w-[120px]">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeesTab
              employees={employees}
              setEmployees={setEmployees}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingTab
              employees={employees}
              setEmployees={setEmployees}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab
              attendance={attendance}
              setAttendance={setAttendance}
            />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagementTab
              leaveRequests={leaveRequests}
              setLeaveRequests={setLeaveRequests}
            />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftRosterTab
              shifts={shifts}
              setShifts={setShifts}
              employees={employees}
            />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollTab
              employees={employees}
              payroll={payroll}
              setPayroll={setPayroll}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
              salarySlips={salarySlips}
              setSalarySlips={setSalarySlips}
              attendance={attendance}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab
              performance={performance}
               setDeductions={setDeductions} 
              setPerformance={setPerformance}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab
              employees={employees}
              attendance={attendance}
              payroll={payroll}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default HRMS;