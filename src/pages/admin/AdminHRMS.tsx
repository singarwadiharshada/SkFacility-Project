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

const HRMS = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
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