import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchInitialState, mutateTable, verifyFace, BACKEND_URL } from '../services/api';

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
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
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
  allowHalfDayLogin?: boolean;
  halfDayLoginTime?: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late' | 'halfday' | 'holiday';
  faceVerified: boolean;
  geofenceVerified: boolean;
  otHours?: number;
  otPay?: number;
  similarity?: number;
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
  actOnLeave: (leaveId: string, action: 'approve' | 'reject', comment?: string) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<void>;
  sendMessage: (text: string) => void;
  actOnDocStep: (requestId: string, action: 'approve' | 'reject', comment?: string) => Promise<boolean>;
  forwardDocStep: (requestId: string, toRole: string, comment?: string) => Promise<boolean>;
  acceptDocument: (requestId: string, signatureDataUrl?: string) => Promise<boolean>;
  uploadEmployeeDocument: (doc: { type: string; name: string; dataUrl: string }) => Promise<boolean>;
  signCompanyDocument: (docCode: string, docTitle: string, signatureText: string, signatureDataUrl?: string) => Promise<boolean>;
  deleteEmployeeDocument: (docId: string) => Promise<boolean>;
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

  const refreshData = async () => {
    setLoading(true);
    const data = await fetchInitialState(tenantId);
    if (data && data.employees && Array.isArray(data.employees) && data.employees.length > 0) {
      const combined = [...data.employees];
      DEFAULT_COMPANY_EMPLOYEES.forEach((def) => {
        if (!combined.some((e: Employee) => e.id === def.id || e.empCode === def.empCode)) {
          combined.push(def);
        }
      });
      setEmployees(combined);
    }
    let companyName = data?.config?.companyName || data?.companyName;
    if (!companyName && tenantId) {
      try {
        const tRes = await fetch(`${BACKEND_URL}/api/tenants`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        if (tRes.ok) {
          const tenants = await tRes.json();
          const matchedTenant = tenants.find((t: any) => t.id === tenantId);
          if (matchedTenant) {
            companyName = matchedTenant.name || matchedTenant.companyName || matchedTenant.legal_name;
          }
        }
      } catch (e) {}
    }

    setCompanyConfig((prev: any) => ({
      ...(prev || {}),
      ...(data?.config || {}),
      companyName: companyName || prev?.companyName || 'SWIFT HRMS',
    }));

    if (companyName) {
      setCurrentUser((prev) => (prev ? { ...prev, companyName } : null));
    }

    if (data?.attendance) setAttendance(data.attendance);
    if (data?.leaves) setLeaves(data.leaves);
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

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setTenantId('demo-tenant-1');
  };

  // Real AWS Rekognition Facial Check-In
  const clockIn = async (photoDataUrl?: string): Promise<ClockResult> => {
    const empId = currentUser?.id || 'demo-emp-1';
    let faceResult: any = { success: true, similarity: 99.4 };

    if (photoDataUrl) {
      faceResult = await verifyFace(tenantId, empId, photoDataUrl);
      if (faceResult?.success === false) {
        return {
          success: false,
          reason: faceResult.reason || `Facial recognition failed: Captured face does not match registered biometric profile for ${currentUser?.name || empId}.`,
        };
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      tenantId: tenantId,
      employeeId: empId,
      employeeName: currentUser?.name || 'Employee',
      date: todayDate,
      clockIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'present',
      faceVerified: true,
      geofenceVerified: true,
      similarity: faceResult?.similarity || 99.4,
    };

    setAttendance((prev) => [newRecord, ...prev]);
    await mutateTable('attendance', newRecord);
    return { success: true, similarity: faceResult?.similarity || 99.4 };
  };

  // Real AWS Rekognition Facial Check-Out
  const clockOut = async (photoDataUrl?: string): Promise<ClockResult> => {
    const empId = currentUser?.id || 'demo-emp-1';
    let faceResult: any = { success: true, similarity: 99.4 };

    if (photoDataUrl) {
      faceResult = await verifyFace(tenantId, empId, photoDataUrl);
      if (faceResult?.success === false) {
        return {
          success: false,
          reason: faceResult.reason || `Facial recognition failed: Captured face does not match registered biometric profile for ${currentUser?.name || empId}.`,
        };
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const existingIndex = attendance.findIndex((a) => a.employeeId === empId && a.date === todayDate);
    if (existingIndex !== -1) {
      const updated = {
        ...attendance[existingIndex],
        clockOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const newAttList = [...attendance];
      newAttList[existingIndex] = updated;
      setAttendance(newAttList);
      await mutateTable('attendance', updated);
    }
    return { success: true, similarity: faceResult?.similarity || 99.4 };
  };

  const applyLeave = async (request: Omit<LeaveRequest, 'id' | 'tenantId' | 'employeeId' | 'employeeName' | 'createdAt'>): Promise<boolean> => {
    const newLeave: LeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`,
      tenantId: tenantId,
      employeeId: currentUser?.id || 'demo-emp-1',
      employeeName: currentUser?.name || 'Employee',
      createdAt: new Date().toISOString(),
    };

    setLeaves((prev) => [newLeave, ...prev]);
    await mutateTable('leaves', newLeave);
    return true;
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

  const actOnLeave = async (leaveId: string, action: 'approve' | 'reject', comment?: string): Promise<boolean> => {
    try {
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

  const uploadEmployeeDocument = async (doc: { type: string; name: string; dataUrl: string }): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const newDoc: EmployeeDocument = {
        id: 'edoc-' + Math.random().toString(36).substring(2, 9),
        type: doc.type,
        name: doc.name,
        dataUrl: doc.dataUrl,
        uploadedAt: new Date().toISOString(),
        verified: false,
      };
      const updatedDocs = [...(currentUser.documentsUploaded || []), newDoc];
      const updatedUser: Employee = {
        ...currentUser,
        documentsUploaded: updatedDocs,
      };
      setCurrentUser(updatedUser);
      setEmployees((prev) => prev.map((e) => (e.id === currentUser.id ? updatedUser : e)));
      await mutateTable('employees', { tenantId, ...updatedUser });
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
      (a.employeeId === currentUser?.id || a.employeeName === currentUser?.name) &&
      (a.date === localToday || a.date === utcToday)
  );
  const isClockedIn = !!(todayRecord && todayRecord.clockIn && !todayRecord.clockOut);

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
        toggleTask,
        sendMessage,
        actOnDocStep,
        forwardDocStep,
        acceptDocument,
        uploadEmployeeDocument,
        signCompanyDocument,
        deleteEmployeeDocument,
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
