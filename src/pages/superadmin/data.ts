// Types
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
  size: number;
  type: string;
}

export interface HourlyUpdate {
  id: string;
  timestamp: string;
  content: string;
  submittedBy: string;
}

export interface Task {
  category: string;
  type: any;
  notes: any;
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  deadline: string;
  dueDateTime: string;
  siteId: string;
  attachments: Attachment[];
  hourlyUpdates: HourlyUpdate[];
}

// Update your Site interface to include staffDeployment
export interface Site {
  issues: number;
  id: string;
  name: string;
  clientName: string;
  location: string;
  areaSqft: number;
  siteManager: string;
  managerPhone: string;
  supervisor: string;
  supervisorPhone: string;
  contractValue: number;
  contractEndDate: string;
  services: string[];
  staffDeployment?: Array<{
    role: string;
    count: number;
  }>;
  status: "active" | "inactive";
}

export interface Service {
  id: string;
  name: string;
  status: "operational" | "maintenance" | "down";
  lastChecked: string;
  assignedTeam: string;
}

export interface RosterEntry {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  attendance: "present" | "absent" | "half-day";
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  supervisor: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved";
  date: string; // Format: "YYYY-MM-DD HH:mm"
  reportedBy: string;
  site: string;
  photos?: string[]; // Base64 strings or URLs
  assignedTo?: string;
}

// Dummy Data
export const initialSites: Site[] = [
  {
    id: "1",
    name: "Commercial Complex A",
    clientName: "ABC Corporation",
    location: "Downtown",
    areaSqft: 50000,
    siteManager: "John Doe",
    managerPhone: "+91 9876543210",
    supervisor: "Mike Johnson",
    supervisorPhone: "+91 9876543211",
    contractValue: 2500000,
    contractEndDate: "2024-12-31",
    services: ["Security", "Housekeeping", "Parking", "Maintenance"],
    staffDeployment: [
      { role: "Security Guard", count: 8 },
      { role: "Housekeeping", count: 6 },
      { role: "Supervisor", count: 2 },
      { role: "Parking Attendant", count: 3 }
    ],
    status: "active"
  },
  {
    id: "2",
    name: "Residential Tower B",
    clientName: "XYZ Builders",
    location: "Uptown",
    areaSqft: 35000,
    siteManager: "Jane Smith",
    managerPhone: "+91 9876543212",
    supervisor: "Sarah Wilson",
    supervisorPhone: "+91 9876543213",
    contractValue: 1800000,
    contractEndDate: "2024-11-30",
    services: ["Security", "Housekeeping", "Waste Management"],
    staffDeployment: [
      { role: "Security Guard", count: 6 },
      { role: "Housekeeping", count: 4 },
      { role: "Supervisor", count: 1 }
    ],
    status: "active"
  },
  {
    id: "3",
    name: "IT Park Center",
    clientName: "Tech Solutions Ltd",
    location: "Tech Park",
    areaSqft: 75000,
    siteManager: "Robert Brown",
    managerPhone: "+91 9876543214",
    supervisor: "Emily Davis",
    supervisorPhone: "+91 9876543215",
    contractValue: 3200000,
    contractEndDate: "2025-01-31",
    services: ["Security", "Housekeeping", "Parking", "STP Tank Cleaning", "Maintenance"],
    staffDeployment: [
      { role: "Security Guard", count: 12 },
      { role: "Housekeeping", count: 8 },
      { role: "Supervisor", count: 3 },
      { role: "Parking Attendant", count: 4 },
      { role: "STP Operator", count: 2 }
    ],
    status: "active"
  }
];

export const initialTasks: Task[] = [
  {
    id: "1",
    title: "Site Inspection",
    description: "Complete site inspection for safety compliance",
    assignedTo: "manager-a",
    priority: "high",
    status: "pending",
    deadline: "2024-01-15",
    dueDateTime: "2024-01-15T14:00:00",
    siteId: "1",
    attachments: [
      {
        id: "att1",
        filename: "safety_checklist.pdf",
        url: "#",
        uploadedAt: "2024-01-10T09:30:00",
        size: 2048000,
        type: "application/pdf"
      },
      {
        id: "att2",
        filename: "site_photos.zip",
        url: "#",
        uploadedAt: "2024-01-10T10:15:00",
        size: 5120000,
        type: "application/zip"
      }
    ],
    hourlyUpdates: [
      {
        id: "update1",
        timestamp: "2024-01-10T10:00:00",
        content: "Started site inspection. Checking safety equipment.",
        submittedBy: "manager-a"
      },
      {
        id: "update2",
        timestamp: "2024-01-10T12:00:00",
        content: "Completed 50% of inspection. All fire extinguishers checked and verified.",
        submittedBy: "manager-a"
      }
    ]
  },
  {
    id: "2",
    title: "Equipment Maintenance",
    description: "Regular maintenance of security equipment",
    assignedTo: "supervisor-a",
    priority: "medium",
    status: "in-progress",
    deadline: "2024-01-20",
    dueDateTime: "2024-01-20T16:00:00",
    siteId: "1",
    attachments: [
      {
        id: "att3",
        filename: "maintenance_schedule.xlsx",
        url: "#",
        uploadedAt: "2024-01-12T11:20:00",
        size: 512000,
        type: "application/vnd.ms-excel"
      }
    ],
    hourlyUpdates: [
      {
        id: "update3",
        timestamp: "2024-01-12T09:00:00",
        content: "Started maintenance work. Checking CCTV cameras.",
        submittedBy: "supervisor-a"
      }
    ]
  },
  {
    id: "3",
    title: "Staff Training",
    description: "Conduct safety training for new staff",
    assignedTo: "supervisor-b",
    priority: "low",
    status: "completed",
    deadline: "2024-01-10",
    dueDateTime: "2024-01-10T15:00:00",
    siteId: "2",
    attachments: [
      {
        id: "att4",
        filename: "training_materials.pdf",
        url: "#",
        uploadedAt: "2024-01-09T14:45:00",
        size: 1536000,
        type: "application/pdf"
      },
      {
        id: "att5",
        filename: "attendance_sheet.pdf",
        url: "#",
        uploadedAt: "2024-01-10T16:30:00",
        size: 256000,
        type: "application/pdf"
      }
    ],
    hourlyUpdates: [
      {
        id: "update4",
        timestamp: "2024-01-10T09:00:00",
        content: "Training session started. 15 new staff members attending.",
        submittedBy: "supervisor-b"
      },
      {
        id: "update5",
        timestamp: "2024-01-10T11:00:00",
        content: "Completed first module - Basic Safety Procedures.",
        submittedBy: "supervisor-b"
      },
      {
        id: "update6",
        timestamp: "2024-01-10T14:00:00",
        content: "Training completed successfully. All participants passed the assessment.",
        submittedBy: "supervisor-b"
      }
    ]
  },
  {
    id: "4",
    title: "Security Audit",
    description: "Monthly security audit and report generation",
    assignedTo: "supervisor-a",
    priority: "high",
    status: "pending",
    deadline: "2024-01-18",
    dueDateTime: "2024-01-18T10:00:00",
    siteId: "2",
    attachments: [],
    hourlyUpdates: []
  },
  {
    id: "5",
    title: "Parking System Check",
    description: "Inspect and test parking management system",
    assignedTo: "manager-b",
    priority: "medium",
    status: "in-progress",
    deadline: "2024-01-22",
    dueDateTime: "2024-01-22T09:00:00",
    siteId: "3",
    attachments: [
      {
        id: "att6",
        filename: "parking_system_diagram.pdf",
        url: "#",
        uploadedAt: "2024-01-15T10:10:00",
        size: 1024000,
        type: "application/pdf"
      }
    ],
    hourlyUpdates: [
      {
        id: "update7",
        timestamp: "2024-01-15T08:00:00",
        content: "Started parking system inspection. Checking entry/exit gates.",
        submittedBy: "manager-b"
      },
      {
        id: "update8",
        timestamp: "2024-01-15T11:00:00",
        content: "Completed 40% of inspection. Payment systems working properly.",
        submittedBy: "manager-b"
      }
    ]
  },
  {
    id: "6",
    title: "Emergency Drill",
    description: "Conduct emergency evacuation drill",
    assignedTo: "manager-c",
    priority: "high",
    status: "pending",
    deadline: "2024-01-25",
    dueDateTime: "2024-01-25T11:00:00",
    siteId: "3",
    attachments: [],
    hourlyUpdates: []
  },
  {
    id: "7",
    title: "Waste Management Review",
    description: "Review waste collection and disposal procedures",
    assignedTo: "supervisor-c",
    priority: "medium",
    status: "in-progress",
    deadline: "2024-01-19",
    dueDateTime: "2024-01-19T14:00:00",
    siteId: "2",
    attachments: [
      {
        id: "att7",
        filename: "waste_management_report.pdf",
        url: "#",
        uploadedAt: "2024-01-16T09:45:00",
        size: 768000,
        type: "application/pdf"
      }
    ],
    hourlyUpdates: [
      {
        id: "update9",
        timestamp: "2024-01-16T09:00:00",
        content: "Started waste management review. Checking current procedures.",
        submittedBy: "supervisor-c"
      }
    ]
  }
];

export const serviceTypes: Service[] = [
  {
    id: "1",
    name: "Security Services",
    status: "operational",
    lastChecked: "2024-01-12",
    assignedTeam: "Alpha Team"
  },
  {
    id: "2",
    name: "Housekeeping",
    status: "maintenance",
    lastChecked: "2024-01-11",
    assignedTeam: "Beta Team"
  },
  {
    id: "3",
    name: "Parking Management",
    status: "operational",
    lastChecked: "2024-01-12",
    assignedTeam: "Gamma Team"
  },
  {
    id: "4",
    name: "Waste Management",
    status: "down",
    lastChecked: "2024-01-10",
    assignedTeam: "Delta Team"
  },
  {
    id: "5",
    name: "STP Tank Cleaning",
    status: "operational",
    lastChecked: "2024-01-09",
    assignedTeam: "Epsilon Team"
  },
  {
    id: "6",
    name: "Maintenance",
    status: "maintenance",
    lastChecked: "2024-01-12",
    assignedTeam: "Zeta Team"
  }
];

export const rosterTypes = ["daily", "weekly", "fortnightly", "monthly"];

export const staffMembers = [
  { id: "staff-1", name: "Rajesh Kumar", role: "Security Guard", employeeId: "EMP001" },
  { id: "staff-2", name: "Priya Sharma", role: "Housekeeping", employeeId: "EMP002" },
  { id: "staff-3", name: "Amit Patel", role: "Supervisor", employeeId: "EMP003" },
  { id: "staff-4", name: "Sunita Reddy", role: "Security Guard", employeeId: "EMP004" },
  { id: "staff-5", name: "Mohan Das", role: "Housekeeping", employeeId: "EMP005" },
  { id: "staff-6", name: "Anjali Singh", role: "Parking Attendant", employeeId: "EMP006" },
  { id: "staff-7", name: "Vikram Mehta", role: "STP Operator", employeeId: "EMP007" },
  { id: "staff-8", name: "Neha Gupta", role: "Security Guard", employeeId: "EMP008" },
  { id: "staff-9", name: "Rahul Sharma", role: "Supervisor", employeeId: "EMP009" },
  { id: "staff-10", name: "Sonia Verma", role: "Housekeeping", employeeId: "EMP010" }
];

export const assignees = [
  { id: "manager-a", name: "John Doe" },
  { id: "manager-b", name: "Jane Smith" },
  { id: "manager-c", name: "Robert Brown" },
  { id: "supervisor-a", name: "Mike Johnson" },
  { id: "supervisor-b", name: "Sarah Wilson" },
  { id: "supervisor-c", name: "Emily Davis" }
];

export const supervisors = [
  { id: "1", name: "Mike Johnson" },
  { id: "2", name: "Sarah Wilson" },
  { id: "3", name: "Robert Brown" },
  { id: "4", name: "Emily Davis" }
];

export const initialRoster: RosterEntry[] = [
  { 
    id: "1", 
    date: "2024-01-15", 
    employeeName: "Rajesh Kumar",
    employeeId: "EMP001",
    designation: "Security Guard",
    shift: "Morning",
    shiftTiming: "09:00-17:00",
    assignedTask: "Security Patrol", 
    attendance: "present", 
    hours: 8, 
    remark: "Regular duty completed",
    type: "daily",
    siteClient: "Commercial Complex A - ABC Corporation",
    supervisor: "Mike Johnson"
  },
  { 
    id: "2", 
    date: "2024-01-15", 
    employeeName: "Priya Sharma",
    employeeId: "EMP002",
    designation: "Housekeeping",
    shift: "Evening",
    shiftTiming: "13:00-21:00",
    assignedTask: "Cleaning - Floor 1", 
    attendance: "present", 
    hours: 8, 
    remark: "All areas cleaned",
    type: "daily",
    siteClient: "Commercial Complex A - ABC Corporation",
    supervisor: "Mike Johnson"
  },
  { 
    id: "3", 
    date: "2024-01-15", 
    employeeName: "Amit Patel",
    employeeId: "EMP003",
    designation: "Supervisor",
    shift: "Morning",
    shiftTiming: "08:00-16:00",
    assignedTask: "Site Supervision", 
    attendance: "present", 
    hours: 8, 
    remark: "Supervised security team",
    type: "daily",
    siteClient: "Residential Tower B - XYZ Builders",
    supervisor: "Sarah Wilson"
  },
  { 
    id: "4", 
    date: "2024-01-15", 
    employeeName: "Sunita Reddy",
    employeeId: "EMP004",
    designation: "Security Guard",
    shift: "Night",
    shiftTiming: "21:00-05:00",
    assignedTask: "Gate Security", 
    attendance: "present", 
    hours: 8, 
    remark: "Gate duty completed",
    type: "daily",
    siteClient: "IT Park Center - Tech Solutions Ltd",
    supervisor: "Robert Brown"
  }
];

export const initialAlerts: Alert[] = [
  { 
    id: "1", 
    title: "Security Camera Offline", 
    severity: "high", 
    status: "open", 
    date: "2024-01-12" 
  },
  { 
    id: "2", 
    title: "Parking System Maintenance", 
    severity: "medium", 
    status: "in-progress", 
    date: "2024-01-11" 
  },
  { 
    id: "3", 
    title: "Waste Collection Delay", 
    severity: "low", 
    status: "resolved", 
    date: "2024-01-10" 
  },
  { 
    id: "4", 
    title: "STP Pump Failure", 
    severity: "critical", 
    status: "open", 
    date: "2024-01-13" 
  },
  { 
    id: "5", 
    title: "Fire Safety Equipment Check", 
    severity: "medium", 
    status: "in-progress", 
    date: "2024-01-12" 
  }
];