import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Upload, Trash2, Camera, X, Save, Edit, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Define the API Base URL
const API_BASE_URL = "http://localhost:5001/api";

// Types
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
  uan?: string;
  esicNumber?: string;
  panNumber?: string;
  photo?: string;
  // Additional fields
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string | number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  authorizedSignature?: string;
}

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

interface NewEmployeeForm {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber: string;
  esicNumber: string;
  uanNumber: string;
  
  // Personal Details
  siteName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  dateOfExit: string;
  bloodGroup: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address
  permanentAddress: string;
  permanentPincode: string;
  localAddress: string;
  localPincode: string;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  
  // Family Details
  fatherName: string;
  motherName: string;
  spouseName: string;
  numberOfChildren: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Nominee Details
  nomineeName: string;
  nomineeRelation: string;
  
  // Uniform Details
  pantSize: string;
  shirtSize: string;
  capSize: string;
  
  // Issued Items
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  
  // Employment Details
  department: string;
  position: string;
  salary: string;
  
  // Documents
  photo: File | null;
  employeeSignature: File | null;
  authorizedSignature: File | null;
}

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
}

interface OnboardingTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaryStructures: SalaryStructure[];
  setSalaryStructures: React.Dispatch<React.SetStateAction<SalaryStructure[]>>;
  newJoinees?: Employee[];
  setNewJoinees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  leftEmployees?: Employee[];
  setLeftEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// Departments array
const departments = [
  "Housekeeping Management", 
  "Security Management", 
  "Parking Management", 
  "Waste Management", 
  "STP Tank Cleaning", 
  "Consumables Management",
  "Administration",
  "HR",
  "Finance",
  "IT",
  "Operations",
  "Maintenance"
];

// FormField Component
const FormField = ({ 
  label, 
  id, 
  children, 
  required = false 
}: { 
  label: string; 
  id?: string; 
  children: React.ReactNode; 
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
  </div>
);

const OnboardingTab = ({ 
  employees, 
  setEmployees, 
  salaryStructures, 
  setSalaryStructures,
  newJoinees = [],
  setNewJoinees,
  leftEmployees,
  setLeftEmployees
}: OnboardingTabProps) => {
  const [loading, setLoading] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    name: "",
    email: "",
    phone: "",
    aadharNumber: "",
    panNumber: "",
    esicNumber: "",
    uanNumber: "",
    siteName: "",
    dateOfBirth: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    dateOfExit: "",
    bloodGroup: "",
    permanentAddress: "",
    permanentPincode: "",
    localAddress: "",
    localPincode: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    numberOfChildren: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    nomineeName: "",
    nomineeRelation: "",
    pantSize: "",
    shirtSize: "",
    capSize: "",
    idCardIssued: false,
    westcoatIssued: false,
    apronIssued: false,
    department: "",
    position: "",
    salary: "",
    photo: null,
    employeeSignature: null,
    authorizedSignature: null
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showEPFForm11, setShowEPFForm11] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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
    declarationPlace: "",
    employerDeclarationDate: new Date().toISOString().split("T")[0]
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureEmployeeRef = useRef<HTMLInputElement>(null);
  const signatureAuthorizedRef = useRef<HTMLInputElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);

  // Initialize EPF Form with employee data
  const initializeEPFForm = (employee: Employee) => {
  setSelectedEmployee(employee);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];
  
  // Parse employee salary to number
  const salary = typeof employee.salary === 'string' 
    ? parseFloat(employee.salary) 
    : employee.salary;
  
  // Set EPF Form data with auto-filled values from employee
  setEpfFormData({
    // Section 1-6
    memberName: employee.name || "",
    fatherOrSpouseName: employee.fatherName || employee.spouseName || "",
    relationshipType: employee.fatherName ? "father" : "spouse",
    dateOfBirth: employee.dateOfBirth || "",
    gender: employee.gender || "",
    maritalStatus: employee.maritalStatus || "",
    email: employee.email || "",
    mobileNumber: employee.phone || "",
    
    // Section 7-8
    previousEPFMember: false,
    previousPensionMember: false,
    
    // Section 9 - Previous Employment
    previousUAN: employee.uan || "",
    previousPFAccountNumber: "",
    dateOfExit: "",
    schemeCertificateNumber: "",
    pensionPaymentOrder: "",
    
    // Section 10 - International Worker
    internationalWorker: false,
    countryOfOrigin: "",
    passportNumber: "",
    passportValidityFrom: "",
    passportValidityTo: "",
    
    // Section 11 - KYC Details
    bankAccountNumber: employee.accountNumber || "",
    ifscCode: employee.ifscCode || "",
    aadharNumber: employee.aadharNumber || "",
    panNumber: employee.panNumber || "",
    
    // Section 12 - Declaration Details
    firstEPFMember: true,
    enrolledDate: employee.joinDate || today,
    firstEmploymentWages: salary?.toString() || "0",
    epfMemberBeforeSep2014: false,
    epfAmountWithdrawn: false,
    epsAmountWithdrawn: false,
    epsAmountWithdrawnAfterSep2014: false,
    
    // Signatures
    declarationDate: today,
    declarationPlace: "Mumbai",
    employerDeclarationDate: today
  });
  setShowEPFForm11(true);
};
const isAutoFilledField = (fieldName: keyof EPFForm11Data): boolean => {
  const autoFilledFields: (keyof EPFForm11Data)[] = [
    'memberName',
    'fatherOrSpouseName',
    'dateOfBirth',
    'gender',
    'maritalStatus',
    'email',
    'mobileNumber',
    'aadharNumber',
    'panNumber',
    'bankAccountNumber',
    'ifscCode',
    'enrolledDate',
    'firstEmploymentWages'
  ];
  
  return autoFilledFields.includes(fieldName);
};
  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(error => {
          console.error("Error playing video:", error);
        });
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Cannot access camera. Please check permissions and try again.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 with compression
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const useCapturedPhoto = () => {
    if (capturedImage) {
      // Convert base64 to file
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'employee-photo.jpg', { type: 'image/jpeg' });
          setNewEmployee({...newEmployee, photo: file});
          toast.success("Photo captured successfully!");
        })
        .catch(error => {
          console.error("Error converting photo:", error);
          toast.error("Error processing photo. Please try again.");
        });
    }
    stopCamera();
    setShowCamera(false);
    setCapturedImage(null);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      // Compress image
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Set max dimensions
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let { width, height } = img;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, { 
                  type: 'image/jpeg', 
                  lastModified: Date.now() 
                });
                setNewEmployee({...newEmployee, photo: compressedFile});
                toast.success("Photo uploaded and compressed successfully!");
              }
            }, 'image/jpeg', 0.8);
          }
        };
        img.onerror = () => {
          toast.error("Error loading image. Please try another file.");
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        toast.error("Error reading file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

const handleAddEmployee = async () => {
  // Basic validation - ADD position validation
  if (!newEmployee.name || !newEmployee.email || !newEmployee.aadharNumber || !newEmployee.position) {
    toast.error("Please fill all required fields (Name, Email, Aadhar Number, Position)");
    return;
  }

  setLoading(true);

  try {
    // Create FormData for file uploads
    const formData = new FormData();

    // Prepare cleaned employee data
    const cleanedEmployeeData: any = { ...newEmployee };
    
    // Clean up empty fields
    Object.keys(cleanedEmployeeData).forEach(key => {
      const value = cleanedEmployeeData[key];
      
      // Remove empty strings, null, or undefined values
      if (value === '' || value === null || value === undefined) {
        delete cleanedEmployeeData[key];
      }
      
      // Convert certain fields
      if (key === 'numberOfChildren' && value === '') {
        delete cleanedEmployeeData[key];
      }
      
      if (key === 'salary' && value === '') {
        toast.error("Salary is required");
        throw new Error("Salary is required");
      }
      
      // Uppercase PAN and IFSC
      if (key === 'panNumber' && value) {
        cleanedEmployeeData[key] = value.toUpperCase();
      }
      if (key === 'ifscCode' && value) {
        cleanedEmployeeData[key] = value.toUpperCase();
      }
      
      // Fix blood group format - convert 'B +ve' to 'B_POSITIVE'
      // if (key === 'bloodGroup' && value) {
      //   cleanedEmployeeData[key] = convertBloodGroupToEnum(value);
      // }
    });

    // Append all employee data
    Object.entries(cleanedEmployeeData).forEach(([key, value]) => {
      if (key === "photo" || key === "employeeSignature" || key === "authorizedSignature") {
        if (value instanceof File) {
          formData.append(key, value);
        }
      } else if (typeof value === "boolean") {
        formData.append(key, value.toString());
      } else if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Append additional documents
    uploadedDocuments.forEach((doc, index) => {
      formData.append("documents", doc);
    });

    // Send request to backend
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create employee");
    }

    // ... rest of the function remains the same
  } catch (error: any) {
    console.error("Error creating employee:", error);
    toast.error(error.message || "Error creating employee. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocuments = Array.from(files);
      setUploadedDocuments(prev => [...prev, ...newDocuments]);
      toast.success(`${newDocuments.length} document(s) uploaded successfully!`);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignatureUpload = (type: 'employee' | 'authorized', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'employee') {
        setNewEmployee({...newEmployee, employeeSignature: file});
      } else {
        setNewEmployee({...newEmployee, authorizedSignature: file});
      }
      toast.success(`${type === 'employee' ? 'Employee' : 'Authorized'} signature uploaded successfully!`);
    }
  };

  // EPF Form Handlers
  const handleEPFFormChange = (field: keyof EPFForm11Data, value: any) => {
    setEpfFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

const handleSaveEPFForm = async () => {
  if (!epfFormData.memberName || !epfFormData.aadharNumber || !selectedEmployee) {
    toast.error("Please fill all required fields and select an employee");
    return;
  }

  try {
    // Make sure we're using the correct employeeId
    const employeeId = selectedEmployee.employeeId || selectedEmployee._id;
    
    const response = await fetch(`${API_BASE_URL}/epf-forms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...epfFormData,
        employeeId: employeeId, // Use the string employeeId (like "EMP0001")
        firstEmploymentWages: parseFloat(epfFormData.firstEmploymentWages) || 0,
        enrolledDate: new Date(epfFormData.enrolledDate || selectedEmployee.joinDate),
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
      setShowEPFForm11(false); // Close the modal after saving
    } else {
      toast.error(data.message || "Failed to save EPF Form");
    }
  } catch (error: any) {
    console.error("Error saving EPF Form:", error);
    toast.error(error.message || "Error saving EPF Form");
  }
};

  const handlePrintEPFForm = () => {
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
                  <div class="label">A. The member Mr./Ms./Mrs. ${epfFormData.memberName} has joined on ${epfFormData.enrolledDate} and has been allotted PF Number ${selectedEmployee?.uan || "Pending"}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> The KYC details of the above member in the JAN database have not been uploaded
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> Have been uploaded but not approved
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> Have been uploaded and approved with DSC
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox"> As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.
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

  return (
    <div className="space-y-6">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Capture Photo</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowCamera(false); stopCamera(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              {!capturedImage ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-64 bg-gray-100 rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={capturePhoto} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button variant="outline" onClick={() => { setShowCamera(false); stopCamera(); }}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={useCapturedPhoto} className="flex-1">
                      Use This Photo
                    </Button>
                    <Button variant="outline" onClick={retakePhoto}>
                      Retake Photo
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EPF Form 11 Modal */}
      {showEPFForm11 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">EPF Form 11 - Declaration Form</h3>
              <div className="flex gap-2">
                <Button onClick={handleSaveEPFForm} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEPFForm11(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
  <div className="text-center border-b-2 border-black pb-4">
    <h2 className="text-xl font-bold">New Form : 11 - Declaration Form</h2>
    <p className="text-sm">(To be retained by the employer for future reference)</p>
    <p className="text-xs font-semibold">EMPLOYEES' PROVIDENT FUND ORGANISATION</p>
    <p className="text-xs">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</p>
    <p className="text-xs">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</p>
  </div>

  {/* Add a notice about auto-filled fields */}
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

  {/* Then continue with the form fields */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="1. Name of Member (Aadhar Name)" required>
      <div className="relative">
        <Input
          value={epfFormData.memberName}
          onChange={(e) => handleEPFFormChange('memberName', e.target.value)}
          placeholder="Enter full name as per Aadhar"
          className="bg-gray-50" // Make it look read-only
        />
        <div className="absolute right-2 top-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
        </div>
      </div>
    </FormField>

              // For each auto-filled field, add:
<FormField label="2. Father's Name / Spouse's Name">
  <div className="relative">
    <Input
      value={epfFormData.fatherOrSpouseName}
      onChange={(e) => handleEPFFormChange('fatherOrSpouseName', e.target.value)}
      placeholder={`Enter ${epfFormData.relationshipType === 'father' ? 'father' : 'spouse'} name`}
      className={isAutoFilledField('fatherOrSpouseName') ? "bg-gray-50" : ""}
    />
    {isAutoFilledField('fatherOrSpouseName') && (
      <div className="absolute right-2 top-2">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
      </div>
    )}
  </div>
</FormField>

                <FormField label="3. Date of Birth">
                  <Input
                    type="date"
                    value={epfFormData.dateOfBirth}
                    onChange={(e) => handleEPFFormChange('dateOfBirth', e.target.value)}
                  />
                </FormField>

                <FormField label="4. Gender">
                  <Select value={epfFormData.gender} onValueChange={(value) => handleEPFFormChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Transgender">Transgender</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="5. Marital Status">
                  <Select value={epfFormData.maritalStatus} onValueChange={(value) => handleEPFFormChange('maritalStatus', value)}>
                    <SelectTrigger>
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
                </FormField>

                <FormField label="6. (a) Email ID">
                  <Input
                    type="email"
                    value={epfFormData.email}
                    onChange={(e) => handleEPFFormChange('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </FormField>

                <FormField label="6. (b) Mobile No (Aadhar Registered)">
                  <Input
                    value={epfFormData.mobileNumber}
                    onChange={(e) => handleEPFFormChange('mobileNumber', e.target.value)}
                    placeholder="Enter mobile number"
                  />
                </FormField>
              </div>

              {/* Section 7-8 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
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

              {/* Section 9 - Previous Employment */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">9. Previous Employment details ? (If Yes, 7 & 8 details above)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="a) Universal Account Number (UAN)">
                    <Input
                      value={epfFormData.previousUAN}
                      onChange={(e) => handleEPFFormChange('previousUAN', e.target.value)}
                      placeholder="Enter previous UAN"
                    />
                  </FormField>
                  <FormField label="b) Previous PF Account Number">
                    <Input
                      value={epfFormData.previousPFAccountNumber}
                      onChange={(e) => handleEPFFormChange('previousPFAccountNumber', e.target.value)}
                      placeholder="Enter previous PF account number"
                    />
                  </FormField>
                  <FormField label="c) Date of Exit from previous Employment">
                    <Input
                      type="date"
                      value={epfFormData.dateOfExit}
                      onChange={(e) => handleEPFFormChange('dateOfExit', e.target.value)}
                    />
                  </FormField>
                  <FormField label="d) Scheme Certificate No (If issued)">
                    <Input
                      value={epfFormData.schemeCertificateNumber}
                      onChange={(e) => handleEPFFormChange('schemeCertificateNumber', e.target.value)}
                      placeholder="Enter scheme certificate number"
                    />
                  </FormField>
                  <FormField label="e) Pension Payment Order (PPO) (If issued)">
                    <Input
                      value={epfFormData.pensionPaymentOrder}
                      onChange={(e) => handleEPFFormChange('pensionPaymentOrder', e.target.value)}
                      placeholder="Enter PPO number"
                    />
                  </FormField>
                </div>
              </div>

              {/* Section 10 - International Worker */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">10. International Worker Details</h4>
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
                    <FormField label="b) Country of origin">
                      <Input
                        value={epfFormData.countryOfOrigin}
                        onChange={(e) => handleEPFFormChange('countryOfOrigin', e.target.value)}
                        placeholder="Enter country name"
                      />
                    </FormField>
                    <FormField label="c) Passport No.">
                      <Input
                        value={epfFormData.passportNumber}
                        onChange={(e) => handleEPFFormChange('passportNumber', e.target.value)}
                        placeholder="Enter passport number"
                      />
                    </FormField>
                    <FormField label="d) Passport Validity From">
                      <Input
                        type="date"
                        value={epfFormData.passportValidityFrom}
                        onChange={(e) => handleEPFFormChange('passportValidityFrom', e.target.value)}
                      />
                    </FormField>
                    <FormField label="d) Passport Validity To">
                      <Input
                        type="date"
                        value={epfFormData.passportValidityTo}
                        onChange={(e) => handleEPFFormChange('passportValidityTo', e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
              </div>

              {/* Section 11 - KYC Details */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">11. KYC Details : (attach self attested copies of following KYC's)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="a) Bank Account No. & IFSC Code">
                    <Input
                      value={epfFormData.bankAccountNumber}
                      onChange={(e) => handleEPFFormChange('bankAccountNumber', e.target.value)}
                      placeholder="Enter bank account number"
                    />
                  </FormField>
                  <FormField label="IFSC Code">
                    <Input
                      value={epfFormData.ifscCode}
                      onChange={(e) => handleEPFFormChange('ifscCode', e.target.value)}
                      placeholder="Enter IFSC code"
                    />
                  </FormField>
                  <FormField label="b) AADHAR Number" required>
                    <Input
                      value={epfFormData.aadharNumber}
                      onChange={(e) => handleEPFFormChange('aadharNumber', e.target.value)}
                      placeholder="Enter Aadhar number"
                      required
                    />
                  </FormField>
                  <FormField label="c) Permanent Account Number (PAN)">
                    <Input
                      value={epfFormData.panNumber}
                      onChange={(e) => handleEPFFormChange('panNumber', e.target.value)}
                      placeholder="Enter PAN number"
                    />
                  </FormField>
                </div>
              </div>

              {/* Section 12 - Declaration Details */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">12. Declaration Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <FormField label="Enrolled Date">
                    <Input
                      type="date"
                      value={epfFormData.enrolledDate}
                      onChange={(e) => handleEPFFormChange('enrolledDate', e.target.value)}
                    />
                  </FormField>

                  <FormField label="First Employment EPF Wages">
                    <Input
                      value={epfFormData.firstEmploymentWages}
                      onChange={(e) => handleEPFFormChange('firstEmploymentWages', e.target.value)}
                      placeholder="Enter wages"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm">EPF Member before 01/09/2014</Label>
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
                    <Label className="text-sm">EPF Amount Withdrawn?</Label>
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
                    <Label className="text-sm">EPS Amount Withdrawn?</Label>
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
                    <Label className="text-sm">EPS Amount Withdrawn after Sep 2014?</Label>
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

              {/* Undertaking */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-2">UNDERTAKING</h4>
                <p className="text-sm">1) Certified that the particulars are true to the best of my knowledge</p>
                <p className="text-sm">2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                <p className="text-sm">3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                <p className="text-sm">(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                <p className="text-sm">4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                <div className="space-y-4">
                  <h4 className="font-semibold">Employee Declaration</h4>
                  <FormField label="Date">
                    <Input
                      type="date"
                      value={epfFormData.declarationDate}
                      onChange={(e) => handleEPFFormChange('declarationDate', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Place">
                    <Input
                      value={epfFormData.declarationPlace}
                      onChange={(e) => handleEPFFormChange('declarationPlace', e.target.value)}
                      placeholder="Enter place"
                    />
                  </FormField>
                  <FormField label="Signature of Member">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                      <span className="text-muted-foreground">Employee Signature</span>
                    </div>
                  </FormField>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Employer Declaration</h4>
                  <FormField label="Date">
                    <Input
                      type="date"
                      value={epfFormData.employerDeclarationDate}
                      onChange={(e) => handleEPFFormChange('employerDeclarationDate', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Signature of Employer with Seal">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                      <span className="text-muted-foreground">Employer Signature & Seal</span>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end pt-4 border-t">
                <Button onClick={handleSaveEPFForm} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Form
                </Button>
                <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Print Form
                </Button>
                <Button variant="outline" onClick={() => setShowEPFForm11(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Onboarding & Document Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Header Section */}
          <div className="border-2 border-gray-300 p-4 md:p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-center mb-4">
                  <div className="text-xl md:text-2xl font-bold">SK ENTERPRISES</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Housekeeping • Parking • Waste Management</div>
                  <div className="text-lg font-semibold mt-2">Employee Joining Form</div>
                </div>
                
                <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                  <div className="border-2 border-dashed border-gray-400 w-20 h-24 md:w-24 md:h-32 flex items-center justify-center text-xs text-muted-foreground text-center p-2 mx-auto md:mx-0">
                    {newEmployee.photo ? (
                      <img 
                        src={URL.createObjectURL(newEmployee.photo)} 
                        alt="Employee" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "Photo"
                    )}
                  </div>
                  
                  <div className="text-center md:text-right space-y-2 w-full md:w-auto">
                    <div className="text-sm font-semibold">New Joining</div>
                    <div className="text-sm">
                      Code No. / Ref No.: <span className="border-b border-gray-400 inline-block min-w-[100px]">SK-___________</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:gap-8">
            {/* Employee Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Employee Details</h3>
              
              {/* Photo Upload Section */}
              <div className="space-y-4">
                <Label>Employee Photo</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={startCamera}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {newEmployee.photo && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-green-600">Photo selected</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewEmployee({...newEmployee, photo: null})}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Site Name" id="siteName">
                  <Input
                    id="siteName"
                    value={newEmployee.siteName}
                    onChange={(e) => setNewEmployee({...newEmployee, siteName: e.target.value})}
                    placeholder="Enter site name"
                  />
                </FormField>
                
                <FormField label="Name" id="name" required>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    placeholder="Enter full name"
                    required
                  />
                </FormField>
                
                <FormField label="Date of Birth" id="dateOfBirth">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={newEmployee.dateOfBirth}
                    onChange={(e) => setNewEmployee({...newEmployee, dateOfBirth: e.target.value})}
                  />
                </FormField>
                
                <FormField label="Date of Joining" id="dateOfJoining">
                  <Input
                    id="dateOfJoining"
                    type="date"
                    value={newEmployee.dateOfJoining}
                    onChange={(e) => setNewEmployee({...newEmployee, dateOfJoining: e.target.value})}
                  />
                </FormField>
                
                <FormField label="Date of Exit" id="dateOfExit">
                  <Input
                    id="dateOfExit"
                    type="date"
                    value={newEmployee.dateOfExit}
                    onChange={(e) => setNewEmployee({...newEmployee, dateOfExit: e.target.value})}
                  />
                </FormField>
                
                <FormField label="Contact No." id="phone" required>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                    placeholder="Enter phone number"
                    required
                  />
                </FormField>
        
<FormField label="Blood Group" id="bloodGroup">
  <Select 
    value={newEmployee.bloodGroup || ""} 
    onValueChange={(value) => setNewEmployee({...newEmployee, bloodGroup: value === "" ? null : value})}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select blood group (optional)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="A+">A +ve</SelectItem>
      <SelectItem value="A-">A -ve</SelectItem>
      <SelectItem value="B+">B +ve</SelectItem>
      <SelectItem value="B-">B -ve</SelectItem>
      <SelectItem value="O+">O +ve</SelectItem>
      <SelectItem value="O-">O -ve</SelectItem>
      <SelectItem value="AB+">AB +ve</SelectItem>
      <SelectItem value="AB-">AB -ve</SelectItem>
    </SelectContent>
  </Select>
</FormField>
                <FormField label="Email" id="email" required>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    placeholder="Enter email address"
                    required
                  />
                </FormField>
                
                <FormField label="Aadhar Number" id="aadharNumber" required>
                  <Input
                    id="aadharNumber"
                    value={newEmployee.aadharNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, aadharNumber: e.target.value})}
                    placeholder="Enter Aadhar number"
                    required
                  />
                </FormField>
<FormField label="PAN Number" id="panNumber">
  <Input
    id="panNumber"
    value={newEmployee.panNumber}
    onChange={(e) => setNewEmployee({ ...newEmployee, panNumber: e.target.value.toUpperCase() })}
    placeholder="Enter PAN number (Optional)"
    maxLength={10}
    className="uppercase"
  />
</FormField>
                <FormField label="ESIC Number" id="esicNumber">
                  <Input
                    id="esicNumber"
                    value={newEmployee.esicNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, esicNumber: e.target.value})}
                    placeholder="Enter ESIC number"
                  />
                </FormField>

                <FormField label="PF Number / UAN" id="uanNumber">
                  <Input
                    id="uanNumber"
                    value={newEmployee.uanNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, uanNumber: e.target.value})}
                    placeholder="Enter PF number or UAN"
                  />
                </FormField>

                <FormField label="Gender" id="gender">
                  <Select 
                    value={newEmployee.gender} 
                    onValueChange={(value) => setNewEmployee({...newEmployee, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Transgender">Transgender</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Marital Status" id="maritalStatus">
                  <Select 
                    value={newEmployee.maritalStatus} 
                    onValueChange={(value) => setNewEmployee({...newEmployee, maritalStatus: value})}
                  >
                    <SelectTrigger>
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
                </FormField>
              </div>
              
              <FormField label="Permanent Address" id="permanentAddress">
                <Textarea
                  id="permanentAddress"
                  value={newEmployee.permanentAddress}
                  onChange={(e) => setNewEmployee({...newEmployee, permanentAddress: e.target.value})}
                  placeholder="Enter permanent address"
                  rows={3}
                />
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Pin Code" id="permanentPincode">
                  <Input
                    id="permanentPincode"
                    value={newEmployee.permanentPincode}
                    onChange={(e) => setNewEmployee({...newEmployee, permanentPincode: e.target.value})}
                    placeholder="Enter pin code"
                  />
                </FormField>
              </div>
              
              <FormField label="Local Address" id="localAddress">
                <Textarea
                  id="localAddress"
                  value={newEmployee.localAddress}
                  onChange={(e) => setNewEmployee({...newEmployee, localAddress: e.target.value})}
                  placeholder="Enter local address"
                  rows={3}
                />
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Pin Code" id="localPincode">
                  <Input
                    id="localPincode"
                    value={newEmployee.localPincode}
                    onChange={(e) => setNewEmployee({...newEmployee, localPincode: e.target.value})}
                    placeholder="Enter pin code"
                  />
                </FormField>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Bank Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Bank Name" id="bankName">
                  <Input
                    id="bankName"
                    value={newEmployee.bankName}
                    onChange={(e) => setNewEmployee({...newEmployee, bankName: e.target.value})}
                    placeholder="Enter bank name"
                  />
                </FormField>
                
                <FormField label="Account Number" id="accountNumber">
                  <Input
                    id="accountNumber"
                    value={newEmployee.accountNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, accountNumber: e.target.value})}
                    placeholder="Enter account number"
                  />
                </FormField>
                
               
<FormField label="IFSC Code" id="ifscCode">
  <Input
    id="ifscCode"
    value={newEmployee.ifscCode}
    onChange={(e) => setNewEmployee({ ...newEmployee, ifscCode: e.target.value.toUpperCase() })}
    placeholder="Enter IFSC code (Optional)"
    className="uppercase"
  />
</FormField>
                
                <FormField label="Branch Name" id="branchName">
                  <Input
                    id="branchName"
                    value={newEmployee.branchName}
                    onChange={(e) => setNewEmployee({...newEmployee, branchName: e.target.value})}
                    placeholder="Enter branch name"
                  />
                </FormField>
              </div>
            </div>

            {/* Family Details for ESIC Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Family Details for ESIC</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Father's Name" id="fatherName">
                  <Input
                    id="fatherName"
                    value={newEmployee.fatherName}
                    onChange={(e) => setNewEmployee({...newEmployee, fatherName: e.target.value})}
                    placeholder="Enter father's name"
                  />
                </FormField>
                
                <FormField label="Mother's Name" id="motherName">
                  <Input
                    id="motherName"
                    value={newEmployee.motherName}
                    onChange={(e) => setNewEmployee({...newEmployee, motherName: e.target.value})}
                    placeholder="Enter mother's name"
                  />
                </FormField>
                
                <FormField label="Spouse Name" id="spouseName">
                  <Input
                    id="spouseName"
                    value={newEmployee.spouseName}
                    onChange={(e) => setNewEmployee({...newEmployee, spouseName: e.target.value})}
                    placeholder="Enter spouse name"
                  />
                </FormField>
                
                <FormField label="Number of Children" id="numberOfChildren">
                  <Input
                    id="numberOfChildren"
                    type="number"
                    value={newEmployee.numberOfChildren}
                    onChange={(e) => setNewEmployee({...newEmployee, numberOfChildren: e.target.value})}
                    placeholder="Enter number of children"
                    min="0"
                  />
                </FormField>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Emergency Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Emergency Contact Name" id="emergencyContactName">
                  <Input
                    id="emergencyContactName"
                    value={newEmployee.emergencyContactName}
                    onChange={(e) => setNewEmployee({...newEmployee, emergencyContactName: e.target.value})}
                    placeholder="Enter emergency contact name"
                  />
                </FormField>
                
                <FormField label="Emergency Contact Phone" id="emergencyContactPhone">
                  <Input
                    id="emergencyContactPhone"
                    value={newEmployee.emergencyContactPhone}
                    onChange={(e) => setNewEmployee({...newEmployee, emergencyContactPhone: e.target.value})}
                    placeholder="Enter emergency contact phone"
                  />
                </FormField>
                
                <FormField label="Relation" id="emergencyContactRelation">
                  <Input
                    id="emergencyContactRelation"
                    value={newEmployee.emergencyContactRelation}
                    onChange={(e) => setNewEmployee({...newEmployee, emergencyContactRelation: e.target.value})}
                    placeholder="Enter relation"
                  />
                </FormField>
              </div>
            </div>

            {/* Nominee Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Nominee Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Nominee Name" id="nomineeName">
                  <Input
                    id="nomineeName"
                    value={newEmployee.nomineeName}
                    onChange={(e) => setNewEmployee({...newEmployee, nomineeName: e.target.value})}
                    placeholder="Enter nominee name"
                  />
                </FormField>
                
                <FormField label="Nominee Relation" id="nomineeRelation">
                  <Input
                    id="nomineeRelation"
                    value={newEmployee.nomineeRelation}
                    onChange={(e) => setNewEmployee({...newEmployee, nomineeRelation: e.target.value})}
                    placeholder="Enter nominee relation"
                  />
                </FormField>
              </div>
            </div>

            {/* Uniform Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Uniform Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Pant Size" id="pantSize">
                  <Select value={newEmployee.pantSize} onValueChange={(value) => setNewEmployee({...newEmployee, pantSize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pant size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="28">28</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="32">32</SelectItem>
                      <SelectItem value="34">34</SelectItem>
                      <SelectItem value="36">36</SelectItem>
                      <SelectItem value="38">38</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Shirt Size" id="shirtSize">
                  <Select value={newEmployee.shirtSize} onValueChange={(value) => setNewEmployee({...newEmployee, shirtSize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shirt size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Cap Size" id="capSize">
                  <Select value={newEmployee.capSize} onValueChange={(value) => setNewEmployee({...newEmployee, capSize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cap size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="idCardIssued"
                    checked={newEmployee.idCardIssued}
                    onChange={(e) => setNewEmployee({...newEmployee, idCardIssued: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="idCardIssued">ID Card Issued</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="westcoatIssued"
                    checked={newEmployee.westcoatIssued}
                    onChange={(e) => setNewEmployee({...newEmployee, westcoatIssued: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="westcoatIssued">Westcoat Issued</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="apronIssued"
                    checked={newEmployee.apronIssued}
                    onChange={(e) => setNewEmployee({...newEmployee, apronIssued: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="apronIssued">Apron Issued</Label>
                </div>
              </div>
            </div>

            {/* Employment Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Employment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField label="Department" id="department" required>
                  <Select 
                    value={newEmployee.department} 
                    onValueChange={(value) => setNewEmployee({...newEmployee, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Position" id="position" required>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    placeholder="Enter position"
                    required
                  />
                </FormField>
                
                <FormField label="Monthly Salary (₹)" id="salary" required>
                  <Input
                    id="salary"
                    type="number"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                    placeholder="Enter monthly salary"
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Signatures</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-4">
                  <FormField label="Employee Signature" id="employeeSignature">
                    <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                      <FileText className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload employee signature
                      </p>
                      <Input
                        ref={signatureEmployeeRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSignatureUpload('employee', e)}
                        className="hidden"
                        id="employee-signature-upload"
                      />
                      <Label htmlFor="employee-signature-upload">
                        <Button 
                          variant="outline" 
                          className="mt-4" 
                          onClick={() => signatureEmployeeRef.current?.click()}
                        >
                          Upload Signature
                        </Button>
                      </Label>
                      {newEmployee.employeeSignature && (
                        <p className="mt-2 text-sm text-green-600">
                          Signature uploaded
                        </p>
                      )}
                    </div>
                  </FormField>
                </div>
                
                <div className="space-y-4">
                  <FormField label="Authorized Signature" id="authorizedSignature">
                    <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                      <FileText className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload authorized signature
                      </p>
                      <Input
                        ref={signatureAuthorizedRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSignatureUpload('authorized', e)}
                        className="hidden"
                        id="authorized-signature-upload"
                      />
                      <Label htmlFor="authorized-signature-upload">
                        <Button 
                          variant="outline" 
                          className="mt-4" 
                          onClick={() => signatureAuthorizedRef.current?.click()}
                        >
                          Upload Signature
                        </Button>
                      </Label>
                      {newEmployee.authorizedSignature && (
                        <p className="mt-2 text-sm text-green-600">
                          Signature uploaded
                        </p>
                      )}
                    </div>
                  </FormField>
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Document Upload</h3>
              
              <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                <Upload className="mx-auto h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop documents here or click to browse
                </p>
                <Input
                  ref={documentUploadRef}
                  type="file"
                  multiple
                  onChange={handleDocumentUpload}
                  className="hidden"
                  id="document-upload"
                />
                <Label htmlFor="document-upload">
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => documentUploadRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </Label>
              </div>
              
              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{doc.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Required Documents</Label>
                <div className="text-sm text-muted-foreground space-y-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                  <div>• Aadhar Card</div>
                  <div>• PAN Card</div>
                  <div>• Educational Certificates</div>
                  <div>• Experience Letters</div>
                  <div>• Bank Details</div>
                  <div>• Passport Size Photo</div>
                  <div>• ESIC Family Details</div>
                  <div>• PF/ESIC Documents</div>
                </div>
              </div>
            </div>

            <Button onClick={handleAddEmployee} className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Employee...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTab;