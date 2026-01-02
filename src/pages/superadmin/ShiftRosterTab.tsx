import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Shift {
  _id: string;
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
}

// Use a direct URL - update this to match your backend URL
const API_BASE_URL = "http://localhost:5001/api";

const ShiftRosterTab = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState({
    shifts: false,
    employees: false,
    creating: false
  });
  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "06:00",
    endTime: "14:00",
    employees: [] as string[]
  });

  // Fetch shifts and employees from backend
  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    setLoading(prev => ({ ...prev, shifts: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/shifts`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setShifts(data.data);
      } else {
        toast.error(data.message || "Failed to fetch shifts");
      }
    } catch (error: any) {
      console.error("Error fetching shifts:", error);
      toast.error(`Error fetching shifts: ${error.message}. Make sure backend is running on port 5001.`);
    } finally {
      setLoading(prev => ({ ...prev, shifts: false }));
    }
  };

  const fetchEmployees = async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/employees`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Filter to show only active employees
        const activeEmployees = data.data.filter((emp: Employee) => 
          emp.status === 'active'
        );
        setEmployees(activeEmployees);
      } else {
        toast.error(data.message || "Failed to fetch employees");
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(`Error fetching employees: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  const handleAddShift = async () => {
    if (!newShift.name.trim()) {
      toast.error("Please enter shift name");
      return;
    }

    setLoading(prev => ({ ...prev, creating: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/shifts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newShift),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShifts([...shifts, data.data]);
        setNewShift({ 
          name: "", 
          startTime: "06:00", 
          endTime: "14:00", 
          employees: [] 
        });
        toast.success("Shift created successfully!");
      } else {
        toast.error(data.message || "Failed to create shift");
      }
    } catch (error: any) {
      console.error("Error creating shift:", error);
      toast.error(`Error creating shift: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  };

  const handleAssignEmployee = async (shiftId: string, employeeId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchShifts(); // Refresh shifts
        toast.success("Employee assigned successfully!");
      } else {
        toast.error(data.message || "Failed to assign employee");
      }
    } catch (error: any) {
      console.error("Error assigning employee:", error);
      toast.error(`Error assigning employee: ${error.message}`);
    }
  };

  const handleRemoveEmployee = async (shiftId: string, employeeId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchShifts(); // Refresh shifts
        toast.success("Employee removed successfully!");
      } else {
        toast.error(data.message || "Failed to remove employee");
      }
    } catch (error: any) {
      console.error("Error removing employee:", error);
      toast.error(`Error removing employee: ${error.message}`);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShifts(shifts.filter(shift => shift._id !== shiftId));
        toast.success("Shift deleted successfully!");
      } else {
        toast.error(data.message || "Failed to delete shift");
      }
    } catch (error: any) {
      console.error("Error deleting shift:", error);
      toast.error(`Error deleting shift: ${error.message}`);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchShifts(), fetchEmployees()]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.employeeId === employeeId);
    return emp ? emp.name : employeeId;
  };

  const getEmployeeDetails = (employeeId: string) => {
    const emp = employees.find(e => e.employeeId === employeeId);
    return emp;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Shift & Roster Scheduling</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshAll}
              disabled={loading.shifts || loading.employees}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading.shifts ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'}
              </Badge>
              <Badge variant="outline">
                {employees.length} Active Employees
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Shift Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create New Shift</h3>
                <Badge variant="outline">Step 1/3</Badge>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shiftName">Shift Name *</Label>
                  <Input 
                    id="shiftName" 
                    placeholder="Morning Shift" 
                    value={newShift.name}
                    onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                    disabled={loading.creating}
                    className="bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input 
                      id="startTime" 
                      type="time" 
                      value={newShift.startTime}
                      onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                      disabled={loading.creating}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input 
                      id="endTime" 
                      type="time" 
                      value={newShift.endTime}
                      onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                      disabled={loading.creating}
                      className="bg-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Assign Employees (Optional)</Label>
                  <Select 
                    onValueChange={(value) => {
                      if (!newShift.employees.includes(value)) {
                        setNewShift({
                          ...newShift, 
                          employees: [...newShift.employees, value]
                        });
                      }
                    }}
                    disabled={loading.creating || loading.employees}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select employees" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading.employees ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : employees.length === 0 ? (
                        <div className="text-center p-4 text-sm text-gray-500">
                          No active employees found
                        </div>
                      ) : (
                        employees.map(emp => (
                          <SelectItem 
                            key={emp._id} 
                            value={emp.employeeId}
                            disabled={newShift.employees.includes(emp.employeeId)}
                          >
                            {emp.name} ({emp.employeeId}) - {emp.department}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {newShift.employees.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm font-medium">Selected Employees:</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                        {newShift.employees.map(empId => {
                          const emp = getEmployeeDetails(empId);
                          return (
                            <div key={empId} className="flex justify-between items-center p-2 border rounded bg-gray-50">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm">{emp?.name || empId}</span>
                                <span className="text-xs text-gray-500">({empId})</span>
                                {emp?.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {emp.department}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => setNewShift({
                                  ...newShift,
                                  employees: newShift.employees.filter(id => id !== empId)
                                })}
                                disabled={loading.creating}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleAddShift} 
                  disabled={loading.creating || !newShift.name.trim()}
                  className="w-full"
                >
                  {loading.creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Shift...
                    </>
                  ) : (
                    "Create Shift"
                  )}
                </Button>
              </div>
            </div>
            
            {/* Current Shifts Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Shifts</h3>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {loading.shifts ? "Loading..." : `${shifts.length} shifts`}
                  </Badge>
                  {loading.employees && (
                    <Badge variant="outline" className="animate-pulse">
                      Loading Employees...
                    </Badge>
                  )}
                </div>
              </div>
              
              {loading.shifts ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : shifts.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <div className="text-gray-400 mb-2">No shifts created yet</div>
                  <div className="text-sm text-gray-500">
                    Create your first shift using the form on the left
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshAll}
                    className="mt-4"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {shifts.map((shift) => (
                    <div key={shift._id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                      {/* Shift Header */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-lg">{shift.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {shift.startTime} - {shift.endTime}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(shift.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {shift.employees.length} {shift.employees.length === 1 ? 'employee' : 'employees'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteShift(shift._id)}
                            disabled={loading.shifts}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Assigned Employees */}
                      {shift.employees.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Assigned Employees:</Label>
                          <div className="space-y-1">
                            {shift.employees.map(empId => {
                              const emp = getEmployeeDetails(empId);
                              return (
                                <div key={empId} className="flex justify-between items-center p-2 border rounded bg-gray-50">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-medium truncate">
                                        {emp?.name || empId}
                                      </span>
                                      <div className="flex gap-2 items-center mt-1">
                                        <span className="text-xs text-gray-500 truncate">
                                          {empId}
                                        </span>
                                        {emp?.department && (
                                          <Badge variant="outline" className="text-xs flex-shrink-0">
                                            {emp.department}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={() => handleRemoveEmployee(shift._id, empId)}
                                    disabled={loading.shifts}
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Add Employee to Shift */}
                      <div className="pt-2">
                        <Select 
                          onValueChange={(value) => handleAssignEmployee(shift._id, value)}
                          disabled={loading.shifts || loading.employees}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Add employee to this shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {loading.employees ? (
                              <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : employees.length === 0 ? (
                              <div className="text-center p-4 text-sm text-gray-500">
                                No active employees available
                              </div>
                            ) : (
                              employees
                                .filter(emp => !shift.employees.includes(emp.employeeId))
                                .map(emp => (
                                  <SelectItem key={emp._id} value={emp.employeeId}>
                                    {emp.name} ({emp.employeeId}) - {emp.department}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftRosterTab;