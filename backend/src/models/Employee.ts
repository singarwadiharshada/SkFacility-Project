import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  // Basic Information
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  
  // Personal Details
  dateOfBirth?: Date;
  dateOfJoining: Date;
  dateOfExit?: Date;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
   bankBranch?: string;
  
  // Bank Details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  
  // Family Details
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: number;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Nominee Details
  nomineeName?: string;
  nomineeRelation?: string;
  
  // Employment Details
  department: string;
  position: string;
  siteName?: string;
  salary: number;
  status: 'active' | 'inactive' | 'left';
  role?: string;
  
  // Uniform Details
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  
  // Issued Items
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  
  // Documents
  photo?: string; // Base64 or URL
  employeeSignature?: string;
  authorizedSignature?: string;
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    // Basic Information
    employeeId: {
      type: String,
      required: false, // Changed from true to false, will be auto-generated
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    aadharNumber: {
      type: String,
      required: [true, 'Aadhar number is required'],
      unique: true,
      trim: true,
      minlength: [12, 'Aadhar number must be 12 digits'],
      maxlength: [12, 'Aadhar number must be 12 digits']
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      // Make PAN validation optional since not everyone has PAN
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$|^$/, 'Please enter a valid PAN or leave empty']
    },
    esicNumber: {
      type: String,
      trim: true
    },
    uanNumber: {
      type: String,
      trim: true
    },
    
    // Personal Details
    dateOfBirth: {
      type: Date
    },
    dateOfJoining: {
      type: Date,
      required: [true, 'Date of joining is required'],
      default: Date.now
    },
    dateOfExit: {
      type: Date
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', null],
      default: null
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', null],
      default: null
    },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Widow', 'Widower', 'Divorcee', null],
      default: null
    },
    
    // Address
    permanentAddress: {
      type: String,
      trim: true
    },
    permanentPincode: {
      type: String,
      trim: true,
      match: [/^[1-9][0-9]{5}$|^$/, 'Please enter a valid pincode or leave empty']
    },
    localAddress: {
      type: String,
      trim: true
    },
    localPincode: {
      type: String,
      trim: true,
      match: [/^[1-9][0-9]{5}$|^$/, 'Please enter a valid pincode or leave empty']
    },
    
    // Bank Details
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      // Make IFSC validation optional
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$|^$/, 'Please enter a valid IFSC code or leave empty']
    },
    branchName: {
      type: String,
      trim: true
    },
    
    // Family Details
    fatherName: {
      type: String,
      trim: true
    },
    motherName: {
      type: String,
      trim: true
    },
    spouseName: {
      type: String,
      trim: true
    },
    numberOfChildren: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true
    },
    emergencyContactPhone: {
      type: String,
      trim: true
    },
    emergencyContactRelation: {
      type: String,
      trim: true
    },
    
    // Nominee Details
    nomineeName: {
      type: String,
      trim: true
    },
    nomineeRelation: {
      type: String,
      trim: true
    },
    
    // Employment Details
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: [
        'Housekeeping Management',
        'Security Management',
        'Parking Management',
        'Waste Management',
        'STP Tank Cleaning',
        'Consumables Management',
        'Administration',
        'HR',
        'Finance',
        'IT',
        'Operations',
        'Maintenance',
        'General'
      ]
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true
    },
    siteName: {
      type: String,
      trim: true
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active'
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'supervisor', 'employee', null],
      default: 'employee'
    },
       bankBranch: {
      type: String,
      trim: true
    },
    
    // Uniform Details
    pantSize: {
      type: String,
      enum: ['28', '30', '32', '34', '36', '38', '40', null],
      default: null
    },
    shirtSize: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', 'XXL', null],
      default: null
    },
    capSize: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', null],
      default: null
    },
    
    // Issued Items
    idCardIssued: {
      type: Boolean,
      default: false
    },
    westcoatIssued: {
      type: Boolean,
      default: false
    },
    apronIssued: {
      type: Boolean,
      default: false
    },
    
    // Documents (store as base64 or file paths)
    photo: {
      type: String // Base64 string or file path
    },
    employeeSignature: {
      type: String // Base64 string or file path
    },
    authorizedSignature: {
      type: String // Base64 string or file path
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate employeeId before saving
EmployeeSchema.pre('save', async function (next) {
  const employee = this as IEmployee;
  
  // Only generate employeeId if it doesn't exist
  if (!employee.employeeId) {
    // Find the last employee to generate sequential ID
    const lastEmployee = await mongoose.model('Employee').findOne().sort({ createdAt: -1 });
    let lastNumber = 0;
    
    if (lastEmployee && lastEmployee.employeeId) {
      const matches = lastEmployee.employeeId.match(/EMP(\d+)/);
      if (matches && matches[1]) {
        lastNumber = parseInt(matches[1]);
      }
    }
    
    employee.employeeId = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
  }
  
  next();
});

// Indexes for better query performance
EmployeeSchema.index({ email: 1 }, { unique: true });
EmployeeSchema.index({ aadharNumber: 1 }, { unique: true });
EmployeeSchema.index({ employeeId: 1 }, { unique: true });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ dateOfJoining: -1 });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);