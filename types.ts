export enum Role {
  ADMIN = 'Administrator',
  GM = 'General Manager',
  BOM = 'HR Business Office Manager',
  ShopManager = 'Shop Manager',
  ServiceAdvisor = 'Service Advisor',
  LeadTech = 'Lead Diagnostic Technician',
  Mechanic = 'General Service Mechanic',
  Technician = 'General Service Technician',
  Support = 'Support Staff'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  password?: string;
  avatar: string;
  eligibleLocationIds: string[]; 
}

export interface Location {
  id: string;
  name: string;
  calendarId: string;
}

export interface Shift {
  id: string;
  userId: string;
  locationId: string;
  start: string;
  end: string;
  title: string;
  locked: boolean;
}

export interface TemplateShift {
  userId: string;
  dayOffset: number; // 0 for start of week, 6 for end
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  title: string;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  locationId: string;
  shifts: TemplateShift[];
}

export enum RequestType {
  TIME_OFF = 'Time Off',
  SWAP = 'Shift Swap',
  MODIFICATION = 'Schedule Change',
  CALLED_OUT = 'Called Out'
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface ChangeRequest {
  id: string;
  requesterId: string;
  type: RequestType;
  details: string;
  targetDate: string;
  endDate?: string;
  inTime?: string; // Updated
  outTime?: string; // New
  timeBlock?: string;
  payType?: 'Paid' | 'Unpaid';
  status: RequestStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  content: string;
  sentAt: string;
  type: 'EMAIL' | 'SYSTEM';
}

export interface AppState {
  users: User[];
  deletedUsers?: User[];
  locations: Location[];
  shifts: Shift[];
  templates: ScheduleTemplate[];
  requests: ChangeRequest[];
  notifications: Notification[];
  currentUser: User;
}

export type NotificationChannel = 'EMAIL' | 'SLACK' | 'CALENDAR';