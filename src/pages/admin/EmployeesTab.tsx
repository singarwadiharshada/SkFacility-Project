import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Trash2, Plus, Download, Sheet, User, Edit, Camera, FileText, ArrowUpDown, Calendar, Files, AlertCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Employee } from "./types";
import StatCard from "./StatCard";
import SearchBar from "./SearchBar";
import Pagination from "./Pagination";
import ExcelImportDialog from "./ExcelImportDialog";
import axios from "axios";

interface EmployeesTabProps {
  setActiveTab: (tab: string) => void;
}

const API_URL = "http://localhost:5001/api";

// EPF Form 11 Type
interface EPFForm11Data {
  memberName: string;
  fatherOrSpouseName: string;
  relationshipType: "father" | "spouse";
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  email: string;
  mobileNumber: string;
  
  previousEPFMember: boolean;
  previousPensionMember: boolean;
  
  previousUAN: string;
  previousPFAccountNumber: string;
  dateOfExit: string;
  schemeCertificateNumber: string;
  pensionPaymentOrder: string;
  
  internationalWorker: boolean;
  countryOfOrigin: string;
  passportNumber: string;
  passportValidityFrom: string;
  passportValidityTo: string;
  
  bankAccountNumber: string;
  ifscCode: string;
  aadharNumber: string;
  panNumber: string;
  
  firstEPFMember: boolean;
  enrolledDate: string;
  firstEmploymentWages: string;
  epfMemberBeforeSep2014: boolean;
  epfAmountWithdrawn: boolean;
  epsAmountWithdrawn: boolean;
  epsAmountWithdrawnAfterSep2014: boolean;
  
  declarationDate: string;
  declarationPlace: string;
  employerDeclarationDate: string;
  
  // Additional fields for employer declaration
  employerName: string;
  pfNumber: string;
  kycStatus: "not_uploaded" | "uploaded_not_approved" | "uploaded_approved";
  transferRequestGenerated: boolean;
  physicalClaimFiled: boolean;
}

const EmployeesTab = ({ 
  setActiveTab
}: EmployeesTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesItemsPerPage, setEmployeesItemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedJoinDate, setSelectedJoinDate] = useState<string>("");
  const [selectedEmployeeForDocuments, setSelectedEmployeeForDocuments] = useState<Employee | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [epfForm11DialogOpen, setEpfForm11DialogOpen] = useState(false);
  const [selectedEmployeeForEPF, setSelectedEmployeeForEPF] = useState<Employee | null>(null);
  const [isSavingEPF, setIsSavingEPF] = useState(false);
  
  // Employees data from API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [epfFormData, setEpfFormData] = useState<EPFForm11Data>({
    memberName: "",
    fatherOrSpouseName: "",
    relationshipType: "father",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    email: "",
    mobileNumber: "",
    
    previousEPFMember: false,
    previousPensionMember: false,
    
    previousUAN: "",
    previousPFAccountNumber: "",
    dateOfExit: "",
    schemeCertificateNumber: "",
    pensionPaymentOrder: "",
    
    internationalWorker: false,
    countryOfOrigin: "",
    passportNumber: "",
    passportValidityFrom: "",
    passportValidityTo: "",
    
    bankAccountNumber: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    
    firstEPFMember: true,
    enrolledDate: new Date().toISOString().split("T")[0],
    firstEmploymentWages: "",
    epfMemberBeforeSep2014: false,
    epfAmountWithdrawn: false,
    epsAmountWithdrawn: false,
    epsAmountWithdrawnAfterSep2014: false,
    
    declarationDate: new Date().toISOString().split("T")[0],
    declarationPlace: "Mumbai",
    employerDeclarationDate: new Date().toISOString().split("T")[0],
    
    employerName: "SK ENTERPRISES",
    pfNumber: "",
    kycStatus: "not_uploaded",
    transferRequestGenerated: false,
    physicalClaimFiled: false
  });

  // Fetch employees from API
  useEffect(() => {
    fetchEmployees();
  }, [employeesPage, employeesItemsPerPage, searchTerm, selectedDepartment, selectedSite, selectedJoinDate, sortBy]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: employeesPage,
        limit: employeesItemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedDepartment !== "all") params.department = selectedDepartment;
      if (selectedSite !== "all") params.siteName = selectedSite;
      if (selectedJoinDate) params.dateOfJoining = selectedJoinDate;
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = "asc";
      }
      
      const response = await axios.get(`${API_URL}/employees`, { params });
      
      console.log("API Response:", response.data); // Debug log
      
      if (response.data && response.data.success) {
        // Check if data exists and is an array
        const apiData = response.data.data || response.data.employees || [];
        
        if (!Array.isArray(apiData)) {
          console.error("API data is not an array:", apiData);
          setError("Invalid data format received from server");
          setEmployees([]);
          setTotalEmployees(0);
          return;
        }
        
        // Transform API data to match Employee interface
        const transformedEmployees = apiData.map((emp: any, index: number) => {
          console.log(`Processing employee ${index}:`, emp); // Debug log
          
          return {
            id: emp._id || emp.id || `emp_${index}`,
            employeeId: emp.employeeId || emp.employeeID || `EMP${String(index + 1).padStart(4, '0')}`,
            name: emp.name || emp.employeeName || "Unknown",
            email: emp.email || "",
            phone: emp.phone || emp.mobile || "",
            aadharNumber: emp.aadharNumber || emp.aadhar || "",
            panNumber: emp.panNumber || emp.pan || "",
            esicNumber: emp.esicNumber || emp.esic || "",
            uan: emp.uanNumber || emp.uan || "",
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
            joinDate: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            exitDate: emp.dateOfExit ? new Date(emp.dateOfExit).toISOString().split('T')[0] : "",
            bloodGroup: emp.bloodGroup || "",
            gender: emp.gender || "",
            maritalStatus: emp.maritalStatus || "",
            department: emp.department || "Unknown",
            position: emp.position || emp.designation || "",
            siteName: emp.siteName || emp.site || "",
            salary: emp.salary || emp.basicSalary || 0,
            status: emp.status || "active",
            documents: emp.documents || [],
            photo: emp.photo || null,
            fatherName: emp.fatherName || "",
            motherName: emp.motherName || "",
            spouseName: emp.spouseName || "",
            numberOfChildren: emp.numberOfChildren ? emp.numberOfChildren.toString() : "0",
            nomineeName: emp.nomineeName || "",
            nomineeRelation: emp.nomineeRelation || "",
            accountNumber: emp.accountNumber || emp.bankAccountNumber || "",
            ifscCode: emp.ifscCode || "",
            bankName: emp.bankName || "",
            permanentAddress: emp.permanentAddress || "",
            localAddress: emp.localAddress || "",
            emergencyContactName: emp.emergencyContactName || "",
            emergencyContactPhone: emp.emergencyContactPhone || "",
            emergencyContactRelation: emp.emergencyContactRelation || "",
          };
        });
        
        setEmployees(transformedEmployees);
        setTotalEmployees(response.data.pagination?.total || response.data.total || transformedEmployees.length);
        console.log("Transformed employees:", transformedEmployees); // Debug log
      } else {
        const errorMsg = response.data?.message || "Failed to fetch employees";
        setError(errorMsg);
        toast.error(errorMsg);
        setEmployees([]);
      }
    } catch (err: any) {
      console.error("Error fetching employees:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setError(errorMsg);
      toast.error("Error loading employees: " + errorMsg);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments and sites for filters
  const departments = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean);
  const sites = Array.from(new Set(employees.map(emp => emp.siteName))).filter(Boolean);

  // Filter employees based on search term and selected filters (client-side as backup)
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.siteName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === "all" || emp.department === selectedDepartment;
    const matchesSite = selectedSite === "all" || emp.siteName === selectedSite;
    const matchesJoinDate = !selectedJoinDate || emp.joinDate === selectedJoinDate;

    return matchesSearch && matchesDepartment && matchesSite && matchesJoinDate;
  });

  // Sort employees based on selected criteria (client-side)
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "department") {
      return (a.department || "").localeCompare(b.department || "");
    }
    if (sortBy === "site") {
      return (a.siteName || "").localeCompare(b.siteName || "");
    }
    if (sortBy === "joinDate") {
      return new Date(a.joinDate || "").getTime() - new Date(b.joinDate || "").getTime();
    }
    return 0;
  });

  const paginatedEmployees = sortedEmployees.slice(
    (employeesPage - 1) * employeesItemsPerPage,
    employeesPage * employeesItemsPerPage
  );

  // Statistics
  const activeEmployees = employees.filter(emp => emp.status === "active").length;
  const leftEmployeesCount = employees.filter(emp => emp.status === "left").length;
  const departmentsCount = new Set(employees.map(e => e.department)).size;

  const handleDeleteEmployee = async (id: string) => {
    try {
      setIsDeleting(id);
      const employee = employees.find(emp => emp.id === id);
      if (!employee) {
        toast.error("Employee not found");
        return;
      }
      
      // Use MongoDB _id for deletion
      const employeeId = employee.id;
      
      const response = await axios.delete(`${API_URL}/employees/${employeeId}`);
      
      if (response.data.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        toast.success("Employee deleted successfully!");
      } else {
        toast.error(response.data.message || "Failed to delete employee");
      }
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      toast.error(err.response?.data?.message || "Error deleting employee");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarkAsLeft = async (employee: Employee) => {
    try {
      setLoading(true);
      const response = await axios.patch(
        `${API_URL}/employees/${employee.id}/status`, // Use MongoDB _id
        { status: "left" }
      );
      
      if (response.data.success) {
        setEmployees(prev => prev.map(emp => 
          emp.id === employee.id 
            ? { ...emp, status: "left", exitDate: new Date().toISOString().split("T")[0] }
            : emp
        ));
        toast.success("Employee marked as left");
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (err: any) {
      console.error("Error updating employee status:", err);
      toast.error(err.response?.data?.message || "Error updating status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return "default";
      case "inactive": return "destructive";
      case "left": return "destructive";
      default: return "outline";
    }
  };

  const handleExportEmployees = async () => {
    try {
      setIsExporting(true);
      
      const response = await axios.get(`${API_URL}/employees/export`, {
        responseType: "blob",
        params: {
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
          status: "active"
        }
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `employees_export_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Employees exported successfully!");
    } catch (err: any) {
      console.error("Error exporting employees:", err);
      if (err.response?.status === 404) {
        toast.error("Export feature is not available. Please check backend configuration.");
      } else {
        toast.error(err.response?.data?.message || "Export failed");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportEmployees = async (file: File) => {
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axios.post(`${API_URL}/employees/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      if (response.data.success) {
        toast.success("Employees imported successfully!");
        await fetchEmployees(); // Refresh the list
        setImportDialogOpen(false);
      } else {
        toast.error(response.data.message || "Import failed");
      }
    } catch (err: any) {
      console.error("Error importing employees:", err);
      if (err.response?.status === 404) {
        toast.error("Import endpoint not found. Please configure backend.");
      } else {
        toast.error(err.response?.data?.message || "Import failed");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const clearFilters = () => {
    setSelectedDepartment("all");
    setSelectedSite("all");
    setSelectedJoinDate("");
    setSortBy("");
    setSearchTerm("");
  };

  const handleViewDocuments = (employee: Employee) => {
    setSelectedEmployeeForDocuments(employee);
    setDocumentsDialogOpen(true);
  };

  const handleOpenEPFForm11 = (employee: Employee) => {
    setSelectedEmployeeForEPF(employee);
    
    // Pre-fill form data with employee information
    setEpfFormData({
      memberName: employee.name || "",
      fatherOrSpouseName: employee.fatherName || employee.spouseName || "",
      relationshipType: employee.fatherName ? "father" : "spouse",
      dateOfBirth: employee.dateOfBirth || "",
      gender: employee.gender || "",
      maritalStatus: employee.maritalStatus || "",
      email: employee.email || "",
      mobileNumber: employee.phone || "",
      
      previousEPFMember: false,
      previousPensionMember: false,
      
      previousUAN: employee.uan || "",
      previousPFAccountNumber: "",
      dateOfExit: "",
      schemeCertificateNumber: "",
      pensionPaymentOrder: "",
      
      internationalWorker: false,
      countryOfOrigin: "",
      passportNumber: "",
      passportValidityFrom: "",
      passportValidityTo: "",
      
      bankAccountNumber: employee.accountNumber || "",
      ifscCode: employee.ifscCode || "",
      aadharNumber: employee.aadharNumber || "",
      panNumber: employee.panNumber || "",
      
      firstEPFMember: true,
      enrolledDate: employee.joinDate || new Date().toISOString().split("T")[0],
      firstEmploymentWages: employee.salary?.toString() || "0",
      epfMemberBeforeSep2014: false,
      epfAmountWithdrawn: false,
      epsAmountWithdrawn: false,
      epsAmountWithdrawnAfterSep2014: false,
      
      declarationDate: new Date().toISOString().split("T")[0],
      declarationPlace: "Mumbai",
      employerDeclarationDate: new Date().toISOString().split("T")[0],
      
      employerName: "SK ENTERPRISES",
      pfNumber: employee.uan || "",
      kycStatus: "not_uploaded",
      transferRequestGenerated: false,
      physicalClaimFiled: false
    });
    
    setEpfForm11DialogOpen(true);
  };

  const handleEPFFormChange = (field: keyof EPFForm11Data, value: any) => {
    setEpfFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEPFForm = async () => {
    if (!epfFormData.memberName || !epfFormData.aadharNumber || !selectedEmployeeForEPF) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSavingEPF(true);
      const employeeId = selectedEmployeeForEPF.id;
      
      const response = await fetch(`${API_URL}/epf-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...epfFormData,
          employeeId: employeeId,
          firstEmploymentWages: parseFloat(epfFormData.firstEmploymentWages) || 0,
          enrolledDate: new Date(epfFormData.enrolledDate || selectedEmployeeForEPF.joinDate),
          declarationDate: new Date(epfFormData.declarationDate),
          employerDeclarationDate: new Date(epfFormData.employerDeclarationDate)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save EPF Form");
      }

      if (data.success) {
        toast.success("EPF Form saved successfully!");
        setEpfForm11DialogOpen(false);
        setSelectedEmployeeForEPF(null);
      } else {
        toast.error(data.message || "Failed to save EPF Form");
      }
    } catch (error: any) {
      console.error("Error saving EPF Form:", error);
      toast.error(error.message || "Error saving EPF Form");
    } finally {
      setIsSavingEPF(false);
    }
  };

  const handlePrintEPFForm = () => {
    if (!selectedEmployeeForEPF) {
      toast.error("No employee selected");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EPF Form 11 - ${epfFormData.memberName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .form-container { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 1px solid #000;
              padding: 20px;
              position: relative;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .header h3 {
              margin: 5px 0;
              font-size: 14px;
              font-weight: normal;
            }
            .subtitle {
              font-size: 10px;
              margin-top: 5px;
              font-style: italic;
            }
            .section { 
              margin-bottom: 20px; 
            }
            .section-title { 
              background: #f0f0f0; 
              padding: 8px; 
              font-weight: bold;
              border: 1px solid #000;
              margin-bottom: 10px;
              font-size: 11px;
            }
            .field-row {
              display: flex;
              margin-bottom: 8px;
              align-items: flex-start;
            }
            .field-group {
              display: flex;
              flex-direction: column;
              margin-right: 20px;
              flex: 1;
            }
            .label { 
              font-weight: bold; 
              margin-bottom: 2px;
              font-size: 10px;
            }
            .value { 
              min-height: 18px;
              border-bottom: 1px solid #000;
              padding: 2px 5px;
              flex: 1;
            }
            .checkbox-group {
              display: flex;
              align-items: center;
              margin-right: 15px;
            }
            .checkbox {
              margin-right: 5px;
            }
            .full-width {
              width: 100%;
            }
            .half-width {
              width: 48%;
            }
            .quarter-width {
              width: 24%;
            }
            .signature-area { 
              margin-top: 30px; 
              border-top: 1px solid #000; 
              padding-top: 15px;
            }
            .signature-line {
              display: inline-block;
              width: 200px;
              border-bottom: 1px solid #000;
              margin: 0 10px;
            }
            .declaration {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #000;
              background: #f9f9f9;
            }
            .declaration p {
              margin: 5px 0;
              font-size: 11px;
            }
            .note {
              font-size: 10px;
              font-style: italic;
              color: #666;
              margin-top: 3px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .form-container { border: none; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>New Form : 11 - Declaration Form</h2>
              <h3>(To be retained by the employer for future reference)</h3>
              <div class="subtitle">EMPLOYEES' PROVIDENT FUND ORGANISATION</div>
              <div class="subtitle">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</div>
              <div class="subtitle">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</div>
            </div>
            
            <div class="section">
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">1. Name of Member (Aadhar Name)</div>
                  <div class="value">${epfFormData.memberName}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">2. ${epfFormData.relationshipType === 'father' ? 'Father\'s Name' : 'Spouse\'s Name'}</div>
                  <div class="value">${epfFormData.fatherOrSpouseName}</div>
                  <div class="note">(Please tick whichever applicable)</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">3. Date of Birth (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.dateOfBirth}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">4. Gender (Male / Female / Transgender)</div>
                  <div class="value">${epfFormData.gender}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">5. Marital Status ? (Single/Married/Widow/Widower/Divorcee)</div>
                  <div class="value">${epfFormData.maritalStatus}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">6. (a) eMail ID</div>
                  <div class="value">${epfFormData.email}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">(b) Mobile No (Aadhar Registered)</div>
                  <div class="value">${epfFormData.mobileNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousPensionMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousPensionMember ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="section-title">9. Previous Employment details ? (If Yes, 7 & 8 details above)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Universal Account Number (UAN)</div>
                  <div class="value">${epfFormData.previousUAN}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) Previous PF Account Number</div>
                  <div class="value">${epfFormData.previousPFAccountNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Date of Exit from previous Employment ? (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.dateOfExit}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Scheme Certificate No (If issued)</div>
                  <div class="value">${epfFormData.schemeCertificateNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">e) Pension Payment Order (PPO) (If issued)</div>
                  <div class="value">${epfFormData.pensionPaymentOrder}</div>
                </div>
              </div>

              <div class="section-title">10. International Worker Details</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) International Worker</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.internationalWorker ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.internationalWorker ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) If Yes, state country of origin (name of other country)</div>
                  <div class="value">${epfFormData.countryOfOrigin}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Passport No.</div>
                  <div class="value">${epfFormData.passportNumber}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Validity of passport (dd/mm/yyyy) to (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.passportValidityFrom} to ${epfFormData.passportValidityTo}</div>
                </div>
              </div>

              <div class="section-title">11. KYC Details : (attach self attested copies of following KYC's)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Bank Account No. & IFS Code</div>
                  <div class="value">${epfFormData.bankAccountNumber} / ${epfFormData.ifscCode}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) AADHAR Number</div>
                  <div class="value">${epfFormData.aadharNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Permanent Account Number (PAN), If available</div>
                  <div class="value">${epfFormData.panNumber}</div>
                </div>
              </div>

              <div class="section-title">12. Declaration Details</div>
              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">First EPF Member</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.firstEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.firstEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">Enrolled Date</div>
                  <div class="value">${epfFormData.enrolledDate}</div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">First Employment EPF Wages</div>
                  <div class="value">₹${epfFormData.firstEmploymentWages}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">Are you EPF Member before 01/09/2014</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPF Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPS (Pension) Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">After Sep 2014 earned EPS (Pension) Amount Withdrawn before Join current Employer?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="declaration">
                <p><strong>UNDERTAKING</strong></p>
                <p>1) Certified that the particulars are true to the best of my knowledge</p>
                <p>2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                <p>3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                <p>(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                <p>4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.declarationDate}</div>
                  </div>
                  <div class="field-group half-width">
                    <div class="label">Place :</div>
                    <div class="value">________________</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Member</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
                </div>
              </div>

              <div class="section-title">DECLARATION BY PRESENT EMPLOYER</div>
              
              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">A. The member Mr./Ms./Mrs. ${epfFormData.memberName} has joined on ${epfFormData.enrolledDate} and has been allotted PF Number ${selectedEmployeeForEPF?.uan || epfFormData.pfNumber || "Pending"}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "not_uploaded" ? "checked" : ""}> The KYC details of the above member in the JAN database have not been uploaded
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "uploaded_not_approved" ? "checked" : ""}> Have been uploaded but not approved
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "uploaded_approved" ? "checked" : ""}> Have been uploaded and approved with DSC
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.transferRequestGenerated ? "checked" : ""}> The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.physicalClaimFiled ? "checked" : ""}> As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.
                </div>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.employerDeclarationDate}</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Employer with Seal of Establishment</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper function to get photo URL with fallback
  const getPhotoUrl = (employee: Employee): string => {
    if (!employee.photo) {
      return "";
    }
    
    // If it's already a full URL (Cloudinary or other)
    if (typeof employee.photo === 'string') {
      // Check if it's a Cloudinary URL
      if (employee.photo.includes('cloudinary.com')) {
        // Add transformations for thumbnail display
        return employee.photo.replace('/image/upload/', '/image/upload/w_200,h_200,c_fill,q_auto/');
      }
      
      // Check if it's a local uploads path (like '/uploads/photo-12345.png')
      if (employee.photo.startsWith('/uploads/')) {
        // Add your backend server URL
        return `http://localhost:5001${employee.photo}`;
      }
      
      // Check if it's a base64 data URL
      if (employee.photo.startsWith('data:image')) {
        return employee.photo;
      }
      
      // Return as-is for other cases
      return employee.photo;
    }
    
    return "";
  };

  // Form generation functions
  const generateIDCard = (employee: Employee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate ID card");
      return;
    }

    // Get photo URL - if it's a Cloudinary URL, use it directly
    const photoUrl = getPhotoUrl(employee);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Card - ${employee.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
            }
            .id-card {
              width: 350px;
              background: white;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              overflow: hidden;
              border: 2px solid #e11d48;
            }
            .header {
              background: linear-gradient(135deg, #e11d48, #be123c);
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header .subtitle {
              font-size: 12px;
              opacity: 0.9;
            }
            .photo-section {
              padding: 20px;
              text-align: center;
              background: white;
            }
            .employee-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 3px solid #e11d48;
              object-fit: cover;
              margin: 0 auto;
              background: #f5f5f5;
            }
            .no-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 3px solid #e11d48;
              background: #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #666;
              font-size: 14px;
              margin: 0 auto;
            }
            .details {
              padding: 20px;
              background: white;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
            }
            .value {
              color: #333;
              font-size: 12px;
            }
            .footer {
              background: #f8f9fa;
              padding: 15px;
              text-align: center;
              border-top: 1px solid #e9ecef;
            }
            .signature {
              margin-top: 10px;
              border-top: 1px solid #ccc;
              padding-top: 5px;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { background: white; }
              .id-card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              <h1>SK ENTERPRISES</h1>
              <div class="subtitle">ID CARD</div>
            </div>
            <div class="photo-section">
              ${photoUrl 
                ? `<img src="${photoUrl}" alt="Employee Photo" class="employee-photo" onerror="this.style.display='none'; document.getElementById('no-photo').style.display='flex';" />` +
                  `<div id="no-photo" class="no-photo" style="display: none;">No Photo</div>`
                : '<div class="no-photo">No Photo</div>'
              }
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${employee.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Employee ID:</span>
                <span class="value">${employee.employeeId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Department:</span>
                <span class="value">${employee.department}</span>
              </div>
              <div class="detail-row">
                <span class="label">Position:</span>
                <span class="value">${employee.position}</span>
              </div>
              <div class="detail-row">
                <span class="label">Blood Group:</span>
                <span class="value">${employee.bloodGroup || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="label">Join Date:</span>
                <span class="value">${employee.joinDate}</span>
              </div>
            </div>
            <div class="footer">
              <div>Authorized Signature</div>
              <div class="signature">This card is property of SK Enterprises</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadIDCard = (employee: Employee) => {
    generateIDCard(employee);
    toast.success(`ID Card downloaded for ${employee.name}`);
  };

  const downloadNomineeForm = (employee: Employee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nominee Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 200px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>Nomination Form for Provident Fund</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Details</div>
              <div class="field"><span class="label">Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">UAN Number:</span> ${employee.uan}</div>
              <div class="field"><span class="label">Department:</span> ${employee.department}</div>
            </div>

            <div class="section">
              <div class="section-title">Nominee Details</div>
              <div class="field"><span class="label">Nominee Name:</span> ${employee.nomineeName || "________________"}</div>
              <div class="field"><span class="label">Relationship:</span> ${employee.nomineeRelation || "________________"}</div>
              <div class="field"><span class="label">Date of Birth:</span> ________________</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
              <div class="field"><span class="label">Share Percentage:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Guardian Details (if nominee is minor)</div>
              <div class="field"><span class="label">Guardian Name:</span> ________________</div>
              <div class="field"><span class="label">Relationship:</span> ________________</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Employer Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Nominee Form generated for ${employee.name}`);
  };

  const downloadPFForm = (employee: Employee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PF Declaration Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 250px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            .declaration { margin: 20px 0; padding: 15px; border: 1px solid #000; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>Provident Fund Declaration Form</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Information</div>
              <div class="field"><span class="label">Full Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">UAN Number:</span> ${employee.uan}</div>
              <div class="field"><span class="label">Date of Joining:</span> ${employee.joinDate}</div>
              <div class="field"><span class="label">Department:</span> ${employee.department}</div>
              <div class="field"><span class="label">Designation:</span> ${employee.position}</div>
              <div class="field"><span class="label">Basic Salary:</span> ₹${employee.salary}</div>
            </div>

            <div class="section">
              <div class="section-title">Previous PF Details (if any)</div>
              <div class="field"><span class="label">Previous UAN:</span> ________________</div>
              <div class="field"><span class="label">Previous Employer:</span> ________________</div>
              <div class="field"><span class="label">PF Account Number:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Bank Account Details</div>
              <div class="field"><span class="label">Bank Name:</span> ${employee.bankName || "________________"}</div>
              <div class="field"><span class="label">Account Number:</span> ${employee.accountNumber || "________________"}</div>
              <div class="field"><span class="label">IFSC Code:</span> ${employee.ifscCode || "________________"}</div>
            </div>

            <div class="declaration">
              <p><strong>Declaration:</strong></p>
              <p>I hereby declare that the information provided above is true and correct to the best of my knowledge. I agree to contribute to the Provident Fund as per the rules and regulations.</p>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Witness Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`PF Form generated for ${employee.name}`);
  };

  const downloadESICForm = (employee: Employee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ESIC Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 250px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            .family-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .family-table th, .family-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>ESIC Family Declaration Form</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Details</div>
              <div class="field"><span class="label">Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">ESIC Number:</span> ${employee.esicNumber}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">Date of Birth:</span> ${employee.dateOfBirth || "________________"}</div>
              <div class="field"><span class="label">Gender:</span> ________________</div>
              <div class="field"><span class="label">Marital Status:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Family Details</div>
              <table class="family-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Date of Birth</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${employee.fatherName ? `<tr><td>${employee.fatherName}</td><td>Father</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.motherName ? `<tr><td>${employee.motherName}</td><td>Mother</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.spouseName ? `<tr><td>${employee.spouseName}</td><td>Spouse</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.numberOfChildren ? Array(parseInt(employee.numberOfChildren) || 0).fill(0).map((_, i) => 
                    `<tr><td>________________</td><td>Child ${i + 1}</td><td>________________</td><td>________________</td></tr>`
                  ).join("") : ""}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Nominee for Dependants Benefit</div>
              <div class="field"><span class="label">Nominee Name:</span> ${employee.nomineeName || "________________"}</div>
              <div class="field"><span class="label">Relationship:</span> ${employee.nomineeRelation || "________________"}</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Employer Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`ESIC Form generated for ${employee.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-center">Loading employees...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 font-medium">{error}</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchEmployees();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search employees..."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="joinDate">Join Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(true)}
              className="flex-1 sm:flex-none"
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sheet className="mr-2 h-4 w-4" />
              )}
              {isImporting ? "Importing..." : "Import Excel"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportEmployees} 
              className="flex-1 sm:flex-none"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? "Exporting..." : "Export Excel"}
            </Button>
            <Button onClick={() => setActiveTab("onboarding")} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map(site => (
              <SelectItem key={site} value={site}>{site}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="date"
            value={selectedJoinDate}
            onChange={(e) => setSelectedJoinDate(e.target.value)}
            placeholder="Filter by Join Date"
            className="w-full"
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      </div>

      <ExcelImportDialog 
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportEmployees}
        loading={isImporting}
      />

      {/* EPF Form 11 Dialog - Updated to match OnboardingTab */}
      <Dialog open={epfForm11DialogOpen} onOpenChange={setEpfForm11DialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              EPF Form 11 - Declaration Form
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              For Employee: <span className="font-semibold">{selectedEmployeeForEPF?.name}</span> 
              | Employee ID: <span className="font-semibold">{selectedEmployeeForEPF?.employeeId}</span>
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center border-b-2 border-black pb-4">
              <h2 className="text-xl font-bold">New Form : 11 - Declaration Form</h2>
              <p className="text-sm">(To be retained by the employer for future reference)</p>
              <p className="text-xs font-semibold">EMPLOYEES' PROVIDENT FUND ORGANISATION</p>
              <p className="text-xs">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</p>
              <p className="text-xs">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Auto-filled from Employee Record</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Fields marked with <span className="font-semibold">(Auto-filled)</span> are automatically populated from the employee's onboarding data.</p>
                    <p className="mt-1">Please review all information before saving.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">
                  1. Name of Member (Aadhar Name) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="memberName"
                    value={epfFormData.memberName}
                    onChange={(e) => handleEPFFormChange('memberName', e.target.value)}
                    placeholder="Enter full name as per Aadhar"
                    className="bg-gray-50"
                    required
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherOrSpouseName">
                  2. Father's Name / Spouse's Name
                </Label>
                <div className="relative">
                  <Input
                    id="fatherOrSpouseName"
                    value={epfFormData.fatherOrSpouseName}
                    onChange={(e) => handleEPFFormChange('fatherOrSpouseName', e.target.value)}
                    placeholder="Enter father or spouse name"
                    className="bg-gray-50"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="father"
                      name="relationshipType"
                      checked={epfFormData.relationshipType === "father"}
                      onChange={() => handleEPFFormChange('relationshipType', 'father')}
                    />
                    <Label htmlFor="father" className="text-sm">Father</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="spouse"
                      name="relationshipType"
                      checked={epfFormData.relationshipType === "spouse"}
                      onChange={() => handleEPFFormChange('relationshipType', 'spouse')}
                    />
                    <Label htmlFor="spouse" className="text-sm">Spouse</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">3. Date of Birth (dd/mm/yyyy)</Label>
                <div className="relative">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={epfFormData.dateOfBirth}
                    onChange={(e) => handleEPFFormChange('dateOfBirth', e.target.value)}
                    className="bg-gray-50"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">4. Gender (Male / Female / Transgender)</Label>
                <div className="relative">
                  <Select value={epfFormData.gender} onValueChange={(value) => handleEPFFormChange('gender', value)}>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Transgender">Transgender</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">5. Marital Status ? (Single/Married/Widow/Widower/Divorcee)</Label>
                <div className="relative">
                  <Select value={epfFormData.maritalStatus} onValueChange={(value) => handleEPFFormChange('maritalStatus', value)}>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Widow">Widow</SelectItem>
                      <SelectItem value="Widower">Widower</SelectItem>
                      <SelectItem value="Divorcee">Divorcee</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">6. (a) eMail ID</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={epfFormData.email}
                    onChange={(e) => handleEPFFormChange('email', e.target.value)}
                    placeholder="Enter email address"
                    className="bg-gray-50"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">6. (b) Mobile No (Aadhar Registered)</Label>
                <div className="relative">
                  <Input
                    id="mobileNumber"
                    value={epfFormData.mobileNumber}
                    onChange={(e) => handleEPFFormChange('mobileNumber', e.target.value)}
                    placeholder="Enter mobile number"
                    className="bg-gray-50"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous Membership Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">Previous Membership Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.previousEPFMember}
                        onChange={(e) => handleEPFFormChange('previousEPFMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.previousEPFMember}
                        onChange={(e) => handleEPFFormChange('previousEPFMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.previousPensionMember}
                        onChange={(e) => handleEPFFormChange('previousPensionMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.previousPensionMember}
                        onChange={(e) => handleEPFFormChange('previousPensionMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>
              </div>

              {(epfFormData.previousEPFMember || epfFormData.previousPensionMember) && (
                <div className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
                  <h5 className="font-medium">9. Previous Employment details ? (If Yes, 7 & 8 details above)</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="previousUAN">a) Universal Account Number (UAN)</Label>
                      <Input
                        id="previousUAN"
                        value={epfFormData.previousUAN}
                        onChange={(e) => handleEPFFormChange('previousUAN', e.target.value)}
                        placeholder="Enter previous UAN"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="previousPFAccountNumber">b) Previous PF Account Number</Label>
                      <Input
                        id="previousPFAccountNumber"
                        value={epfFormData.previousPFAccountNumber}
                        onChange={(e) => handleEPFFormChange('previousPFAccountNumber', e.target.value)}
                        placeholder="Enter previous PF account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfExit">c) Date of Exit from previous Employment</Label>
                      <Input
                        id="dateOfExit"
                        type="date"
                        value={epfFormData.dateOfExit}
                        onChange={(e) => handleEPFFormChange('dateOfExit', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schemeCertificateNumber">d) Scheme Certificate No (If issued)</Label>
                      <Input
                        id="schemeCertificateNumber"
                        value={epfFormData.schemeCertificateNumber}
                        onChange={(e) => handleEPFFormChange('schemeCertificateNumber', e.target.value)}
                        placeholder="Enter scheme certificate number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pensionPaymentOrder">e) Pension Payment Order (PPO) (If issued)</Label>
                      <Input
                        id="pensionPaymentOrder"
                        value={epfFormData.pensionPaymentOrder}
                        onChange={(e) => handleEPFFormChange('pensionPaymentOrder', e.target.value)}
                        placeholder="Enter PPO number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* International Worker Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">10. International Worker Details</h4>
              
              <div className="space-y-2">
                <Label>a) International Worker</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.internationalWorker}
                      onChange={(e) => handleEPFFormChange('internationalWorker', e.target.checked)}
                    />
                    <Label>Yes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!epfFormData.internationalWorker}
                      onChange={(e) => handleEPFFormChange('internationalWorker', !e.target.checked)}
                    />
                    <Label>No</Label>
                  </div>
                </div>
              </div>

              {epfFormData.internationalWorker && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryOfOrigin">b) Country of Origin</Label>
                    <Input
                      id="countryOfOrigin"
                      value={epfFormData.countryOfOrigin}
                      onChange={(e) => handleEPFFormChange('countryOfOrigin', e.target.value)}
                      placeholder="Enter country name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">c) Passport No.</Label>
                    <Input
                      id="passportNumber"
                      value={epfFormData.passportNumber}
                      onChange={(e) => handleEPFFormChange('passportNumber', e.target.value)}
                      placeholder="Enter passport number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportValidityFrom">d) Passport Validity From</Label>
                    <Input
                      id="passportValidityFrom"
                      type="date"
                      value={epfFormData.passportValidityFrom}
                      onChange={(e) => handleEPFFormChange('passportValidityFrom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportValidityTo">d) Passport Validity To</Label>
                    <Input
                      id="passportValidityTo"
                      type="date"
                      value={epfFormData.passportValidityTo}
                      onChange={(e) => handleEPFFormChange('passportValidityTo', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* KYC Details Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">11. KYC Details : (attach self attested copies of following KYC's)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">a) Bank Account No. & IFS Code</Label>
                  <div className="relative">
                    <Input
                      id="bankAccountNumber"
                      value={epfFormData.bankAccountNumber}
                      onChange={(e) => handleEPFFormChange('bankAccountNumber', e.target.value)}
                      placeholder="Enter bank account number"
                      className="bg-gray-50"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <div className="relative">
                    <Input
                      id="ifscCode"
                      value={epfFormData.ifscCode}
                      onChange={(e) => handleEPFFormChange('ifscCode', e.target.value)}
                      placeholder="Enter IFSC code"
                      className="bg-gray-50"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber">
                    b) AADHAR Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="aadharNumber"
                      value={epfFormData.aadharNumber}
                      onChange={(e) => handleEPFFormChange('aadharNumber', e.target.value)}
                      placeholder="Enter Aadhar number"
                      className="bg-gray-50"
                      required
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">c) Permanent Account Number (PAN)</Label>
                  <div className="relative">
                    <Input
                      id="panNumber"
                      value={epfFormData.panNumber}
                      onChange={(e) => handleEPFFormChange('panNumber', e.target.value)}
                      placeholder="Enter PAN number"
                      className="bg-gray-50"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration Details Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">12. Declaration Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First EPF Member</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.firstEPFMember}
                        onChange={(e) => handleEPFFormChange('firstEPFMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.firstEPFMember}
                        onChange={(e) => handleEPFFormChange('firstEPFMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrolledDate">Enrolled Date</Label>
                  <div className="relative">
                    <Input
                      id="enrolledDate"
                      type="date"
                      value={epfFormData.enrolledDate}
                      onChange={(e) => handleEPFFormChange('enrolledDate', e.target.value)}
                      className="bg-gray-50"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstEmploymentWages">First Employment EPF Wages</Label>
                  <div className="relative">
                    <Input
                      id="firstEmploymentWages"
                      value={epfFormData.firstEmploymentWages}
                      onChange={(e) => handleEPFFormChange('firstEmploymentWages', e.target.value)}
                      placeholder="Enter wages"
                      className="bg-gray-50"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Are you EPF Member before 01/09/2014</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epfMemberBeforeSep2014}
                        onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epfMemberBeforeSep2014}
                        onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">If Yes, EPF Amount Withdrawn?</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epfAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epfAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">If Yes, EPS (Pension) Amount Withdrawn?</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epsAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epsAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">After Sep 2014 earned EPS (Pension) Amount Withdrawn before Join current Employer?</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epsAmountWithdrawnAfterSep2014}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epsAmountWithdrawnAfterSep2014}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Undertaking Section */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-2">UNDERTAKING</h4>
              <p className="text-sm">1) Certified that the particulars are true to the best of my knowledge</p>
              <p className="text-sm">2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
              <p className="text-sm">3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
              <p className="text-sm">(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
              <p className="text-sm">4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
            </div>

            {/* Employee Declaration */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">Employee Declaration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="declarationDate">Date</Label>
                  <Input
                    id="declarationDate"
                    type="date"
                    value={epfFormData.declarationDate}
                    onChange={(e) => handleEPFFormChange('declarationDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="declarationPlace">Place</Label>
                  <Input
                    id="declarationPlace"
                    value={epfFormData.declarationPlace}
                    onChange={(e) => handleEPFFormChange('declarationPlace', e.target.value)}
                    placeholder="Enter place"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Signature of Member</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                  <span className="text-muted-foreground">Employee Signature</span>
                </div>
              </div>
            </div>

            {/* Employer Declaration */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="section-title">DECLARATION BY PRESENT EMPLOYER</div>
              
              <div className="space-y-2">
                <Label>A. The member Mr./Ms./Mrs. {epfFormData.memberName} has joined on {epfFormData.enrolledDate} and has been allotted PF Number {selectedEmployeeForEPF?.uan || epfFormData.pfNumber || "Pending"}</Label>
              </div>

              <div className="space-y-2">
                <Label>B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "not_uploaded"}
                      onChange={() => handleEPFFormChange('kycStatus', 'not_uploaded')}
                    />
                    <Label>The KYC details of the above member in the JAN database have not been uploaded</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "uploaded_not_approved"}
                      onChange={() => handleEPFFormChange('kycStatus', 'uploaded_not_approved')}
                    />
                    <Label>Have been uploaded but not approved</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "uploaded_approved"}
                      onChange={() => handleEPFFormChange('kycStatus', 'uploaded_approved')}
                    />
                    <Label>Have been uploaded and approved with DSC</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.transferRequestGenerated}
                      onChange={(e) => handleEPFFormChange('transferRequestGenerated', e.target.checked)}
                    />
                    <Label>The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.physicalClaimFiled}
                      onChange={(e) => handleEPFFormChange('physicalClaimFiled', e.target.checked)}
                    />
                    <Label>As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="employerDeclarationDate">Date</Label>
                  <Input
                    id="employerDeclarationDate"
                    type="date"
                    value={epfFormData.employerDeclarationDate}
                    onChange={(e) => handleEPFFormChange('employerDeclarationDate', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Signature of Employer with Seal of Establishment</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                  <span className="text-muted-foreground">Employer Signature & Seal</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button onClick={handleSaveEPFForm} className="flex items-center gap-2" disabled={isSavingEPF}>
                {isSavingEPF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSavingEPF ? "Saving..." : "Save Form"}
              </Button>
              <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Print Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Employees" value={employees.length} />
        <StatCard 
          title="Active Employees" 
          value={activeEmployees} 
          className="text-green-600" 
        />
        <StatCard 
          title="Left/Inactive Employees" 
          value={leftEmployeesCount} 
          className="text-red-600" 
        />
      </div>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents - {selectedEmployeeForDocuments?.name} ({selectedEmployeeForDocuments?.employeeId})
            </DialogTitle>
          </DialogHeader>
          {selectedEmployeeForDocuments && (
            <div className="space-y-6">
              {/* Uploaded Documents Section */}
              <div>
                <h4 className="font-semibold text-lg mb-4">Uploaded Documents</h4>
                {selectedEmployeeForDocuments.documents && selectedEmployeeForDocuments.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEmployeeForDocuments.documents.map((doc, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-500" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">{doc.type}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded: {doc.uploadDate} • Expires: {doc.expiryDate}
                              </p>
                            </div>
                          </div>
                          <Badge variant={doc.status === "valid" ? "default" : "destructive"}>
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No documents uploaded for this employee</p>
                  </div>
                )}
              </div>

              {/* Generated Forms Section */}
              <div>
                <h4 className="font-semibold text-lg mb-4">Available Forms</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* ID Card */}
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <h5 className="font-medium mb-2">ID Card</h5>
                    <p className="text-sm text-muted-foreground mb-3">Employee identification card</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        generateIDCard(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  {/* Nominee Form */}
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <h5 className="font-medium mb-2">Nominee Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">PF nominee declaration</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        downloadNomineeForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  {/* PF Form */}
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <h5 className="font-medium mb-2">PF Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">Provident fund declaration</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        downloadPFForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  {/* ESIC Form */}
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <h5 className="font-medium mb-2">ESIC Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">Health insurance form</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        downloadESICForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  {/* EPF Form 11 */}
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-red-600" />
                    </div>
                    <h5 className="font-medium mb-2">EPF Form 11</h5>
                    <p className="text-sm text-muted-foreground mb-3">Employee declaration form</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        handleOpenEPFForm11(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>

              {/* Employee Photo */}
              {selectedEmployeeForDocuments.photo && (
                <div>
                  <h4 className="font-semibold text-lg mb-4">Employee Photo</h4>
                  <div className="border rounded-lg p-4 text-center">
                    <img 
                      src={getPhotoUrl(selectedEmployeeForDocuments)} 
                      alt={selectedEmployeeForDocuments.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-2">Employee Photo (Stored in Cloudinary)</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Employee List Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Employee List</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedDepartment !== "all" && (
                <Badge variant="secondary">Department: {selectedDepartment}</Badge>
              )}
              {selectedSite !== "all" && (
                <Badge variant="secondary">Site: {selectedSite}</Badge>
              )}
              {selectedJoinDate && (
                <Badge variant="secondary">Join Date: {selectedJoinDate}</Badge>
              )}
              {sortBy && (
                <Badge variant="secondary">
                  Sorted by: {sortBy === "name" ? "Name" : sortBy === "department" ? "Department" : sortBy === "site" ? "Site" : "Join Date"}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {employee.photo ? (
                      <img 
                        src={getPhotoUrl(employee)} 
                        alt={employee.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{employee.name}</h4>
                        {employee.status === "left" && (
                          <Badge variant="destructive">Left</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{employee.employeeId} • {employee.department}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                      <p className="text-sm text-muted-foreground">Site: {employee.siteName || "Not specified"}</p>
                      <p className="text-sm text-muted-foreground">Join Date: {employee.joinDate}</p>
                      <p className="text-sm text-muted-foreground">Salary: ₹{employee.salary.toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Documents: {employee.documents?.length || 0}
                        </Badge>
                        {employee.panNumber && (
                          <Badge variant="secondary" className="text-xs">PAN</Badge>
                        )}
                        {employee.uan && (
                          <Badge variant="secondary" className="text-xs">UAN</Badge>
                        )}
                        {employee.esicNumber && (
                          <Badge variant="secondary" className="text-xs">ESIC</Badge>
                        )}
                        {employee.photo && (
                          <Badge variant="secondary" className="text-xs">Photo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDocuments(employee)}
                      className="flex items-center gap-1"
                    >
                      <Files className="h-3 w-3" />
                      Documents
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Employee Details - {employee.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><strong>Employee ID:</strong> {employee.employeeId}</div>
                            <div><strong>Email:</strong> {employee.email}</div>
                            <div><strong>Phone:</strong> {employee.phone}</div>
                            <div><strong>Aadhar:</strong> {employee.aadharNumber}</div>
                            <div><strong>PAN:</strong> {employee.panNumber || "Not provided"}</div>
                            <div><strong>UAN:</strong> {employee.uan}</div>
                            <div><strong>ESIC:</strong> {employee.esicNumber}</div>
                            <div><strong>Department:</strong> {employee.department}</div>
                            <div><strong>Position:</strong> {employee.position}</div>
                            <div><strong>Site:</strong> {employee.siteName || "Not specified"}</div>
                            <div><strong>Join Date:</strong> {employee.joinDate}</div>
                            <div><strong>Salary:</strong> ₹{employee.salary.toLocaleString()}</div>
                            <div><strong>Status:</strong> 
                              <Badge variant={getStatusColor(employee.status)} className="ml-2">
                                {employee.status}
                              </Badge>
                            </div>
                          </div>
                          {employee.photo && (
                            <div>
                              <strong>Employee Photo:</strong>
                              <div className="mt-2">
                                <img 
                                  src={getPhotoUrl(employee)} 
                                  alt={employee.name}
                                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                  }}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Stored in Cloudinary</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <strong>Documents:</strong>
                            <div className="mt-2 space-y-2">
                              {employee.documents && employee.documents.length > 0 ? (
                                employee.documents.map(doc => (
                                  <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      <span>{doc.name}</span>
                                      <span className="text-sm text-muted-foreground">({doc.type})</span>
                                    </div>
                                    <Badge variant={getStatusColor(doc.status)}>
                                      {doc.status}
                                    </Badge>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No documents uploaded
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateIDCard(employee)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View ID
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadIDCard(employee)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      ID Card
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEPFForm11(employee)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      EPF Form 11
                    </Button>
                    
                    {employee.status !== "left" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsLeft(employee)}
                      >
                        Mark as Left
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      disabled={isDeleting === employee.id}
                    >
                      {isDeleting === employee.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {sortedEmployees.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || selectedDepartment !== "all" || selectedSite !== "all" || selectedJoinDate ? 
                  "No employees found matching your filters. Try clearing filters." : 
                  "No employees found. Add your first employee above."}
              </div>
            )}

            {sortedEmployees.length > 0 && (
              <Pagination
                currentPage={employeesPage}
                totalPages={Math.ceil(sortedEmployees.length / employeesItemsPerPage)}
                totalItems={sortedEmployees.length}
                itemsPerPage={employeesItemsPerPage}
                onPageChange={setEmployeesPage}
                onItemsPerPageChange={setEmployeesItemsPerPage}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesTab;