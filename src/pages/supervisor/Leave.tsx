import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  contactNumber: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Leave = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supervisorDepartment, setSupervisorDepartment] = useState("Operations");

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "Supervisor",
  });

  // Fetch leave requests and employees on component mount
  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/leaves/supervisor?department=${encodeURIComponent(supervisorDepartment)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch leaves');
      }
      
      const data = await response.json();
      setLeaveRequests(data);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      
      // Mock data for testing
      setLeaveRequests([
        { 
          _id: "1", 
          employeeId: "EMP0001", 
          employeeName: "Test Employee 1", 
          department: "Operations", 
          leaveType: "casual", 
          fromDate: "2025-01-25", 
          toDate: "2025-01-26", 
          totalDays: 2, 
          reason: "Personal work", 
          status: "pending",
          appliedBy: "Supervisor",
          appliedFor: "EMP0001",
          createdAt: "2025-01-20T10:30:00.000Z"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log("Fetching employees for department:", supervisorDepartment);
      
      const response = await fetch(
        `${API_URL}/leaves/supervisor/employees?department=${encodeURIComponent(supervisorDepartment)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch employees');
      }
      
      const data = await response.json();
      console.log("Fetched employees:", data);
      
      if (data.length === 0) {
        toast.warning('No active employees found in your department');
      }
      
      setEmployees(data);
      
      // Auto-select first employee
      if (data.length > 0) {
        setSelectedEmployee(data[0]._id);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(error.message || "Failed to load employees");
      
      // Fallback mock data for testing
      const mockEmployees = [
        { _id: "1", employeeId: "EMP0001", name: "Test Employee 1", department: "Operations", contactNumber: "+91 9876543210" },
        { _id: "2", employeeId: "EMP0002", name: "Test Employee 2", department: "Operations", contactNumber: "+91 9876543211" },
      ];
      setEmployees(mockEmployees);
      setSelectedEmployee("1");
    }
  };

  const calculateTotalDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmp) {
      toast.error("Selected employee not found");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const leaveData = {
        employeeId: selectedEmp.employeeId,
        employeeName: selectedEmp.name,
        department: selectedEmp.department,
        contactNumber: selectedEmp.contactNumber,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays,
        reason: formData.reason,
        appliedBy: formData.appliedBy,
        appliedFor: selectedEmp.employeeId
      };

      console.log("Submitting leave data:", leaveData);

      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit leave');
      }
      
      const data = await response.json();
      
      toast.success(data.message || "Leave request submitted successfully!");
      
      // Reset form
      setFormData({
        leaveType: "",
        fromDate: "",
        toDate: "",
        reason: "",
        appliedBy: "Supervisor",
      });
      
      setDialogOpen(false);
      fetchLeaveRequests(); // Refresh the list
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleTestAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/test/employees`);
      const data = await response.json();
      console.log("Test API response:", data);
      toast.info(`Found ${data.count} employees in database`);
    } catch (error) {
      console.error("Test API error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Leave Management" 
        subtitle="Apply for leave for yourself or team members" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Select
              value={supervisorDepartment}
              onValueChange={(value) => {
                setSupervisorDepartment(value);
                // Refresh data when department changes
                setTimeout(() => {
                  fetchLeaveRequests();
                  fetchEmployees();
                }, 100);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Housekeeping Management">Housekeeping</SelectItem>
                <SelectItem value="Security Management">Security</SelectItem>
                <SelectItem value="Administration">Administration</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleTestAPI}>
              Test API
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appliedBy" className="text-sm">
                    Applied By (Supervisor Name)
                  </Label>
                  <Input 
                    id="appliedBy"
                    value={formData.appliedBy}
                    onChange={(e) => setFormData(prev => ({...prev, appliedBy: e.target.value}))}
                    placeholder="Enter supervisor name"
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee" className="text-sm">
                    Select Employee ({employees.length} available)
                  </Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                    required
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No employees found
                        </SelectItem>
                      ) : (
                        employees.map((employee) => (
                          <SelectItem key={employee._id} value={employee._id}>
                            {employee.name} ({employee.employeeId}) - {employee.department}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Department: {supervisorDepartment}
                  </p>
                </div>

                {selectedEmployee && selectedEmployee !== "none" && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Employee Name</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.name || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Employee ID</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.employeeId || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Department</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.department || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Contact</Label>
                        <Input 
                          value={employees.find(e => e._id === selectedEmployee)?.contactNumber || ""}
                          readOnly 
                          className="bg-background h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm">Leave Type</Label>
                  <Select 
                    value={formData.leaveType}
                    onValueChange={(value) => setFormData(prev => ({...prev, leaveType: value}))}
                    required
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from" className="text-sm">From Date</Label>
                    <Input 
                      id="from" 
                      type="date" 
                      value={formData.fromDate}
                      onChange={(e) => setFormData(prev => ({...prev, fromDate: e.target.value}))}
                      required 
                      className="h-9" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to" className="text-sm">To Date</Label>
                    <Input 
                      id="to" 
                      type="date" 
                      value={formData.toDate}
                      onChange={(e) => setFormData(prev => ({...prev, toDate: e.target.value}))}
                      required 
                      className="h-9" 
                    />
                  </div>
                </div>
                
                {formData.fromDate && formData.toDate && (
                  <div className="text-sm text-muted-foreground">
                    Total Days: {calculateTotalDays(formData.fromDate, formData.toDate)} days
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm">Reason</Label>
                  <Textarea 
                    id="reason" 
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({...prev, reason: e.target.value}))}
                    placeholder="Enter reason for leave" 
                    required 
                    className="min-h-[80px] resize-none"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-9"
                  disabled={isSubmitting || employees.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Leave Request"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Leave Requests - {supervisorDepartment} Department</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  fetchLeaveRequests();
                  fetchEmployees();
                }}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No leave requests found for this department</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Apply for Leave" to create the first leave request
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((leave) => (
                  <motion.div
                    key={leave._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{leave.employeeName}</h3>
                          <Badge variant={getStatusBadgeVariant(leave.status)}>
                            {leave.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.totalDays} days)
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Type: <span className="font-medium capitalize">{leave.leaveType} Leave</span>
                          </span>
                          <span className="text-muted-foreground">
                            ID: {leave.employeeId}
                          </span>
                          <span className="text-muted-foreground">
                            Dept: {leave.department}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Reason:</span> {leave.reason}
                      </p>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Applied by: {leave.appliedBy}</span>
                        <span>{formatDate(leave.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Leave;