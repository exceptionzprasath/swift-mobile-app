import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import {
  useAppContext,
  canRoleApproveDocInApp,
  DocRequest,
  EmployeeDocument,
} from '../context/AppContext';

interface DocumentsScreenProps {
  theme: ThemeColors;
}

interface CompanyAgreementItem {
  code: string;
  title: string;
  category: string;
  description: string;
  terms: string;
}

export function formatDocumentTerms(templateText: string, user: any, config: any): string {
  if (!templateText) return '';

  const compName = user?.companyName || config?.companyName || config?.name || config?.legalName || 'Inkpen Erode';
  const compAddress = config?.address || config?.location || 'Technology Hub, Tamil Nadu, India';
  const branchName = user?.branch || config?.branch || (config?.branches?.[0]?.name) || 'Head Office';
  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const joiningDateFormatted = user?.joiningDate || user?.doj || '2026-08-01';

  const annualCtcStr = user?.annualCTC
    ? (typeof user.annualCTC === 'number' ? `₹${user.annualCTC.toLocaleString()}` : user.annualCTC)
    : (user?.basic ? `₹${(user.basic * 12).toLocaleString()}` : '₹3,60,000');

  const monthlyGrossStr = user?.gross
    ? (typeof user.gross === 'number' ? `₹${user.gross.toLocaleString()}` : user.gross)
    : (user?.basic ? `₹${user.basic.toLocaleString()}` : '₹30,000');

  const managerNameStr = user?.reportingManager || 'Reporting Authority';
  const empName = user?.name || 'Employee';
  const empCodeStr = user?.empCode || user?.code || user?.id || 'EMP';
  const designationStr = user?.designation || 'Team Member';
  const deptStr = user?.department || 'General';
  const signatoryNameStr = config?.signatoryName || 'Head of Human Resources & Operations';
  const signatoryRoleStr = config?.signatoryRole || 'Authorized Signatory';

  let rendered = templateText;

  const replaceMap: Record<string, string> = {
    '{{employee_name}}': empName,
    '{{employee_code}}': empCodeStr,
    '{{name}}': empName,
    '{{empCode}}': empCodeStr,
    '{{designation}}': designationStr,
    '{{department}}': deptStr,
    '{{branch_name}}': branchName,
    '{{manager_name}}': managerNameStr,
    '{{company_name}}': compName,
    '{{company}}': compName,
    '{{company_address}}': compAddress,
    '{{joining_date}}': joiningDateFormatted,
    '{{doj}}': joiningDateFormatted,
    '{{current_date}}': todayFormatted,
    '{{today}}': todayFormatted,
    '{{probation_months}}': user?.probationMonths ? `${user.probationMonths} Months` : '6 Months',
    '{{ctc_annual}}': annualCtcStr,
    '{{annualCTC}}': annualCtcStr,
    '{{ctc_monthly}}': monthlyGrossStr,
    '{{gross}}': monthlyGrossStr,
    '{{authorized_signatory_name}}': signatoryNameStr,
    '{{authorized_signatory_designation}}': signatoryRoleStr,
  };

  for (const [placeholder, val] of Object.entries(replaceMap)) {
    rendered = rendered.split(placeholder).join(val);
  }

  return rendered;
}

const DEFAULT_COMPANY_AGREEMENTS: Array<CompanyAgreementItem & { id?: string }> = [
  {
    id: 'doc-joining',
    code: 'JOIN',
    title: 'Joining Form',
    category: 'Onboarding',
    description: 'Employee initial candidate registration and onboarding intake details form.',
    terms: `Date: {{current_date}}

EMPLOYEE JOINING CONFIRMATION & INTAKE

This document acknowledges that {{employee_name}} (Employee Code: {{employee_code}}) has formally reported to duty on {{joining_date}} at {{branch_name}} for the position of {{designation}} under the {{department}} Department.

Reporting Authority: {{manager_name}}
Annual Compensation: {{ctc_annual}} (Monthly Gross: {{ctc_monthly}})

All mandatory onboarding forms, credentials verification, and initial profile entries have been registered with Human Resources.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-offer',
    code: 'OFR',
    title: 'Offer Letter',
    category: 'Onboarding',
    description: 'Formal pre-joining employment offer letter with compensation breakup.',
    terms: `Date: {{current_date}}

To,
{{employee_name}}
Candidate Code: {{employee_code}}

Dear {{employee_name}},

Subject: Offer of Employment for the position of {{designation}}

We are pleased to offer you the position of {{designation}} in the {{department}} Department at {{company_name}}.

Key Terms of Offer:
1. Position: {{designation}}
2. Department: {{department}}
3. Location: {{branch_name}}
4. Date of Joining: {{joining_date}}
5. Annual Total Cost to Company (CTC): {{ctc_annual}} (Fixed Gross Monthly: {{ctc_monthly}})
6. Reporting Authority: {{manager_name}}
7. Probation Period: {{probation_months}} from the date of joining.

Your formal Appointment Letter containing detailed terms and conditions of employment, benefits, and workplace code of conduct will be issued upon joining.

Please sign and return this letter as a token of your formal acceptance of this offer.

We welcome you to {{company_name}} and look forward to a rewarding professional journey together.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-appointment',
    code: 'APT',
    title: 'Appointment Letter',
    category: 'Onboarding',
    description: 'Official contract of employment with full employment terms and conditions.',
    terms: `Date: {{current_date}}

To,
{{employee_name}}
Employee Code: {{employee_code}}
Location: {{branch_name}}

Dear {{employee_name}},

Subject: Letter of Appointment as {{designation}}

With reference to your application, interview, and subsequent offer acceptance, management is pleased to appoint you as {{designation}} in {{company_name}}, effective from your date of joining on {{joining_date}}.

1. Designation & Duties:
You shall perform duties associated with the role of {{designation}} in the {{department}} Department, reporting directly to {{manager_name}}.

2. Remuneration:
Your total annual compensation package (CTC) is fixed at {{ctc_annual}} per annum (monthly gross {{ctc_monthly}}), payable on a monthly basis in accordance with standard company payroll practices.

3. Probation & Confirmation:
You will be on probation for a period of {{probation_months}} from {{joining_date}}. Based on your performance and conduct, your services will be confirmed in writing.

4. Confidentiality & Code of Conduct:
You shall maintain strict confidentiality regarding all company intellectual property, customer records, and trade secrets during and after your tenure.

5. Termination & Notice Period:
Either party may terminate employment with the standard contractual notice period or salary in lieu thereof as per company policy.

We wish you all the best and trust you will make meaningful contributions toward the growth of {{company_name}}.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-nda',
    code: 'NDA',
    title: 'NDA & Confidentiality Agreement',
    category: 'Onboarding',
    description: 'Non-disclosure agreement for intellectual property and confidentiality protection.',
    terms: `NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT

Date: {{current_date}}

Between:
{{company_name}}, having its principal place of business at {{company_address}} (the "Company")

And:
{{employee_name}} (Employee Code: {{employee_code}}), residing as per company personnel records (the "Employee").

1. Confidential Information:
The Employee agrees that all technical data, customer lists, software code, financials, and trade secrets disclosed by {{company_name}} during their employment as {{designation}} are the exclusive intellectual property of the Company.

2. Non-Disclosure Obligations:
The Employee shall protect the confidentiality of the Proprietary Information and shall not disclose it to any unauthorized third party without prior written consent from {{company_name}}.

3. Return of Assets:
Upon departure or request, all physical and electronic documents, devices, and credentials must be returned immediately.

4. Survival of Obligations:
Confidentiality covenants survive termination of employment indefinitely.

Acknowledged & Signed by:
{{employee_name}} ({{employee_code}})
For {{company_name}}`,
  },
  {
    id: 'doc-code-conduct',
    code: 'COC',
    title: 'Employee Code of Conduct & Workplace Ethics',
    category: 'Onboarding',
    description: 'Company policy compliance, ethical conduct, and workplace guidelines acknowledgment.',
    terms: `EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS ACKNOWLEDGMENT

Date: {{current_date}}

I, {{employee_name}} (Employee Code: {{employee_code}}), hereby acknowledge that I have received, read, and understood the Employee Code of Conduct and Workplace Ethics Policy of {{company_name}}.

As a {{designation}} in the {{department}} Department, I commit to:
1. Conducting myself with the highest standards of integrity, respect, and professional behavior.
2. Adhering strictly to anti-harassment, data privacy, and workplace safety guidelines.
3. Reporting to duty punctually at {{branch_name}} under the supervision of {{manager_name}}.
4. Using company assets and systems solely for official business activities.

Employee Signature: _______________________
Name: {{employee_name}} ({{employee_code}})
Date: {{current_date}}

Approved & Registered by HR:
{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_name}}`,
  },
  {
    id: 'doc-asset-handover',
    code: 'ASSET',
    title: 'Asset Handover Forms',
    category: 'Onboarding',
    description: 'Company equipment and hardware handover acknowledgment form.',
    terms: `COMPANY ASSET & EQUIPMENT HANDOVER ACKNOWLEDGMENT FORM

Date: {{current_date}}

Employee Details:
- Name: {{employee_name}}
- Employee Code: {{employee_code}}
- Designation: {{designation}}
- Department: {{department}}
- Work Location: {{branch_name}}

I hereby acknowledge receipt of company-issued equipment (laptop, security badge, official email credentials, and peripherals) in good working condition for official duties with {{company_name}}.

I understand that these assets remain the exclusive property of {{company_name}} and must be returned in good condition upon separation or upon request.

Employee Signature: _______________________
Name: {{employee_name}}
Date: {{current_date}}

Issued By (IT / Asset Custodian):
{{authorized_signatory_name}}
{{authorized_signatory_designation}}
{{company_name}}`,
  },
];

export type CompanyOfficialDocItem = {
  id: string;
  code: string;
  name: string;
  group: string;
  category?: string;
  description: string;
  allowDownload: boolean;
  allowEmployeeRequest: boolean;
  terms: string;
  approvalChain?: string[];
};

const DEFAULT_COMPANY_OFFICIAL_DOCS: CompanyOfficialDocItem[] = [
  {
    id: 'doc-exp',
    code: 'EXP',
    name: 'Work Experience Certificate',
    group: 'V. Exit / Service Verification',
    description: 'Certifies service tenure, employment conduct, and role held with the company.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

EXPERIENCE CERTIFICATE

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) has served as a full-time employee with {{company_name}} from {{joining_date}} to {{current_date}}.

During their service tenure, {{employee_name}} held the position of {{designation}} in the {{department}} Department.

Their conduct, character, and professional competence were found to be commendable.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-salary-cert',
    code: 'SAL',
    name: 'Salary & Income Certificate',
    group: 'VI. Verification',
    description: 'Formal income verification for bank loans, credit cards, or visa processing.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is employed with {{company_name}} as {{designation}} in {{department}}.

Current Remuneration:
- Fixed Gross Monthly: {{ctc_monthly}}
- Total Annual CTC: {{ctc_annual}}

Issued upon request for official verification.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-relieve',
    code: 'REL',
    name: 'Relieving Letter',
    group: 'V. Exit',
    description: 'Formal relieving order certifying clearance of company dues and asset handover.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

RELIEVING LETTER

To,
{{employee_name}} (Employee Code: {{employee_code}})

This is to certify that you have been formally relieved from services as {{designation}} in {{department}} at {{company_name}} following clearance of all organizational dues.

We wish you success in all future endeavors.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-bonafide',
    code: 'BON',
    name: 'Bonafide Employment Certificate',
    group: 'VI. Verification',
    description: 'Official proof of active employment for passport, bank, or housing requirements.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

BONAFIDE CERTIFICATE

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is a bonafide, active full-time employee of {{company_name}}, currently working as {{designation}} in {{department}}.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-prob-confirm',
    code: 'PRB',
    name: 'Probation Confirmation Letter',
    group: 'II. Probation',
    description: 'Official confirmation letter of permanent employment post probation period.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

To,
{{employee_name}} (Employee Code: {{employee_code}})

Subject: Confirmation of Employment Services

Consequent to the successful completion of your probation period, management is pleased to confirm your appointment as permanent {{designation}} in {{company_name}}.

Sincerely,
For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
  {
    id: 'doc-visa-noc',
    code: 'NOC',
    name: 'Visa Support & No Objection Certificate (NOC)',
    group: 'VI. Verification',
    description: 'NOC letter issued for official international travel or visa stamping.',
    allowDownload: true,
    allowEmployeeRequest: true,
    terms: `Date: {{current_date}}

NO OBJECTION CERTIFICATE (NOC)

To Whom It May Concern,

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is employed as {{designation}} with {{company_name}}. The company has No Objection to their visa application and travel.

For {{company_name}}

{{authorized_signatory_name}}
{{authorized_signatory_designation}}`,
  },
];

const KYC_DOC_CATEGORIES = [
  'Aadhaar Card (Front & Back)',
  'PAN Card',
  'Bank Passbook / Cancelled Cheque',
  'Highest Educational Degree / Certificate',
  'Relieving / Experience Letter',
  'Passport / Voter ID',
  'Other Document',
];

export function DocumentsScreen({ theme }: DocumentsScreenProps) {
  const {
    currentUser,
    companyConfig,
    docRequests,
    userRole,
    canApproveDocuments,
    actOnDocStep,
    forwardDocStep,
    acceptDocument,
    requestDocument,
    signCompanyDocument,
    uploadEmployeeDocument,
    deleteEmployeeDocument,
    employees,
    roles,
    refreshData,
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (err) {
      console.warn('DocumentsScreen refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'onboarding' | 'documents' | 'uploads' | 'approvals'>('onboarding');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Dynamically resolve ALL onboarding agreement templates from Approval Settings
  const companyAgreements: CompanyAgreementItem[] = useMemo(() => {
    const allDocWorkflows: any[] =
      companyConfig?.approvalWorkflows?.documents ||
      companyConfig?.workflows?.documents ||
      companyConfig?.documentTypes ||
      [];

    // Extract all workflows belonging to the Onboarding section that are marked active
    const onboardingWorkflows = allDocWorkflows.filter((w: any) => {
      // If admin toggled active to false, hide from mobile app
      if (w.active === false) return false;
      const g = (w.group || '').toLowerCase();
      const n = (w.name || '').toLowerCase();
      const id = (w.id || '').toLowerCase();
      return (
        g.includes('onboarding') ||
        id.includes('joining') ||
        id.includes('offer') ||
        id.includes('appointment') ||
        id.includes('nda') ||
        id.includes('code-conduct') ||
        id.includes('asset-handover') ||
        n.includes('joining') ||
        n.includes('offer') ||
        n.includes('appointment') ||
        n.includes('nda') ||
        n.includes('conduct') ||
        n.includes('asset')
      );
    });

    if (allDocWorkflows.length > 0) {
      return onboardingWorkflows.map((w: any) => {
        const defaultMatch = DEFAULT_COMPANY_AGREEMENTS.find(
          (d) => d.id === w.id || d.title.toLowerCase() === (w.name || '').toLowerCase()
        );

        return {
          code: defaultMatch?.code || (w.id ? w.id.replace('doc-', '').toUpperCase() : 'DOC'),
          title: w.name || defaultMatch?.title || 'Onboarding Document',
          category: 'Onboarding',
          description: w.description || defaultMatch?.description || 'Official onboarding agreement requirement.',
          terms: w.documentTemplate || defaultMatch?.terms || `Date: {{current_date}}\n\nTo,\n{{employee_name}} ({{employee_code}})\n\nSubject: ${w.name}\n\nThis is an official onboarding document for {{company_name}}.\n\nSincerely,\nFor {{company_name}}`,
        };
      });
    }

    return DEFAULT_COMPANY_AGREEMENTS;
  }, [companyConfig]);

  // Dynamically resolve ALL Non-Onboarding Company Documents (Requestable & Downloadable)
  const companyOfficialDocs: CompanyOfficialDocItem[] = useMemo(() => {
    const allDocWorkflows: any[] =
      companyConfig?.approvalWorkflows?.documents ||
      companyConfig?.workflows?.documents ||
      companyConfig?.documentTypes ||
      [];

    // Filter for all active non-onboarding documents
    const nonOnboardingWorkflows = allDocWorkflows.filter((w: any) => {
      if (w.active === false) return false;
      const g = (w.group || '').toLowerCase();
      const id = (w.id || '').toLowerCase();
      return !g.includes('onboarding') && !['doc-joining', 'doc-offer', 'doc-appointment', 'doc-nda', 'doc-code-conduct', 'doc-asset-handover'].includes(id);
    });

    if (nonOnboardingWorkflows.length > 0) {
      return nonOnboardingWorkflows.map((w: any) => {
        const defaultMatch = DEFAULT_COMPANY_OFFICIAL_DOCS.find(
          (d) => d.id === w.id || d.name.toLowerCase() === (w.name || '').toLowerCase()
        );

        const manualStepRoles = (w.manualSteps || []).map((s: any) => s.role || s.name || 'HR Manager');

        return {
          id: w.id,
          code: defaultMatch?.code || (w.id ? w.id.replace('doc-', '').toUpperCase().slice(0, 4) : 'DOC'),
          name: w.name || defaultMatch?.name || 'Company Document',
          group: w.group || defaultMatch?.group || 'Official Records',
          description: w.description || defaultMatch?.description || 'Official company letter template.',
          allowDownload: w.allowDownload !== false,
          allowEmployeeRequest: w.allowEmployeeRequest !== false,
          terms: w.documentTemplate || defaultMatch?.terms || `Date: {{current_date}}\n\nTo,\n{{employee_name}} ({{employee_code}})\n\nSubject: ${w.name}\n\nThis is an official certificate from {{company_name}}.\n\nSincerely,\nFor {{company_name}}`,
          approvalChain: manualStepRoles.length > 0 ? manualStepRoles : ['HR Manager'],
        };
      });
    }

    return DEFAULT_COMPANY_OFFICIAL_DOCS;
  }, [companyConfig]);

  // Modal states for signing company agreement
  const [signingAgr, setSigningAgr] = useState<CompanyAgreementItem | null>(null);
  const [agrSignatureText, setAgrSignatureText] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Modal states for requesting document
  const [requestingDoc, setRequestingDoc] = useState<CompanyOfficialDocItem | null>(null);
  const [requestDocNote, setRequestDocNote] = useState('');
  const [submittingDocReq, setSubmittingDocReq] = useState(false);

  // Modal states for viewing / downloading document
  const [previewingLetter, setPreviewingLetter] = useState<CompanyOfficialDocItem | null>(null);

  // Modal states for doc requests
  const [signingDocReq, setSigningDocReq] = useState<DocRequest | null>(null);
  const [docReqSignatureText, setDocReqSignatureText] = useState('');

  // Modal states for uploading new document (supports multiple pages / photos)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(KYC_DOC_CATEGORIES[0]);
  const [uploadDocName, setUploadDocName] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ uri: string; dataUrl: string; sizeKb?: string }>>([]);

  // Document preview modal with multi-page navigation
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  // Manager action states
  const [actingDoc, setActingDoc] = useState<{ req: DocRequest; action: 'approve' | 'forward' | 'reject' } | null>(null);
  const [forwardToRole, setForwardToRole] = useState('CEO / Super Admin');
  const [approvalComment, setApprovalComment] = useState('');
  const [busy, setBusy] = useState(false);

  const forwardOptions = [
    'CEO / Super Admin',
    'Director',
    'General Manager',
    ...(roles || []).map((r) => r.name).filter((name) => name !== 'General Employee' && name !== userRole?.name),
  ];

  // Active employee record synced from employees state or currentUser
  const activeEmployee = (employees || []).find(
    (e) => e.id === currentUser?.id || (e.empCode && e.empCode === currentUser?.empCode)
  ) || currentUser;

  // Employee's signed agreements & uploaded KYC docs
  const signedDocs = activeEmployee?.signedDocs || currentUser?.signedDocs || {};
  const uploadedDocs = activeEmployee?.documentsUploaded || currentUser?.documentsUploaded || [];

  // Doc requests issued to current employee
  const myIssuedDocs = (docRequests || []).filter(
    (d) => d.employeeId === currentUser?.id || d.employeeId === currentUser?.empCode
  );

  // Pending Approvals for Manager/HR
  const pendingApprovals = (docRequests || []).filter((d) => {
    if (d.status !== 'pending') return false;
    return canRoleApproveDocInApp(userRole, d.letterKey);
  });

  // Calculate pending sign count for badge
  const pendingAgreementCount = companyAgreements.filter((agr) => {
    const isSigned = !!signedDocs[agr.code] || (agr.code === 'APT' && currentUser?.acceptance?.signed);
    return !isSigned;
  }).length;

  const pendingDocReqCount = myIssuedDocs.filter((d) => d.status === 'approved' && !d.employeeAccepted).length;
  const totalActionNeeded = pendingAgreementCount + pendingDocReqCount;

  // --- Handlers for Signing Company Agreements ---
  const handleOpenSignAgreement = (agr: CompanyAgreementItem) => {
    setSigningAgr(agr);
    setAgrSignatureText(currentUser?.name || '');
    setHasAcknowledged(false);
  };

  const handleConfirmSignAgreement = async () => {
    if (!signingAgr) return;
    if (!hasAcknowledged) {
      Alert.alert('Acknowledgement Required', 'Please check the box confirming you have read and agree to all terms.');
      return;
    }
    if (!agrSignatureText.trim()) {
      Alert.alert('Signature Required', 'Please enter your legal name as your digital signature.');
      return;
    }

    setBusy(true);
    const ok = await signCompanyDocument(
      signingAgr.code,
      signingAgr.title,
      agrSignatureText.trim(),
      undefined
    );
    setBusy(false);

    if (ok) {
      Alert.alert('Document E-Signed & Accepted', `You have successfully signed "${signingAgr.title}". It has been submitted to HR.`);
      setSigningAgr(null);
    } else {
      Alert.alert('Error', 'Failed to submit digital signature. Please try again.');
    }
  };

  // --- Handlers for Doc Requests ---
  const handleOpenSignDocReq = (doc: DocRequest) => {
    setSigningDocReq(doc);
    setDocReqSignatureText(currentUser?.name || '');
  };

  const handleConfirmSignDocReq = async () => {
    if (!signingDocReq) return;
    if (!docReqSignatureText.trim()) {
      Alert.alert('Signature Required', 'Please enter your full legal name to e-sign this document.');
      return;
    }

    setBusy(true);
    const ok = await acceptDocument(signingDocReq.id, `E-Signed by ${docReqSignatureText.trim()}`);
    setBusy(false);
    if (ok) {
      Alert.alert('Document Accepted', `You have successfully signed and accepted "${signingDocReq.letterTitle}".`);
      setSigningDocReq(null);
    } else {
      Alert.alert('Error', 'Failed to record document acceptance.');
    }
  };

  // --- Handlers for Uploading Multi-Page KYC Proofs ---
  const handlePickFromCamera = async () => {
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
      });
      if (res.didCancel || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (asset.base64) {
        const dataUrl = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
        const sizeKb = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '';
        setAttachedFiles((prev) => [...prev, { uri: asset.uri || '', dataUrl, sizeKb }]);
      }
      if (!uploadDocName.trim()) {
        setUploadDocName(`${uploadCategory} - ${currentUser?.name || 'Employee'}`);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not open device camera.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        selectionLimit: 0, // 0 allows selecting multiple images
      });
      if (res.didCancel || !res.assets || res.assets.length === 0) return;

      const newFiles = res.assets
        .filter((asset) => !!asset.base64)
        .map((asset) => ({
          uri: asset.uri || '',
          dataUrl: `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`,
          sizeKb: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '',
        }));

      setAttachedFiles((prev) => [...prev, ...newFiles]);

      if (!uploadDocName.trim()) {
        const first = res.assets[0];
        setUploadDocName(first?.fileName ? first.fileName.replace(/\.[^/.]+$/, '') : `${uploadCategory} - ${currentUser?.name || 'Employee'}`);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not access photo library.');
    }
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmUpload = async () => {
    if (attachedFiles.length === 0) {
      Alert.alert('Files Required', 'Please attach at least one photo or document page using the camera or gallery.');
      return;
    }

    const docTitle = uploadDocName.trim() || `${uploadCategory} - ${currentUser?.name || 'Employee'}`;
    setBusy(true);

    const dataUrls = attachedFiles.map((f) => f.dataUrl);

    const ok = await uploadEmployeeDocument({
      type: uploadCategory,
      name: docTitle,
      dataUrl: dataUrls[0],
      files: dataUrls,
    });
    setBusy(false);

    if (ok) {
      Alert.alert(
        'Document Uploaded Successfully',
        `"${docTitle}" (${attachedFiles.length} page${attachedFiles.length > 1 ? 's' : ''}) has been saved successfully.`
      );
      setUploadDocName('');
      setAttachedFiles([]);
      setUploadModalOpen(false);
    } else {
      Alert.alert('Upload Failed', 'Could not upload document. Please check your connection and try again.');
    }
  };

  const handleDeleteUploadedDoc = (doc: EmployeeDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to remove "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEmployeeDocument(doc.id);
            Alert.alert('Removed', 'Document has been deleted from your locker.');
          },
        },
      ]
    );
  };

  // --- Handlers for Manager Approvals ---
  const handleOpenActionModal = (req: DocRequest, action: 'approve' | 'forward' | 'reject') => {
    if (!canRoleApproveDocInApp(userRole, req.letterKey)) {
      Alert.alert('Access Denied', `Your assigned role (${userRole?.name || 'Employee'}) does not have permission.`);
      return;
    }
    setActingDoc({ req, action });
    setForwardToRole('CEO / Super Admin');
    setApprovalComment('');
  };

  const handleConfirmAction = async () => {
    if (!actingDoc) return;
    setBusy(true);

    if (actingDoc.action === 'forward') {
      const ok = await forwardDocStep(actingDoc.req.id, forwardToRole, approvalComment.trim());
      setBusy(false);
      if (ok) {
        Alert.alert('Approved & Forwarded', `"${actingDoc.req.letterTitle}" forwarded to ${forwardToRole}.`);
        setActingDoc(null);
      } else {
        Alert.alert('Error', 'Failed to forward approval request.');
      }
    } else {
      const ok = await actOnDocStep(actingDoc.req.id, actingDoc.action, approvalComment.trim());
      setBusy(false);
      if (ok) {
        Alert.alert(
          actingDoc.action === 'approve' ? 'Document Approved' : 'Document Rejected',
          `Request for "${actingDoc.req.letterTitle}" has been ${actingDoc.action === 'approve' ? 'approved' : 'rejected'}.`
        );
        setActingDoc(null);
      } else {
        Alert.alert('Error', 'Failed to update approval status.');
      }
    }
  };

  // --- Handlers for Requesting Official Company Documents ---
  const handleOpenRequestDoc = (doc: CompanyOfficialDocItem) => {
    setRequestingDoc(doc);
    setRequestDocNote('');
  };

  const handleSubmitDocRequest = async () => {
    if (!requestingDoc) return;
    setSubmittingDocReq(true);
    const ok = await requestDocument({
      letterKey: requestingDoc.id,
      letterTitle: requestingDoc.name,
      note: requestDocNote.trim(),
      approvalChain: requestingDoc.approvalChain || ['HR Manager'],
    });
    setSubmittingDocReq(false);

    if (ok) {
      Alert.alert(
        'Request Submitted Successfully',
        `Your request for "${requestingDoc.name}" has been submitted for approval. You will receive email notifications as each approver acts.`
      );
      setRequestingDoc(null);
      setRequestDocNote('');
    } else {
      Alert.alert('Request Failed', 'Could not submit document request. Please check your connection and try again.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Documents &amp; Signatures</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {currentUser?.name} · {currentUser?.designation || 'Employee'} ({currentUser?.empCode || 'SWIFT'})
          </Text>
        </View>
      </View>

      {/* Segmented Tab Navigation (4 Tabs) */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'onboarding' && [styles.activeTabBtn, { backgroundColor: theme.card }],
          ]}
          onPress={() => setActiveTab('onboarding')}
        >
          <View style={styles.tabBadgeRow}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'onboarding' ? theme.primary : theme.textMuted },
                activeTab === 'onboarding' && styles.activeTabText,
              ]}
            >
              Onboarding
            </Text>
            {totalActionNeeded > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.counterText}>{totalActionNeeded}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'documents' && [styles.activeTabBtn, { backgroundColor: theme.card }],
          ]}
          onPress={() => setActiveTab('documents')}
        >
          <View style={styles.tabBadgeRow}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'documents' ? theme.primary : theme.textMuted },
                activeTab === 'documents' && styles.activeTabText,
              ]}
            >
              Documents
            </Text>
            {companyOfficialDocs.length > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.counterText}>{companyOfficialDocs.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'uploads' && [styles.activeTabBtn, { backgroundColor: theme.card }],
          ]}
          onPress={() => setActiveTab('uploads')}
        >
          <View style={styles.tabBadgeRow}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'uploads' ? theme.primary : theme.textMuted },
                activeTab === 'uploads' && styles.activeTabText,
              ]}
            >
              My Uploads &amp; KYC
            </Text>
            {uploadedDocs.length > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.counterText}>{uploadedDocs.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {canApproveDocuments && (
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'approvals' && [styles.activeTabBtn, { backgroundColor: theme.card }],
            ]}
            onPress={() => setActiveTab('approvals')}
          >
            <View style={styles.tabBadgeRow}>
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'approvals' ? theme.primary : theme.textMuted },
                  activeTab === 'approvals' && styles.activeTabText,
                ]}
              >
                Approvals
              </Text>
              {pendingApprovals.length > 0 && (
                <View style={[styles.counterBadge, { backgroundColor: '#f59e0b' }]}>
                  <Text style={styles.counterText}>{pendingApprovals.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================ */}
      {/* TAB 1: ONBOARDING & COMPANY AGREEMENTS (E-SIGN & ACKNOWLEDGE) */}
      {/* ============================================================ */}
      {activeTab === 'onboarding' && (
        <View style={styles.tabSection}>
          <View style={[styles.infoBanner, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="document" size={20} color={theme.primary} />
            <Text style={[styles.infoBannerText, { color: theme.textPrimary }]}>
              Please review each onboarding document below, acknowledge the terms, and e-sign. Your signed copies will be instantly updated in the company admin records.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>
            Company Onboarding Agreements ({companyAgreements.length})
          </Text>

          <View style={styles.cardList}>
            {companyAgreements.map((agr) => {
              const isSigned = !!signedDocs[agr.code] || (agr.code === 'APT' && currentUser?.acceptance?.signed);
              const sigInfo = signedDocs[agr.code];
              const signedDate = sigInfo?.signedAt || currentUser?.acceptance?.signedAt;
              const signedBy = sigInfo?.signatureText || currentUser?.name;

              return (
                <View
                  key={agr.code}
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: !isSigned ? '#f59e0b' : theme.cardBorder,
                      borderWidth: !isSigned ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={[styles.docIconBg, { backgroundColor: isSigned ? '#dcfce7' : '#fef3c7' }]}>
                    <Icon name="document" size={22} color={isSigned ? '#16a34a' : '#d97706'} />
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{agr.title}</Text>
                    </View>
                    <Text style={[styles.docMeta, { color: theme.textMuted }]}>
                      Code: {agr.code} · {agr.category}
                    </Text>
                    <Text style={[styles.docDesc, { color: theme.textMuted }]} numberOfLines={2}>
                      {agr.description}
                    </Text>

                    {/* Status badge */}
                    <View style={styles.statusPillRow}>
                      {isSigned ? (
                        <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                          <Text style={[styles.statusPillText, { color: '#15803d' }]}>
                            ✅ Signed by {signedBy} · {signedDate ? new Date(signedDate).toLocaleDateString() : 'Active'}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, { backgroundColor: '#fee2e2' }]}>
                          <Text style={[styles.statusPillText, { color: '#b91c1c' }]}>
                            ✍️ Pending Employee Signature
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Action button */}
                  <View style={styles.actionsCol}>
                    {!isSigned ? (
                      <TouchableOpacity
                        style={[styles.signBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleOpenSignAgreement(agr)}
                      >
                        <Text style={styles.signBtnText}>Sign &amp; Accept</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.reSignBtn, { borderColor: theme.cardBorder }]}
                        onPress={() => handleOpenSignAgreement(agr)}
                      >
                        <Text style={[styles.reSignBtnText, { color: theme.primary }]}>View / Re-sign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* TAB 2: OFFICIAL DOCUMENTS, CERTIFICATES & REQUESTS */}
      {/* ============================================================ */}
      {activeTab === 'documents' && (
        <View style={styles.tabSection}>
          <View style={[styles.infoBanner, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="document" size={20} color={theme.primary} />
            <Text style={[styles.infoBannerText, { color: theme.textPrimary }]}>
              Browse official company letters and certificates. Download approved documents directly or request certificates with automated multi-stage email approvals.
            </Text>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="document" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              value={docSearchQuery}
              onChangeText={setDocSearchQuery}
              placeholder="Search company letters & certificates..."
              placeholderTextColor={theme.textMuted}
            />
            {docSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setDocSearchQuery('')}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>
            Official Company Documents ({companyOfficialDocs.length})
          </Text>

          <View style={styles.cardList}>
            {companyOfficialDocs
              .filter((doc) => {
                if (!docSearchQuery.trim()) return true;
                const q = docSearchQuery.toLowerCase();
                return doc.name.toLowerCase().includes(q) || doc.group.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q);
              })
              .map((doc) => {
                // Find if current employee has any pending or approved request for this document
                const existingReq = myIssuedDocs.find(
                  (r) => r.letterKey === doc.id || r.letterTitle?.toLowerCase() === doc.name.toLowerCase()
                );

                const isPending = existingReq?.status === 'pending';
                const isApproved = existingReq?.status === 'approved';
                const isRejected = existingReq?.status === 'rejected';

                const totalSteps = existingReq?.steps?.length || 1;
                const currentStepIdx = (existingReq?.currentStep || 0) + 1;
                const currentApprover = existingReq?.steps?.[existingReq?.currentStep || 0]?.approver || 'Approver';

                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.docCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isApproved ? '#10b981' : isPending ? '#f59e0b' : theme.cardBorder,
                        borderWidth: isApproved || isPending ? 1.5 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.docIconBg, { backgroundColor: isApproved ? '#dcfce7' : isPending ? '#fef3c7' : '#eff6ff' }]}>
                      <Icon name="document" size={22} color={isApproved ? '#16a34a' : isPending ? '#d97706' : theme.primary} />
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{doc.name}</Text>
                      </View>

                      <Text style={[styles.docMeta, { color: theme.textMuted }]}>
                        {doc.group}
                      </Text>

                      <Text style={[styles.docDesc, { color: theme.textMuted }]} numberOfLines={2}>
                        {doc.description}
                      </Text>

                      {/* Attribute Badges */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {doc.allowDownload && (
                          <View style={[styles.attrBadge, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.attrBadgeText, { color: '#15803d' }]}>📥 Downloadable</Text>
                          </View>
                        )}
                        {doc.allowEmployeeRequest && (
                          <View style={[styles.attrBadge, { backgroundColor: '#e0f2fe' }]}>
                            <Text style={[styles.attrBadgeText, { color: '#0369a1' }]}>📝 Requestable</Text>
                          </View>
                        )}
                      </View>

                      {/* Request status banner if exists */}
                      {existingReq && (
                        <View style={{ marginTop: 8 }}>
                          {isPending && (
                            <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
                              <Text style={[styles.statusPillText, { color: '#b45309' }]}>
                                ⏳ In Review: Step {currentStepIdx} of {totalSteps} ({currentApprover})
                              </Text>
                            </View>
                          )}
                          {isApproved && (
                            <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                              <Text style={[styles.statusPillText, { color: '#15803d' }]}>
                                ✅ Approved by Management · Ready to Download
                              </Text>
                            </View>
                          )}
                          {isRejected && (
                            <View style={[styles.statusPill, { backgroundColor: '#fee2e2' }]}>
                              <Text style={[styles.statusPillText, { color: '#b91c1c' }]}>
                                ❌ Request Declined
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionsCol}>
                      {doc.allowDownload && (
                        <TouchableOpacity
                          style={[styles.downloadBtn, { backgroundColor: '#059669', marginBottom: doc.allowEmployeeRequest ? 6 : 0 }]}
                          onPress={() => setPreviewingLetter(doc)}
                        >
                          <Text style={styles.downloadBtnText}>📥 Download</Text>
                        </TouchableOpacity>
                      )}

                      {doc.allowEmployeeRequest && (
                        <TouchableOpacity
                          style={[
                            styles.requestDocBtn,
                            {
                              backgroundColor: isPending ? theme.inputBg : theme.primary,
                              borderColor: isPending ? theme.cardBorder : theme.primary,
                            },
                          ]}
                          onPress={() => handleOpenRequestDoc(doc)}
                          disabled={isPending}
                        >
                          <Text style={[styles.requestDocBtnText, isPending && { color: theme.textMuted }]}>
                            {isPending ? 'In Review' : 'Request'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MY UPLOADS & KYC DOCUMENT LOCKER */}
      {/* ============================================================ */}
      {activeTab === 'uploads' && (
        <View style={styles.tabSection}>
          <View style={[styles.uploadHeaderCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.uploadCardTitle, { color: theme.textPrimary }]}>Employee Document Locker</Text>
              <Text style={[styles.uploadCardDesc, { color: theme.textMuted }]}>
                Upload identity proofs, Aadhaar, PAN, educational degrees, and previous employer letters. All uploaded files are synced to HR admin.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.uploadActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setUploadModalOpen(true)}
            >
              <Text style={styles.uploadActionBtnText}>+ Upload New</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 18 }]}>
            Uploaded Documents ({uploadedDocs.length})
          </Text>

          {uploadedDocs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="document" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Documents Uploaded Yet</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Tap the "+ Upload New" button above to upload your Aadhaar, PAN card, degree certificates, or bank passbook copy.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {uploadedDocs.map((doc) => (
                <View
                  key={doc.id}
                  style={[styles.uploadedDocCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={[styles.docIconBg, { backgroundColor: theme.tealSoft }]}>
                    <Icon name="document" size={22} color={theme.primary} />
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{doc.name}</Text>
                    <Text style={[styles.docMeta, { color: theme.textMuted }]}>
                      {doc.type} · Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Text>

                    <View style={styles.statusPillRow}>
                      {doc.verified ? (
                        <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                          <Text style={[styles.statusPillText, { color: '#15803d' }]}>✅ Verified by HR</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
                          <Text style={[styles.statusPillText, { color: '#b45309' }]}>⏳ Pending Review</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.uploadedActionRow}>
                    <TouchableOpacity
                      style={[styles.viewDocBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                      onPress={() => setPreviewDoc(doc)}
                    >
                      <Text style={[styles.viewDocBtnText, { color: theme.primary }]}>Preview</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.deleteDocBtn, { backgroundColor: '#fee2e2' }]}
                      onPress={() => handleDeleteUploadedDoc(doc)}
                    >
                      <Text style={styles.deleteDocBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MANAGER APPROVALS (IF USER HAS PERMISSIONS) */}
      {/* ============================================================ */}
      {activeTab === 'approvals' && canApproveDocuments && (
        <View style={styles.tabSection}>
          <View style={[styles.roleBanner, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="shield" size={18} color={theme.primary} />
            <Text style={[styles.roleBannerText, { color: theme.textPrimary }]}>
              Authorized as <Text style={{ fontWeight: '800' }}>{userRole?.name}</Text>. You can approve, forward, or reject document requests.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>
            Pending Review ({pendingApprovals.length})
          </Text>

          {pendingApprovals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="check" size={28} color={theme.primary} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                All caught up! No pending document approvals requiring your action right now.
              </Text>
            </View>
          ) : (
            pendingApprovals.map((req) => {
              const targetEmp = employees.find((e) => e.id === req.employeeId || e.empCode === req.employeeId);
              return (
                <View key={req.id} style={[styles.approvalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.approvalHeader}>
                    <View>
                      <Text style={[styles.approvalEmpName, { color: theme.textPrimary }]}>
                        {targetEmp?.name || req.employeeName || 'Employee'}
                      </Text>
                      <Text style={[styles.approvalEmpMeta, { color: theme.textMuted }]}>
                        {targetEmp?.department || 'Department'} · {targetEmp?.designation || 'Role'} · Code: {targetEmp?.empCode || req.employeeId}
                      </Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: theme.tealSoft }]}>
                      <Text style={[styles.typeBadgeText, { color: theme.primary }]}>{req.letterTitle}</Text>
                    </View>
                  </View>

                  {req.note ? (
                    <Text style={[styles.reqNote, { color: theme.textMuted }]}>Note: "{req.note}"</Text>
                  ) : null}

                  <Text style={[styles.reqDate, { color: theme.textMuted }]}>
                    Requested by {req.requestedBy} on {new Date(req.requestedAt).toLocaleDateString()}
                  </Text>

                  <View style={styles.approvalActionRow}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { borderColor: '#ef4444' }]}
                      onPress={() => handleOpenActionModal(req, 'reject')}
                    >
                      <Text style={styles.rejectBtnText}>✕ Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.forwardBtn, { backgroundColor: theme.inputBg, borderColor: theme.primary }]}
                      onPress={() => handleOpenActionModal(req, 'forward')}
                    >
                      <Text style={[styles.forwardBtnText, { color: theme.primary }]}>↗ Forward</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => handleOpenActionModal(req, 'approve')}
                    >
                      <Text style={styles.approveBtnText}>✓ Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* MODAL: SIGN COMPANY AGREEMENT */}
      {/* ============================================================ */}
      <Modal visible={!!signingAgr} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>E-Sign &amp; Accept Agreement</Text>
            <Text style={[styles.modalSubtitle, { color: theme.primary }]}>
              {signingAgr?.title} ({signingAgr?.code})
            </Text>

            {/* Document terms scroll */}
            <ScrollView style={[styles.termsBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.termsTitle, { color: theme.textPrimary, marginBottom: 8 }]}>Official Document & Terms:</Text>
              <Text style={[styles.termsText, { color: theme.textPrimary, lineHeight: 21, fontSize: 13 }]}>
                {formatDocumentTerms(signingAgr?.terms || '', currentUser, companyConfig)}
              </Text>
            </ScrollView>

            {/* Acknowledgement Checkbox */}
            <TouchableOpacity
              style={styles.ackRow}
              onPress={() => setHasAcknowledged(!hasAcknowledged)}
            >
              <View style={[styles.checkboxBox, hasAcknowledged && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {hasAcknowledged && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.ackLabel, { color: theme.textPrimary }]}>
                I confirm that I have read, understood, and voluntarily agree to all terms and conditions of this agreement.
              </Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 10 }]}>Type Legal Full Name to E-Sign:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={agrSignatureText}
              onChangeText={setAgrSignatureText}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setSigningAgr(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: hasAcknowledged ? theme.primary : '#94a3b8' },
                ]}
                onPress={handleConfirmSignAgreement}
                disabled={busy || !hasAcknowledged}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit E-Signature</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: SIGN DOC REQUEST */}
      {/* ============================================================ */}
      <Modal visible={!!signingDocReq} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>E-Sign &amp; Accept Document</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {signingDocReq?.letterTitle}
            </Text>

            <View style={[styles.signAgreementBox, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.signAgreementText, { color: theme.textPrimary }]}>
                "I hereby confirm that I have read, understood, and voluntarily accept the terms stated in this {signingDocReq?.letterTitle}."
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Type Legal Full Name to Sign:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={docReqSignatureText}
              onChangeText={setDocReqSignatureText}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setSigningDocReq(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmSignDocReq}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Accept &amp; Sign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: UPLOAD NEW KYC / SUPPORTING DOCUMENT */}
      {/* ============================================================ */}
      <Modal visible={uploadModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Upload Employee Document</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Select document category and attach your file
            </Text>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Document Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsRow}>
              {KYC_DOC_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    uploadCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setUploadCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: theme.textPrimary },
                      uploadCategory === cat && { color: '#ffffff', fontWeight: 'bold' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Document Title / File Name:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={uploadDocName}
              onChangeText={setUploadDocName}
              placeholder={`e.g. ${uploadCategory} - Front & Back`}
              placeholderTextColor={theme.textMuted}
            />

            {/* Document Photo / File Selection (Multi-Page / Multi-Image Support) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary, marginBottom: 0 }]}>
                Attached Pages / Scans ({attachedFiles.length}):
              </Text>
              {attachedFiles.length > 1 && (
                <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                  {attachedFiles.length} Pages Attached
                </Text>
              )}
            </View>

            {attachedFiles.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachedScroll}>
                {attachedFiles.map((file, idx) => (
                  <View key={idx} style={[styles.attachedThumbCard, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <Image source={{ uri: file.uri }} style={styles.attachedThumbImg} resizeMode="cover" />
                    <View style={styles.pageBadge}>
                      <Text style={styles.pageBadgeText}>Page {idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeThumbBtn}
                      onPress={() => handleRemoveAttachedFile(idx)}
                    >
                      <Text style={styles.removeThumbBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.pickerBtnRow}>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: theme.inputBg, borderColor: theme.primary }]}
                onPress={handlePickFromCamera}
              >
                <Icon name="camera" size={18} color={theme.primary} />
                <Text style={[styles.pickerBtnText, { color: theme.primary }]}>
                  {attachedFiles.length > 0 ? '+ Snap Page' : 'Snap Photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: theme.inputBg, borderColor: theme.cyan }]}
                onPress={handlePickFromGallery}
              >
                <Icon name="document" size={18} color={theme.cyan} />
                <Text style={[styles.pickerBtnText, { color: theme.cyan }]}>
                  {attachedFiles.length > 0 ? '+ Add Gallery' : 'Pick Photos (Multi)'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fileAttachmentNotice, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginTop: 4 }]}>
              <Icon name="document" size={16} color={theme.primary} />
              <Text style={[styles.fileAttachmentText, { color: theme.textMuted }]}>
                Tip: You can attach multiple images (e.g. Aadhaar Front & Back, multi-page marksheet). All pages sync to HR Admin.
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => {
                  setAttachedFiles([]);
                  setUploadModalOpen(false);
                }}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary, opacity: attachedFiles.length === 0 ? 0.7 : 1 }]}
                onPress={handleConfirmUpload}
                disabled={busy || attachedFiles.length === 0}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Upload {attachedFiles.length > 1 ? `(${attachedFiles.length} Pages)` : '& Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: PREVIEW DOCUMENT (WITH MULTI-PAGE NAVIGATION) */}
      {/* ============================================================ */}
      <Modal visible={!!previewDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '88%' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{previewDoc?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Category: {previewDoc?.type} · Uploaded on {previewDoc?.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleDateString() : 'N/A'}
            </Text>

            {(() => {
              const allPages = (previewDoc?.files && previewDoc.files.length > 0) ? previewDoc.files : (previewDoc?.dataUrl ? [previewDoc.dataUrl] : []);
              const activeImg = allPages[previewPageIndex] || allPages[0];

              return (
                <View style={[styles.docPreviewArea, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                  {activeImg && (activeImg.startsWith('http') || activeImg.startsWith('data:image')) ? (
                    <Image
                      source={{ uri: activeImg }}
                      style={styles.fullPreviewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <>
                      <Icon name="document" size={48} color={theme.primary} />
                      <Text style={[styles.docPreviewText, { color: theme.textPrimary, marginTop: 8 }]}>
                        {previewDoc?.name}
                      </Text>
                    </>
                  )}

                  {/* Multi-page Navigation */}
                  {allPages.length > 1 && (
                    <View style={styles.pageNavRow}>
                      <TouchableOpacity
                        style={[styles.pageNavBtn, { opacity: previewPageIndex === 0 ? 0.3 : 1 }]}
                        disabled={previewPageIndex === 0}
                        onPress={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                      >
                        <Text style={[styles.pageNavBtnText, { color: theme.primary }]}>◀ Prev</Text>
                      </TouchableOpacity>

                      <Text style={[styles.pageNavCounter, { color: theme.textPrimary }]}>
                        Page {previewPageIndex + 1} of {allPages.length}
                      </Text>

                      <TouchableOpacity
                        style={[styles.pageNavBtn, { opacity: previewPageIndex === allPages.length - 1 ? 0.3 : 1 }]}
                        disabled={previewPageIndex === allPages.length - 1}
                        onPress={() => setPreviewPageIndex((p) => Math.min(allPages.length - 1, p + 1))}
                      >
                        <Text style={[styles.pageNavBtnText, { color: theme.primary }]}>Next ▶</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[styles.docPreviewSub, { color: theme.textMuted }]}>
                    {previewDoc?.verified ? '✅ Verified Document by HR Admin' : '⏳ Awaiting HR Admin Verification'}
                  </Text>
                </View>
              );
            })()}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary, width: '100%' }]}
                onPress={() => {
                  setPreviewPageIndex(0);
                  setPreviewDoc(null);
                }}
              >
                <Text style={styles.modalConfirmText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: MANAGER ACTION (APPROVE / FORWARD / REJECT) */}
      {/* ============================================================ */}
      <Modal visible={!!actingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {actingDoc?.action === 'approve'
                ? 'Approve Document'
                : actingDoc?.action === 'forward'
                  ? 'Approve & Forward to Next Role'
                  : 'Reject Document'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {actingDoc?.req.letterTitle}
            </Text>

            {actingDoc?.action === 'forward' && (
              <View style={styles.forwardRoleSection}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                  Select Target Approver Position / Role:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChipsRow}>
                  {Array.from(new Set(forwardOptions)).map((roleOption) => (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleChip,
                        { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                        forwardToRole === roleOption && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setForwardToRole(roleOption)}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: theme.textPrimary },
                          forwardToRole === roleOption && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {roleOption === 'CEO / Super Admin' ? '👑 ' : ''}{roleOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
              {actingDoc?.action === 'forward'
                ? 'Forwarding Note / Instructions (Optional):'
                : actingDoc?.action === 'reject'
                  ? 'Reason for Rejection (Required):'
                  : 'Approval Comment (Optional):'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={approvalComment}
              onChangeText={setApprovalComment}
              placeholder={
                actingDoc?.action === 'forward'
                  ? 'e.g. Approved and forwarding for executive signoff'
                  : actingDoc?.action === 'approve'
                    ? 'e.g. Approved and verified'
                    : 'e.g. Revision needed in salary'
              }
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setActingDoc(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor:
                      actingDoc?.action === 'approve'
                        ? '#10b981'
                        : actingDoc?.action === 'reject'
                          ? '#ef4444'
                          : theme.primary,
                  },
                ]}
                onPress={handleConfirmAction}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actingDoc?.action === 'approve'
                      ? 'Confirm Approval'
                      : actingDoc?.action === 'reject'
                        ? 'Confirm Rejection'
                        : 'Forward'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: REQUEST COMPANY DOCUMENT */}
      {/* ============================================================ */}
      <Modal visible={!!requestingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Request Official Document</Text>
            <Text style={[styles.modalSubtitle, { color: theme.primary }]}>
              {requestingDoc?.name}
            </Text>

            <Text style={[styles.docDesc, { color: theme.textMuted, marginVertical: 6 }]}>
              {requestingDoc?.description}
            </Text>

            <View style={[styles.infoBanner, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginVertical: 8 }]}>
              <Icon name="document" size={16} color={theme.primary} />
              <Text style={[styles.infoBannerText, { color: theme.textPrimary, fontSize: 11.5, marginLeft: 6, flex: 1 }]}>
                Upon submitting, this request will be routed for multi-stage approval. You will receive email notifications as each approver reviews your request.
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 8 }]}>Purpose / Reason for Request:</Text>
            <TextInput
              style={[styles.modalTextArea, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={requestDocNote}
              onChangeText={setRequestDocNote}
              placeholder="e.g. Bank loan processing / Visa stamping / Academic verification..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setRequestingDoc(null)}
                disabled={submittingDocReq}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleSubmitDocRequest}
                disabled={submittingDocReq}
              >
                {submittingDocReq ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit Request 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: VIEW & DOWNLOAD COMPANY DOCUMENT */}
      {/* ============================================================ */}
      <Modal visible={!!previewingLetter} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '88%' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Document Preview &amp; Download</Text>
            <Text style={[styles.modalSubtitle, { color: theme.primary }]}>
              {previewingLetter?.name}
            </Text>

            <ScrollView style={[styles.termsBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginVertical: 10, maxHeight: 320 }]}>
              <Text style={[styles.termsText, { color: theme.textPrimary, lineHeight: 21, fontSize: 13 }]}>
                {formatDocumentTerms(previewingLetter?.terms || '', currentUser, companyConfig)}
              </Text>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setPreviewingLetter(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#059669' }]}
                onPress={() => {
                  Alert.alert(
                    'Official Copy Downloaded',
                    `Your official certificate copy for "${previewingLetter?.name}" with authorized details is downloaded.`
                  );
                  setPreviewingLetter(null);
                }}
              >
                <Text style={styles.modalConfirmText}>📥 Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  counterBadge: {
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  tabSection: {
    marginBottom: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 10,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    marginLeft: 8,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  cardList: {
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  docIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  docMeta: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  docDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
  attrBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attrBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  signBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  reSignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  reSignBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  downloadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  requestDocBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  requestDocBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  uploadCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  uploadCardDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    marginRight: 10,
  },
  uploadActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadActionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  uploadedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteDocBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDocBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  trashBtn: {
    padding: 6,
  },
  trashIcon: {
    fontSize: 14,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  roleBannerText: {
    fontSize: 11.5,
    marginLeft: 8,
    flex: 1,
  },
  approvalCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  approvalEmpName: {
    fontSize: 13,
    fontWeight: '800',
  },
  approvalEmpMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reqNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  reqDate: {
    fontSize: 10,
    marginTop: 6,
  },
  approvalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  forwardBtn: {
    flex: 1.2,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  forwardBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1.2,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
    fontWeight: '600',
  },
  termsBox: {
    maxHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  termsText: {
    fontSize: 11.5,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  ackLabel: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 14,
  },
  modalTextArea: {
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  signAgreementBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  signAgreementText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 11,
  },
  fileAttachmentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  fileAttachmentText: {
    fontSize: 10.5,
    marginLeft: 6,
    flex: 1,
    lineHeight: 14,
  },
  docPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 12,
  },
  docPreviewText: {
    fontSize: 13,
    fontWeight: '800',
  },
  docPreviewSub: {
    fontSize: 11,
    marginTop: 4,
  },
  forwardRoleSection: {
    marginBottom: 10,
  },
  roleChipsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  roleChipText: {
    fontSize: 11,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectedFileThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  selectedFileName: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedFileSize: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },
  changeFileBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeFileBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fullPreviewImage: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    marginBottom: 8,
  },
  attachedScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  attachedThumbCard: {
    width: 72,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  attachedThumbImg: {
    width: '100%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  pageBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  removeThumbBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  pageNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 4,
    marginBottom: 8,
  },
  pageNavBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pageNavCounter: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
