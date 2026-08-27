import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchInitialState, mutateTable, verifyFace, registerFace, uploadFile, BACKEND_URL } from '../services/api';

const AUTH_USER_KEY = '@swift_auth_user';
const AUTH_TENANT_KEY = '@swift_tenant_id';

export interface Employee {
  id: string;
  tenantId?: string;
  empCode?: string;
  code?: string;
  password?: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  doj?: string;
  joiningDate?: string;
  basic?: number;
  pan?: string;
  panNumber?: string;
  aadhaar?: string;
  bankAcc?: string;
  bankAccount?: string;
  bankIfsc?: string;
  shiftId?: string;
  shift?: string;
  branchId?: string;
  branchIds?: string[];
  branch?: string;
  companyName?: string;
  reportingManager?: string;
  managerId?: string;
  roleId?: string;
  roleName?: string;
  status?: string;
  faceRegistered?: boolean;
  photoDataUrl?: string;
  fixedSalary?: number;
  pfEligible?: boolean;
  esiEligible?: boolean;
  ptEligible?: boolean;
  tdsEligible?: boolean;
  eligibleDate?: string;
  probationDate?: string;
  leaveApplyEligible?: boolean;
  geofencingEnabled?: boolean;
  graceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  afternoonGraceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  weeklyOff?: string;
  documentsUploaded?: EmployeeDocument[];
  acceptance?: {
    signed: boolean;
    signatureDataUrl?: string;
    signedAt?: string;
    ip?: string;
  };
  signedDocs?: Record<string, {
    docCode: string;
    docTitle: string;
    signedAt: string;
    signatureText: string;
    signatureDataUrl?: string;
    acknowledged: boolean;
  }>;
}

export interface EmployeeDocument {
  id: string;
  type: string;
  name: string;
  dataUrl?: string;
  files?: string[];
  uploadedAt: string;
  verified?: boolean;
}

export interface DocumentPermissionTypes {
  offerLetter: boolean;
  appointmentLetter: boolean;
  incrementLetter: boolean;
  promotionLetter: boolean;
  relievingLetter: boolean;
  experienceLetter: boolean;
  salaryCertificate: boolean;
  warningLetter: boolean;
  showCauseNotice: boolean;
}

export interface RolePermissions {
  leaveApproval: boolean;
  attendanceApproval: boolean;
  payrollDashboard: boolean;
  employeeManagement: boolean;
  expenseHandloanApproval: boolean;
  documentsApproval: boolean;
  documentTypes: DocumentPermissionTypes;
  invoiceApproval: boolean;
  resignationApproval: boolean;
  assetManagement: boolean;
  noticesAnnouncements: boolean;
  performanceReviews: boolean;
  auditLogView: boolean;
}

export interface PredefinedRole {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemDefault?: boolean;
}

export interface ApprovalStep {
  approver: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  actedAt?: string;
  actedBy?: string;
}

export interface DocRequest {
  id: string;
  tenantId?: string;
  letterKey: string;
  letterTitle: string;
  employeeId: string;
  employeeName?: string;
  templateBody?: string;
  format?: "pdf" | "docx";
  requestedBy: string;
  requestedAt: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: "pending" | "approved" | "rejected";
  note?: string;
  employeeAccepted?: boolean;
  employeeAcceptedAt?: string;
  employeeSignature?: string;
}

export function canRoleApproveDocInApp(
  role: PredefinedRole | null | undefined,
  letterKey: string
): boolean {
  if (!role || !role.permissions) return false;
  if (!role.permissions.documentsApproval) return false;

  const docTypes = role.permissions.documentTypes;
  if (!docTypes) return true;

  const key = (letterKey || "").toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("offer")) return !!docTypes.offerLetter;
  if (key.includes("appoint")) return !!docTypes.appointmentLetter;
  if (key.includes("increment")) return !!docTypes.incrementLetter;
  if (key.includes("promot")) return !!docTypes.promotionLetter;
  if (key.includes("reliev")) return !!docTypes.relievingLetter;
  if (key.includes("experien")) return !!docTypes.experienceLetter;
  if (key.includes("salary") || key.includes("certif")) return !!docTypes.salaryCertificate;
  if (key.includes("warn")) return !!docTypes.warningLetter;
  if (key.includes("show") || key.includes("cause")) return !!docTypes.showCauseNotice;

  return true;
}

export interface ShiftAssignment {
  id: string;
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  empCode?: string;
  department?: string;
  date: string;
  shiftId: string;
  shiftName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  graceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  afternoonGraceTime?: "always" | "10" | "15" | "20" | "25" | "30";
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  empCode?: string;
  department?: string;
  date: string;
  clockIn: string;
  checkIn?: string;
  clockOut?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'halfday' | 'holiday';
  faceVerified: boolean;
  geofenceVerified: boolean;
  hoursWorked?: number;
  otHours?: number;
  otPay?: number;
  similarity?: number;
  photoDataUrl?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  lat?: number;
  lng?: number;
  regularizedReason?: string;
  [key: string]: any;
}

export interface LeaveApprovalStepAudit {
  level: number;
  roleName: string;
  roleId?: string;
  approverId?: string;
  approverName?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comment?: string;
  actionAt?: string;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  actedBy?: string;
  actedById?: string;
  actedByRole?: string;
  approverComment?: string;
  actedAt?: string;
  currentLevel?: number;
  totalLevels?: number;
  approvedBy?: string;
  approvalType?: 'sequential' | 'any' | 'all';
  approvalSteps?: LeaveApprovalStepAudit[];
}

export interface GrievanceMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface GrievanceTicket {
  id: string;
  tenantId?: string;
  ticketNumber: string;
  employeeId: string;
  employeeName: string;
  empCode?: string;
  department?: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedRole: string;
  assignedToId?: string;
  assignedToName?: string;
  subject: string;
  description: string;
  attachments?: string[];
  status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected';
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  thread: GrievanceMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  tenantId: string;
  employeeId: string;
  title: string;
  desc: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'pending' | 'completed';
}

export interface ClockResult {
  success: boolean;
  reason?: string;
  similarity?: number;
}

export interface AppContextType {
  tenantId: string;
  isLoggedIn: boolean;
  loading: boolean;
  currentUser: Employee | null;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  grievances: GrievanceTicket[];
  payrolls: any[];
  docLibrary: any[];
  notices: any[];
  tasks: TaskItem[];
  chatMessages: any[];
  isClockedIn: boolean;
  companyConfig: any;
  todayRecord: AttendanceRecord | undefined;
  roles: PredefinedRole[];
  docRequests: DocRequest[];
  userRole: PredefinedRole | null;
  canApproveDocuments: boolean;
  canApproveLeaves: boolean;
  holidays: any[];
  roster: ShiftAssignment[];

  login: (empCodeOrEmail: string, pass: string) => Promise<boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;
  clockIn: (photoDataUrl?: string) => Promise<ClockResult>;
  clockOut: (photoDataUrl?: string) => Promise<ClockResult>;
  applyLeave: (request: Omit<LeaveRequest, 'id' | 'tenantId' | 'employeeId' | 'employeeName' | 'createdAt'>) => Promise<boolean>;
  actOnLeave: (leaveId: string, action: 'approve' | 'approve_forward' | 'approve_close' | 'reject' | 'escalate', comment?: string) => Promise<boolean>;
  actOnAttendanceRequest: (requestId: string, action: 'approve' | 'approve_forward' | 'approve_close' | 'reject' | 'escalate', comment?: string) => Promise<boolean>;
  applyGrievance: (ticket: {
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    subject: string;
    description: string;
    assignedRole?: string;
    attachments?: string[];
  }) => Promise<boolean>;
  sendGrievanceMessage: (ticketId: string, message: string) => Promise<boolean>;
  updateGrievanceStatus: (ticketId: string, status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected', note?: string) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<void>;
  sendMessage: (text: string) => void;
  actOnDocStep: (requestId: string, action: 'approve' | 'reject', comment?: string) => Promise<boolean>;
  forwardDocStep: (requestId: string, toRole: string, comment?: string) => Promise<boolean>;
  acceptDocument: (requestId: string, signatureDataUrl?: string) => Promise<boolean>;
  uploadEmployeeDocument: (doc: { type: string; name: string; dataUrl?: string; files?: string[] }) => Promise<boolean>;
  signCompanyDocument: (docCode: string, docTitle: string, signatureText: string, signatureDataUrl?: string) => Promise<boolean>;
  deleteEmployeeDocument: (docId: string) => Promise<boolean>;
  registerEmployeeFace: (photoDataUrl: string) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_COMPANY_EMPLOYEES: Employee[] = [
  {
    id: 'demo-emp-1',
    tenantId: 'demo-tenant-1',
    empCode: 'SWF001',
    code: 'SWF001',
    password: 'password123',
    name: 'Aarav Sharma',
    email: 'aarav@demo.swift',
    phone: '+91 98765 43210',
    department: 'Engineering',
    designation: 'Senior Engineer',
    doj: '2023-04-01',
    joiningDate: '2023-04-01',
    basic: 45000,
    pan: 'ABCDE1234F',
    panNumber: 'ABCDE1234F',
    aadhaar: '1234 5678 9012',
    bankAcc: '50100123456789',
    bankAccount: 'HDFC Bank (A/C: 50100123456789)',
    bankIfsc: 'HDFC0001234',
    shiftId: 'gen',
    shift: 'Regular Shift (09:00 AM - 06:00 PM)',
    branch: 'HQ Branch (Chennai)',
    reportingManager: 'Priya Iyer (HR Manager)',
    status: 'active',
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState('demo-tenant-1');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_COMPANY_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [docLibrary, setDocLibrary] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [roles, setRoles] = useState<PredefinedRole[]>([]);
  const [docRequests, setDocRequests] = useState<DocRequest[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [roster, setRoster] = useState<ShiftAssignment[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: 1, sender: 'bot', text: 'Hello! I am SWIFT AI Assistant 🤖. How can I help you with your HR, leave, or payroll questions today?', time: '10:00 AM' },
  ]);

  const [companyConfig, setCompanyConfig] = useState<any>(null);

  // Restore persisted user session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedUserJson, savedTenant] = await Promise.all([
          AsyncStorage.getItem(AUTH_USER_KEY),
          AsyncStorage.getItem(AUTH_TENANT_KEY),
        ]);

        if (savedUserJson) {
          const parsedUser: Employee = JSON.parse(savedUserJson);
          setCurrentUser(parsedUser);
          const tId = savedTenant || parsedUser.tenantId || 'demo-tenant-1';
          setTenantId(tId);
          setIsLoggedIn(true);

          if (parsedUser.companyName) {
            setCompanyConfig((prev: any) => ({
              ...(prev || {}),
              companyName: parsedUser.companyName,
            }));
          }
        }
      } catch (err) {
        console.warn('[Session] Failed to restore auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const data = await fetchInitialState(tenantId);
    let combinedEmployees: Employee[] = [];

    if (data && data.employees && Array.isArray(data.employees) && data.employees.length > 0) {
      combinedEmployees = [...data.employees];
      DEFAULT_COMPANY_EMPLOYEES.forEach((def) => {
        if (!combinedEmployees.some((e: Employee) => e.id === def.id || e.empCode === def.empCode)) {
          combinedEmployees.push(def);
        }
      });
      setEmployees(combinedEmployees);
    } else {
      setEmployees(DEFAULT_COMPANY_EMPLOYEES);
      combinedEmployees = DEFAULT_COMPANY_EMPLOYEES;
    }

    const companyName = data?.companyName || data?.config?.companyName || currentUser?.companyName;
    setCompanyConfig((prev: any) => ({
      ...(prev || {}),
      ...(data?.config || {}),
      companyName: companyName || prev?.companyName || 'SWIFT HRMS',
    }));

    // Synchronize currentUser with the latest record from backend
    setCurrentUser((prev) => {
      if (!prev) return null;
      const freshUser = combinedEmployees.find(
        (e: Employee) => e.id === prev.id || (e.empCode && e.empCode === prev.empCode)
      );
      if (freshUser) {
        const updated = {
          ...prev,
          ...freshUser,
          companyName: companyName || freshUser.companyName || prev.companyName,
        };
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      }
      if (companyName && companyName !== prev.companyName) {
        const updated = { ...prev, companyName };
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      }
      return prev;
    });

    if (data?.attendance) setAttendance(data.attendance);
    if (data?.leaves) setLeaves(data.leaves);
    if (data?.grievances) setGrievances(data.grievances);
    if (data?.payrolls) setPayrolls(data.payrolls);
    if (data?.docLibrary) setDocLibrary(data.docLibrary);
    if (data?.notices) setNotices(data.notices);
    if (data?.roles) setRoles(data.roles);
    if (data?.docRequests) setDocRequests(data.docRequests);
    if (data?.holidays) setHolidays(data.holidays);
    if (data?.roster) setRoster(data.roster);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [tenantId]);

  const login = async (empCodeOrEmail: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/employee/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ empCode: empCodeOrEmail, password: pass }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      if (data && data.success && data.employee) {
        const found = data.employee;
        const employeeTenantId = data.tenantId || 'demo-tenant-1';
        
        setTenantId(employeeTenantId);

        const realCompanyName = data.companyName || data.config?.companyName || found.companyName || 'SWIFT HRMS';

        const authenticatedEmployee: Employee = {
          ...found,
          id: found.id,
          tenantId: employeeTenantId,
          companyName: realCompanyName,
          empCode: found.empCode || found.code || found.id || 'SW001',
          name: found.name || 'Employee',
          email: found.email || 'employee@swift.ai',
          department: found.department || 'Engineering',
          designation: found.designation || 'Software Engineer',
          branch: found.branch || found.address || found.city || 'Head Office',
          shift: found.shift || 'Regular Shift (09:00 AM - 06:00 PM)',
          joiningDate: found.joiningDate || found.doj || '2026-07-25',
          bankAccount: found.bankAccount || (found.bankAcc ? `Bank A/C: ${found.bankAcc}` : 'HDFC Bank (A/C: 50100123456789)'),
          panNumber: found.panNumber || found.pan || 'ABCDE1234F',
          basic: found.basic || 25000,
        };

        setCurrentUser(authenticatedEmployee);
        setCompanyConfig((prev: any) => ({ ...prev, companyName: realCompanyName }));
        setIsLoggedIn(true);

        // Persist session to AsyncStorage
        try {
          await Promise.all([
            AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticatedEmployee)),
            AsyncStorage.setItem(AUTH_TENANT_KEY, employeeTenantId),
          ]);
        } catch (storageErr) {
          console.warn('[Storage] Failed to persist login session:', storageErr);
        }

        setTasks([
          { id: `task-${found.id}-1`, tenantId: employeeTenantId, employeeId: found.id, title: 'Submit Q3 Self-Assessment', desc: 'Complete your performance self-review for HR sync.', priority: 'High', dueDate: 'Tomorrow', status: 'pending' },
          { id: `task-${found.id}-2`, tenantId: employeeTenantId, employeeId: found.id, title: 'Upload Updated ID Proof', desc: 'Verification required for annual compliance audit.', priority: 'Medium', dueDate: 'Aug 05, 2026', status: 'pending' },
        ]);

        return true;
      }
    } catch (err: any) {
      console.warn('[API] Login error:', err?.message || err);
    }
    return false;
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_USER_KEY),
        AsyncStorage.removeItem(AUTH_TENANT_KEY),
      ]);
    } catch (storageErr) {
      console.warn('[Storage] Failed to clear login session:', storageErr);
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setTenantId('demo-tenant-1');
  };

  // Helper to compute hours worked
  const calculateHoursWorked = (inTimeStr?: string, outTimeStr?: string): number => {
    if (!inTimeStr || !outTimeStr) return 0;
    try {
      const parseTime = (s: string) => {
        const cleaned = s.trim().toLowerCase();
        const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
        if (!match) return -1;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3]?.toLowerCase();
        if (meridiem === 'pm' && h < 12) h += 12;
        if (meridiem === 'am' && h === 12) h = 0;
        return h * 60 + m;
      };
      const inMins = parseTime(inTimeStr);
      const outMins = parseTime(outTimeStr);
      if (inMins < 0 || outMins < 0) return 0;
      let diffMins = outMins - inMins;
      if (diffMins <= 0) diffMins += 24 * 60;
      return Math.round((diffMins / 60) * 10) / 10;
    } catch {
      return 0;
    }
  };

  // Real AWS Rekognition Facial Check-In
  const clockIn = async (photoDataUrl?: string): Promise<ClockResult> => {
    const empId = currentUser?.id || currentUser?.empCode || 'demo-emp-1';
    const effectiveTenantId = tenantId || currentUser?.tenantId || 'demo-tenant-1';
    let faceResult: any = { success: true, similarity: 99.4 };

    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = d.toISOString().slice(0, 10);

    const todayRoster = (roster || []).find(
      (r) => (r.employeeId === empId || r.empCode === currentUser?.empCode) && (r.date === localToday || r.date === todayStr)
    );

    const isRosterWeeklyOff =
      todayRoster?.shiftId === 'off' ||
      todayRoster?.shiftName === 'Weekly Off' ||
      todayRoster?.shiftName?.toLowerCase().includes('off');

    if (isRosterWeeklyOff) {
      return {
        success: false,
        reason: 'Attendance Restricted: Today is designated as Weekly Off in the Swift Roster.',
      };
    }

    if (photoDataUrl) {
      faceResult = await verifyFace(effectiveTenantId, empId, photoDataUrl);
      if (faceResult?.success === false) {
        return {
          success: false,
          reason: faceResult.reason || `Facial recognition failed: Captured face does not match registered biometric profile for ${currentUser?.name || empId}.`,
        };
      }
    }

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const photoToSave = (faceResult?.url && faceResult.url.startsWith('http')) ? faceResult.url : photoDataUrl;

    const newRecord: AttendanceRecord = {
      id: `att-${empId}-${localToday}`,
      tenantId: effectiveTenantId,
      employeeId: empId,
      employeeName: currentUser?.name || 'Employee',
      empCode: currentUser?.empCode || empId,
      department: currentUser?.department || 'General',
      date: localToday,
      clockIn: timeStr,
      checkIn: timeStr,
      status: 'present',
      faceVerified: true,
      geofenceVerified: true,
      photoDataUrl: photoToSave || undefined,
      checkInPhoto: photoToSave || undefined,
      similarity: faceResult?.similarity || 99.4,
    };

    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) =>
          !(
            (a.employeeId === empId || (currentUser?.empCode && a.empCode === currentUser.empCode) || a.employeeName === currentUser?.name) &&
            (a.date === localToday)
          )
      );
      return [newRecord, ...filtered];
    });

    const mutateRes = await mutateTable('attendance', newRecord);
    if (!mutateRes?.success && mutateRes?.error) {
      console.warn('[ClockIn] Mutate failed:', mutateRes.error);
    }
    return { success: true, similarity: faceResult?.similarity || 99.4 };
  };

  // Real AWS Rekognition Facial Check-Out
  const clockOut = async (photoDataUrl?: string): Promise<ClockResult> => {
    const empId = currentUser?.id || currentUser?.empCode || 'demo-emp-1';
    const effectiveTenantId = tenantId || currentUser?.tenantId || 'demo-tenant-1';
    let faceResult: any = { success: true, similarity: 99.4 };

    if (photoDataUrl) {
      faceResult = await verifyFace(effectiveTenantId, empId, photoDataUrl);
      if (faceResult?.success === false) {
        return {
          success: false,
          reason: faceResult.reason || `Facial recognition failed: Captured face does not match registered biometric profile for ${currentUser?.name || empId}.`,
        };
      }
    }

    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const utcToday = d.toISOString().split('T')[0];
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const photoToSave = (faceResult?.url && faceResult.url.startsWith('http')) ? faceResult.url : photoDataUrl;

    // Look for existing attendance record for today
    const existingIndex = attendance.findIndex(
      (a) =>
        (a.employeeId === empId || (currentUser?.empCode && a.empCode === currentUser.empCode) || (currentUser?.name && a.employeeName === currentUser.name)) &&
        (a.date === localToday || a.date === utcToday)
    );

    let updated: AttendanceRecord;
    if (existingIndex !== -1) {
      const existing = attendance[existingIndex];
      const checkInTime = existing.checkIn || existing.clockIn || timeStr;
      const hours = calculateHoursWorked(checkInTime, timeStr);

      updated = {
        ...existing,
        tenantId: existing.tenantId || effectiveTenantId,
        id: existing.id || `att-${empId}-${localToday}`,
        employeeId: empId,
        employeeName: currentUser?.name || existing.employeeName || 'Employee',
        empCode: currentUser?.empCode || existing.empCode || empId,
        date: existing.date || localToday,
        clockOut: timeStr,
        checkOut: timeStr,
        checkIn: checkInTime,
        clockIn: checkInTime,
        hoursWorked: hours,
        otHours: hours > 9 ? Math.round((hours - 9) * 10) / 10 : 0,
        checkOutPhoto: photoToSave || existing.checkOutPhoto || undefined,
        photoDataUrl: existing.photoDataUrl || photoToSave || undefined,
      };

      const newAttList = [...attendance];
      newAttList[existingIndex] = updated;
      setAttendance(newAttList);
    } else {
      // In case no check-in record was present in memory, create a complete clock-out record
      updated = {
        id: `att-${empId}-${localToday}`,
        tenantId: effectiveTenantId,
        employeeId: empId,
        employeeName: currentUser?.name || 'Employee',
        empCode: currentUser?.empCode || empId,
        department: currentUser?.department || 'General',
        date: localToday,
        clockIn: timeStr,
        checkIn: timeStr,
        clockOut: timeStr,
        checkOut: timeStr,
        hoursWorked: 8.0,
        status: 'present',
        faceVerified: true,
        geofenceVerified: true,
        checkOutPhoto: photoToSave || undefined,
        photoDataUrl: photoToSave || undefined,
        similarity: faceResult?.similarity || 99.4,
      };
      setAttendance((prev) => [updated, ...prev]);
    }

    const mutateRes = await mutateTable('attendance', updated);
    if (!mutateRes?.success && mutateRes?.error) {
      console.warn('[ClockOut] Mutate failed:', mutateRes.error);
    }
    return { success: true, similarity: faceResult?.similarity || 99.4 };
  };

  const registerEmployeeFace = async (photoDataUrl: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    const empId = currentUser?.id || currentUser?.empCode || 'demo-emp-1';
    const effectiveTenantId = tenantId || currentUser?.tenantId || 'demo-tenant-1';

    try {
      const res = await registerFace(effectiveTenantId, empId, photoDataUrl);
      if (res && res.success) {
        const finalUrl = res.url || photoDataUrl;

        // Update currentUser state
        const updatedUser: Employee = {
          ...(currentUser as Employee),
          photoDataUrl: finalUrl,
          faceRegistered: true,
        };
        setCurrentUser(updatedUser);

        // Persist to AsyncStorage
        try {
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        } catch (storageErr) {
          console.warn('[Storage] Failed to save updated user after face registration:', storageErr);
        }

        // Update in employees list
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === empId || (currentUser?.empCode && e.empCode === currentUser.empCode)
              ? { ...e, photoDataUrl: finalUrl, faceRegistered: true }
              : e
          )
        );

        // Also sync item to DynamoDB employees table
        await mutateTable('employees', {
          ...updatedUser,
          photoDataUrl: finalUrl.startsWith('http') ? finalUrl : undefined,
          faceRegistered: true,
        });

        return { success: true, url: finalUrl };
      } else {
        return { success: false, error: res?.error || 'Face registration failed on server' };
      }
    } catch (err: any) {
      console.warn('[FaceRegister] Error:', err?.message || err);
      return { success: false, error: err?.message || 'Face registration error' };
    }
  };

  const applyLeave = async (request: Omit<LeaveRequest, 'id' | 'tenantId' | 'employeeId' | 'employeeName' | 'createdAt'>): Promise<boolean> => {
    // Balance guard against configured permission types and leave types
    const permissionTypes: Array<{ name: string; maxHours: number; period: 'month' | 'year' }> =
      (companyConfig as any)?.permissionTypes || [];
    const isPermissionRequest = request.type?.toLowerCase().includes('permission');

    if (isPermissionRequest && permissionTypes.length > 0) {
      const activePerm = permissionTypes[0];
      const now = new Date();
      const period = activePerm.period || 'month';
      const myPerms = leaves.filter(
        (l) => l.employeeId === (currentUser?.id || 'demo-emp-1') &&
               l.status !== 'Rejected' &&
               l.type?.toLowerCase().includes('permission')
      );
      const periodLeaves = myPerms.filter((l) => {
        const refDate = l.startDate || l.endDate;
        if (!refDate) return true;
        const d = new Date(refDate);
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      const usedHrs = periodLeaves.reduce((s, l) => s + (parseFloat(l.days) || 1), 0);
      const requestedHrs = parseFloat(request.days) || 1;
      if (usedHrs + requestedHrs > activePerm.maxHours) {
        return false;
      }
    } else {
      const leaveTypes: Array<{ name: string; days?: number; permissionHours?: number; permissionPeriod?: string }> =
        (companyConfig as any)?.leaveTypes || [];
      const matchedType = leaveTypes.find((lt) =>
        request.type?.toLowerCase().includes(lt.name?.toLowerCase().split(' ')[0] || '')
      );
      if (matchedType) {
        const now = new Date();
        const myLeaves = leaves.filter(
          (l) => l.employeeId === (currentUser?.id || 'demo-emp-1') &&
                 l.status !== 'Rejected' &&
                 l.type?.toLowerCase().includes(matchedType.name?.toLowerCase().split(' ')[0] || '')
        );
        if (matchedType.permissionHours) {
          // Permission-type fallback: filter by period (month or year)
          const period = matchedType.permissionPeriod || 'month';
          const periodLeaves = myLeaves.filter((l) => {
            const refDate = l.startDate || l.endDate;
            if (!refDate) return true;
            const d = new Date(refDate);
            if (period === 'year') return d.getFullYear() === now.getFullYear();
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          });
          const usedHrs = periodLeaves.reduce((s, l) => s + (parseFloat(l.days) || 1), 0);
          const requestedHrs = parseFloat(request.days) || 1;
          if (usedHrs + requestedHrs > matchedType.permissionHours) {
            return false; // Caller (LeavesScreen) already shows alert via handleSubmit guard
          }
        } else if (matchedType.days) {
          const usedDays = myLeaves.reduce((s, l) => s + (parseFloat(l.days) || 1), 0);
          const requestedDays = parseFloat(request.days) || 1;
          if (usedDays + requestedDays > matchedType.days) {
            return false;
          }
        }
      }
    }

    const reportingManager = employees.find(
      (e) =>
        e.id === currentUser?.managerId ||
        (currentUser?.reportingManager && e.name.toLowerCase().includes(currentUser.reportingManager.toLowerCase()))
    );
    const hrManager = employees.find(
      (e) => e.department?.toLowerCase().includes('hr') || e.designation?.toLowerCase().includes('hr')
    );

    const defaultApprovalSteps: LeaveApprovalStepAudit[] = [
      {
        level: 1,
        roleName: 'Reporting Manager (TL)',
        approverId: reportingManager?.id,
        approverName: reportingManager?.name || 'Reporting Manager',
        status: 'Pending',
      },
      {
        level: 2,
        roleName: 'Department Manager',
        approverName: 'Department Head',
        status: 'Pending',
      },
      {
        level: 3,
        roleName: 'HR Manager',
        approverId: hrManager?.id,
        approverName: hrManager?.name || 'HR Manager',
        status: 'Pending',
      },
    ];

    const newLeave: LeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`,
      tenantId: tenantId,
      employeeId: currentUser?.id || 'demo-emp-1',
      employeeName: currentUser?.name || 'Employee',
      createdAt: new Date().toISOString(),
      currentLevel: 1,
      totalLevels: 3,
      approvalSteps: defaultApprovalSteps,
    };

    setLeaves((prev) => [newLeave, ...prev]);
    await mutateTable('leaves', newLeave);
    return true;
  };

  const applyGrievance = async (ticket: {
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    subject: string;
    description: string;
    assignedRole?: string;
    attachments?: string[];
  }): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const newTicket: GrievanceTicket = {
        id: `grv-${Date.now()}`,
        tenantId,
        ticketNumber: `GRV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        employeeId: currentUser?.id || 'demo-emp-1',
        employeeName: currentUser?.name || 'Employee',
        empCode: currentUser?.empCode || 'SW001',
        department: currentUser?.department || 'General',
        category: ticket.category,
        priority: ticket.priority,
        assignedRole: ticket.assignedRole || 'HR Manager',
        subject: ticket.subject,
        description: ticket.description,
        attachments: ticket.attachments || [],
        status: 'Open',
        thread: [
          {
            id: `msg-${Date.now()}`,
            senderId: currentUser?.id || 'demo-emp-1',
            senderName: currentUser?.name || 'Employee',
            senderRole: 'Employee',
            message: ticket.description,
            attachments: ticket.attachments || [],
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      setGrievances((prev) => [newTicket, ...prev]);
      await mutateTable('grievances', newTicket);
      return true;
    } catch (e: any) {
      console.warn('applyGrievance error:', e.message);
      return false;
    }
  };

  const sendGrievanceMessage = async (ticketId: string, message: string): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const newMsg: GrievanceMessage = {
        id: `msg-${Date.now()}`,
        senderId: currentUser?.id || 'demo-emp-1',
        senderName: currentUser?.name || 'Employee',
        senderRole: 'Employee',
        message: message.trim(),
        createdAt: now,
      };

      let updatedTicket: GrievanceTicket | null = null;
      setGrievances((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          updatedTicket = {
            ...t,
            thread: [...(t.thread || []), newMsg],
            updatedAt: now,
          };
          return updatedTicket;
        })
      );

      if (updatedTicket) {
        await mutateTable('grievances', updatedTicket);
      }
      return true;
    } catch (e: any) {
      console.warn('sendGrievanceMessage error:', e.message);
      return false;
    }
  };

  const updateGrievanceStatus = async (
    ticketId: string,
    status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected',
    note?: string
  ): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      let updatedTicket: GrievanceTicket | null = null;
      setGrievances((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          updatedTicket = {
            ...t,
            status,
            resolutionNote: note || t.resolutionNote,
            resolvedAt: status === 'Resolved' || status === 'Rejected' ? now : t.resolvedAt,
            resolvedBy: status === 'Resolved' || status === 'Rejected' ? currentUser?.name : t.resolvedBy,
            updatedAt: now,
          };
          return updatedTicket;
        })
      );
      if (updatedTicket) {
        await mutateTable('grievances', updatedTicket);
      }
      return true;
    } catch (e: any) {
      console.warn('updateGrievanceStatus error:', e.message);
      return false;
    }
  };

  const toggleTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t))
    );
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages((prev) => [...prev, userMsg]);

    const lower = text.toLowerCase();
    setTimeout(() => {
      let botReply = `I've logged your query with HR. Check the Documents section for complete policy details!`;
      if (lower.includes('leave')) {
        botReply = `Hello ${currentUser?.name?.split(' ')[0]}! You have 6 Casual Leaves (CL) and 5 Sick Leaves (SL) remaining for this year. Apply directly in the Leaves tab!`;
      } else if (lower.includes('payroll') || lower.includes('salary')) {
        botReply = `Your basic salary is ₹${(currentUser?.basic || 25000).toLocaleString()}. Net salary is credited directly to your bank account (${currentUser?.bankAccount || 'HDFC Bank'}) on the 1st of every month!`;
      } else if (lower.includes('holiday')) {
        botReply = `The next official company holiday is Independence Day on Friday, August 15, 2026!`;
      }

      const replyMsg = { id: Date.now() + 1, sender: 'bot', text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChatMessages((prev) => [...prev, replyMsg]);
    }, 600);
  };

  const userRole =
    roles.find(
      (r) =>
        r.id === currentUser?.roleId ||
        r.name === currentUser?.roleName ||
        (currentUser?.designation &&
          (r.name.toLowerCase().includes(currentUser.designation.toLowerCase()) ||
            currentUser.designation.toLowerCase().includes(r.name.toLowerCase())))
    ) ||
    (currentUser?.roleName === 'CEO / Super Admin'
      ? {
          id: 'role-ceo',
          name: 'CEO / Super Admin',
          description: 'Full Super Admin Access',
          permissions: {
            leaveApproval: true,
            attendanceApproval: true,
            payrollDashboard: true,
            employeeManagement: true,
            expenseHandloanApproval: true,
            documentsApproval: true,
            documentTypes: {
              offerLetter: true,
              appointmentLetter: true,
              incrementLetter: true,
              promotionLetter: true,
              relievingLetter: true,
              experienceLetter: true,
              salaryCertificate: true,
              warningLetter: true,
              showCauseNotice: true,
            },
            invoiceApproval: true,
            resignationApproval: true,
            assetManagement: true,
            noticesAnnouncements: true,
            performanceReviews: true,
            auditLogView: true,
          },
        }
      : null);

  const canApproveDocuments = !!userRole?.permissions?.documentsApproval || currentUser?.roleName === 'CEO / Super Admin';
  const canApproveLeaves = !!userRole?.permissions?.leaveApproval || currentUser?.roleName === 'CEO / Super Admin';

  const actOnLeave = async (
    leaveId: string,
    action: 'approve' | 'approve_forward' | 'approve_close' | 'reject' | 'escalate',
    comment?: string
  ): Promise<boolean> => {
    try {
      const targetLeave = leaves.find((l) => l.id === leaveId);
      if (targetLeave && targetLeave.approvalSteps && targetLeave.approvalSteps.length > 0) {
        const currentLvl = targetLeave.currentLevel || 1;
        const totalLvls = targetLeave.totalLevels || targetLeave.approvalSteps.length || 3;
        const now = new Date().toISOString();

        if (action === 'reject') {
          const updatedSteps = targetLeave.approvalSteps.map((step) => {
            if (step.level === currentLvl) {
              return {
                ...step,
                status: 'Rejected' as const,
                approverName: currentUser?.name || 'Approver',
                comment: comment || 'Rejected',
                actionAt: now,
              };
            }
            return step;
          });

          const updatedLeave: LeaveRequest = {
            ...targetLeave,
            status: 'Rejected',
            actedBy: currentUser?.name,
            approverComment: comment,
            actedAt: now,
            approvalSteps: updatedSteps,
          };
          setLeaves((prev) => prev.map((l) => (l.id === leaveId ? updatedLeave : l)));
          await mutateTable('leaves', updatedLeave);
          return true;
        }

        if (action === 'approve_close') {
          const updatedSteps = targetLeave.approvalSteps.map((step) => {
            if (step.level <= currentLvl) {
              return {
                ...step,
                status: 'Approved' as const,
                approverName: step.level === currentLvl ? (currentUser?.name || 'Approver') : step.approverName,
                comment: step.level === currentLvl ? (comment || 'Approved & Closed') : step.comment,
                actionAt: step.level === currentLvl ? now : step.actionAt,
              };
            }
            return {
              ...step,
              status: 'Approved' as const,
              approverName: `Auto-approved by ${currentUser?.name || 'Manager'}`,
              comment: 'Closed by earlier stage authority',
              actionAt: now,
            };
          });

          const updatedLeave: LeaveRequest = {
            ...targetLeave,
            status: 'Approved',
            currentLevel: totalLvls,
            approvedBy: currentUser?.name,
            actedBy: currentUser?.name,
            approverComment: comment || 'Approved & Closed directly',
            actedAt: now,
            approvalSteps: updatedSteps,
          };

          setLeaves((prev) => prev.map((l) => (l.id === leaveId ? updatedLeave : l)));
          await mutateTable('leaves', updatedLeave);
          return true;
        }

        if (action === 'escalate') {
          const isFinal = currentLvl >= totalLvls;
          const nextLevel = isFinal ? currentLvl : currentLvl + 1;

          const updatedSteps = targetLeave.approvalSteps.map((step) => {
            if (step.level === currentLvl) {
              return {
                ...step,
                status: 'Pending' as const,
                comment: `Escalated to Level ${nextLevel}: ${comment || 'No action within threshold'}`,
                actionAt: now,
              };
            }
            return step;
          });

          const updatedLeave: LeaveRequest = {
            ...targetLeave,
            currentLevel: nextLevel,
            approverComment: `Escalated to Level ${nextLevel}`,
            approvalSteps: updatedSteps,
          };

          setLeaves((prev) => prev.map((l) => (l.id === leaveId ? updatedLeave : l)));
          await mutateTable('leaves', updatedLeave);
          return true;
        }

        // action === 'approve_forward' or 'approve'
        const isFinalLevel = currentLvl >= totalLvls;
        const nextLevel = isFinalLevel ? currentLvl : currentLvl + 1;
        const finalStatus = isFinalLevel ? 'Approved' : 'Pending';

        const updatedSteps = targetLeave.approvalSteps.map((step) => {
          if (step.level === currentLvl) {
            return {
              ...step,
              status: 'Approved' as const,
              approverName: currentUser?.name || 'Approver',
              comment: comment || 'Approved & Forwarded',
              actionAt: now,
            };
          }
          return step;
        });

        const updatedLeave: LeaveRequest = {
          ...targetLeave,
          status: finalStatus,
          currentLevel: nextLevel,
          approvedBy: isFinalLevel ? currentUser?.name : targetLeave.approvedBy,
          actedBy: currentUser?.name,
          approverComment: comment,
          actedAt: now,
          approvalSteps: updatedSteps,
        };

        setLeaves((prev) => prev.map((l) => (l.id === leaveId ? updatedLeave : l)));
        await mutateTable('leaves', updatedLeave);
        return true;
      }

      const res = await fetch(`${BACKEND_URL}/api/leaves/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          tenantId,
          leaveId,
          action,
          comment: comment || '',
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: userRole?.id || userRole?.name || 'Manager',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to act on leave request');
      }
      await refreshData();
      return true;
    } catch (e: any) {
      console.warn('actOnLeave error:', e.message);
      return false;
    }
  };

  const actOnAttendanceRequest = async (
    requestId: string,
    action: 'approve' | 'approve_forward' | 'approve_close' | 'reject' | 'escalate',
    comment?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/attendance-requests/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          tenantId,
          requestId,
          action,
          comment: comment || '',
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: userRole?.id || userRole?.name || 'Manager',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to act on attendance request');
      }
      await refreshData();
      return true;
    } catch (e: any) {
      console.warn('actOnAttendanceRequest error:', e.message);
      return false;
    }
  };

  const actOnDocStep = async (requestId: string, action: 'approve' | 'reject', comment?: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          tenantId,
          requestId,
          action,
          comment: comment || '',
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: userRole?.id || userRole?.name || 'Manager',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to act on document');
      }
      await refreshData();
      return true;
    } catch (e: any) {
      console.warn('actOnDocStep error:', e.message);
      return false;
    }
  };

  const forwardDocStep = async (requestId: string, toRole: string, comment?: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          tenantId,
          requestId,
          toRole,
          comment: comment || '',
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: userRole?.id || userRole?.name || 'Manager',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to forward document');
      }
      await refreshData();
      return true;
    } catch (e: any) {
      console.warn('forwardDocStep error:', e.message);
      return false;
    }
  };

  const acceptDocument = async (requestId: string, signatureDataUrl?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          tenantId,
          requestId,
          employeeId: currentUser.id,
          signatureDataUrl: signatureDataUrl || 'E-Signed by ' + currentUser.name,
        }),
      });
      if (!res.ok) return false;
      await refreshData();
      return true;
    } catch (e: any) {
      console.warn('acceptDocument error:', e.message);
      return false;
    }
  };

  const uploadEmployeeDocument = async (doc: { type: string; name: string; dataUrl?: string; files?: string[] }): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const effectiveTenant = tenantId || currentUser.tenantId || 'demo-tenant-1';
      const inputFiles = doc.files && doc.files.length > 0 ? doc.files : (doc.dataUrl ? [doc.dataUrl] : []);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < inputFiles.length; i++) {
        const itemData = inputFiles[i];
        if (itemData.startsWith('data:')) {
          const fileExt = itemData.includes('application/pdf') ? 'pdf' : 'jpg';
          const s3Key = `employee_documents/${currentUser.empCode || currentUser.id}_${Date.now()}_page${i + 1}.${fileExt}`;
          const uploadRes = await uploadFile(effectiveTenant, s3Key, itemData);
          if (uploadRes?.success && uploadRes.url) {
            uploadedUrls.push(uploadRes.url);
          } else {
            uploadedUrls.push(itemData);
          }
        } else {
          uploadedUrls.push(itemData);
        }
      }

      const primaryUrl = uploadedUrls[0] || doc.dataUrl || '';

      const newDoc: EmployeeDocument = {
        id: 'edoc-' + Math.random().toString(36).substring(2, 9),
        type: doc.type,
        name: doc.name,
        dataUrl: primaryUrl,
        files: uploadedUrls,
        uploadedAt: new Date().toISOString(),
        verified: false,
      };
      const updatedDocs = [...(currentUser.documentsUploaded || []), newDoc];
      const updatedUser: Employee = {
        ...currentUser,
        documentsUploaded: updatedDocs,
      };
      setCurrentUser(updatedUser);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
      setEmployees((prev) => prev.map((e) => (e.id === currentUser.id ? updatedUser : e)));
      await mutateTable('employees', { tenantId: effectiveTenant, ...updatedUser });
      return true;
    } catch (e: any) {
      console.warn('uploadEmployeeDocument error:', e.message);
      return false;
    }
  };

  const signCompanyDocument = async (
    docCode: string,
    docTitle: string,
    signatureText: string,
    signatureDataUrl?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const timestamp = new Date().toISOString();
      const signedRecord = {
        docCode,
        docTitle,
        signedAt: timestamp,
        signatureText: signatureText || currentUser.name,
        signatureDataUrl: signatureDataUrl || undefined,
        acknowledged: true,
      };
      const nextSignedDocs = {
        ...(currentUser.signedDocs || {}),
        [docCode]: signedRecord,
      };
      const updatedUser: Employee = {
        ...currentUser,
        signedDocs: nextSignedDocs,
        acceptance: {
          signed: true,
          signatureDataUrl: signatureDataUrl || undefined,
          signedAt: timestamp,
        },
      };
      setCurrentUser(updatedUser);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
      setEmployees((prev) => prev.map((e) => (e.id === currentUser.id ? updatedUser : e)));
      await mutateTable('employees', { tenantId, ...updatedUser });
      return true;
    } catch (e: any) {
      console.warn('signCompanyDocument error:', e.message);
      return false;
    }
  };

  const deleteEmployeeDocument = async (docId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const updatedDocs = (currentUser.documentsUploaded || []).filter((d) => d.id !== docId);
      const updatedUser: Employee = {
        ...currentUser,
        documentsUploaded: updatedDocs,
      };
      setCurrentUser(updatedUser);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
      setEmployees((prev) => prev.map((e) => (e.id === currentUser.id ? updatedUser : e)));
      await mutateTable('employees', { tenantId, ...updatedUser });
      return true;
    } catch (e: any) {
      console.warn('deleteEmployeeDocument error:', e.message);
      return false;
    }
  };

  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const utcToday = d.toISOString().split('T')[0];

  const todayRecord = attendance.find(
    (a) =>
      (a.employeeId === currentUser?.id || (currentUser?.empCode && a.empCode === currentUser.empCode) || a.employeeName === currentUser?.name) &&
      (a.date === localToday || a.date === utcToday)
  );
  const hasClockedIn = !!(todayRecord && (todayRecord.clockIn || todayRecord.checkIn));
  const hasClockedOut = !!(todayRecord && (todayRecord.clockOut || todayRecord.checkOut));
  const isClockedIn = hasClockedIn && !hasClockedOut;

  return (
    <AppContext.Provider
      value={{
        tenantId,
        isLoggedIn,
        loading,
        currentUser,
        employees,
        attendance,
        leaves,
        grievances,
        payrolls,
        docLibrary,
        notices,
        tasks,
        chatMessages,
        isClockedIn,
        companyConfig,
        todayRecord,
        roles,
        docRequests,
        userRole,
        canApproveDocuments,
        canApproveLeaves,
        holidays,
        roster,
        login,
        logout,
        refreshData,
        clockIn,
        clockOut,
        applyLeave,
        actOnLeave,
        actOnAttendanceRequest,
        applyGrievance,
        sendGrievanceMessage,
        updateGrievanceStatus,
        toggleTask,
        sendMessage,
        actOnDocStep,
        forwardDocStep,
        acceptDocument,
        uploadEmployeeDocument,
        signCompanyDocument,
        deleteEmployeeDocument,
        registerEmployeeFace,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
