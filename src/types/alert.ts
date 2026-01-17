export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved";
  date: string; // Format:  "YYYY-MM-DD HH:mm"
  reportedBy: string;
  site: string;
  photos: string[];
  assignedTo: string;
  createdAt?: string;
  updatedAt?: string;
  }

export interface CreateAlertData {
  title: string;
  description: string;
  severity: Alert["severity"];
  site: string;
  reportedBy: string;
  assignedTo: string;
  date: string;
  photos: string[];
}

export interface UpdateAlertData extends Partial<CreateAlertData> 
 { 
  status?: Alert["status"];
}

export interface AlertsResponse {
  success: boolean;
  data: Alert[];
  total: number;
  message?: string;
}

export interface AlertStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}
