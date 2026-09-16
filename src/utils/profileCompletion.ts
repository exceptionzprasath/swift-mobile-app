import { Employee } from '../context/AppContext';

export interface MissingFieldItem {
  key: string;
  label: string;
  tab: 'work' | 'personal' | 'statutory' | 'history' | 'documents';
}

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  totalFieldsCount: number;
  completedFieldsCount: number;
  missingFields: MissingFieldItem[];
  missingCountByTab: Record<'work' | 'personal' | 'statutory' | 'history' | 'documents', number>;
  firstIncompleteTab: 'work' | 'personal' | 'statutory' | 'history' | 'documents';
}

export function calculateProfileCompletion(employee: Employee | null): ProfileCompletionResult {
  if (!employee) {
    return {
      percentage: 0,
      isComplete: false,
      totalFieldsCount: 0,
      completedFieldsCount: 0,
      missingFields: [],
      missingCountByTab: { work: 0, personal: 0, statutory: 0, history: 0, documents: 0 },
      firstIncompleteTab: 'personal',
    };
  }

  const checklist: {
    key: string;
    label: string;
    tab: 'work' | 'personal' | 'statutory' | 'history' | 'documents';
    isFilled: boolean;
  }[] = [
    // 1. Personal & Contact Details
    {
      key: 'name',
      label: 'Full Legal Name',
      tab: 'personal',
      isFilled: Boolean(employee.name && employee.name.trim() !== ''),
    },
    {
      key: 'gender',
      label: 'Gender',
      tab: 'personal',
      isFilled: Boolean(employee.gender && String(employee.gender).trim() !== ''),
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      tab: 'personal',
      isFilled: Boolean(employee.dob && employee.dob.trim() !== '' && employee.dob !== '-'),
    },
    {
      key: 'bloodGroup',
      label: 'Blood Group',
      tab: 'personal',
      isFilled: Boolean(employee.bloodGroup && employee.bloodGroup.trim() !== '' && employee.bloodGroup !== '-'),
    },
    {
      key: 'maritalStatus',
      label: 'Marital Status',
      tab: 'personal',
      isFilled: Boolean(employee.maritalStatus && String(employee.maritalStatus).trim() !== ''),
    },
    {
      key: 'phone',
      label: 'Contact Phone Number',
      tab: 'personal',
      isFilled: Boolean(employee.phone && employee.phone.trim() !== '' && employee.phone !== '-'),
    },
    {
      key: 'emergencyContact',
      label: 'Emergency Contact Phone',
      tab: 'personal',
      isFilled: Boolean(employee.emergencyContact && employee.emergencyContact.trim() !== '' && employee.emergencyContact !== '-'),
    },
    {
      key: 'emergencyName',
      label: 'Emergency Contact Person',
      tab: 'personal',
      isFilled: Boolean(employee.emergencyName && employee.emergencyName.trim() !== '' && employee.emergencyName !== '-'),
    },
    {
      key: 'address',
      label: 'Residential Address',
      tab: 'personal',
      isFilled: Boolean(
        (employee.address && employee.address.trim() !== '' && employee.address !== '-') ||
        (employee.addressLine1 && employee.addressLine1.trim() !== '') ||
        (employee.city && employee.city.trim() !== '')
      ),
    },

    // 2. Work & Organization Details
    {
      key: 'department',
      label: 'Department',
      tab: 'work',
      isFilled: Boolean(employee.department && employee.department.trim() !== '' && employee.department !== '-'),
    },
    {
      key: 'designation',
      label: 'Designation / Title',
      tab: 'work',
      isFilled: Boolean(employee.designation && employee.designation.trim() !== '' && employee.designation !== '-'),
    },
    {
      key: 'joiningDate',
      label: 'Date of Joining',
      tab: 'work',
      isFilled: Boolean((employee.joiningDate || employee.doj) && (employee.joiningDate !== '-' && employee.doj !== '-')),
    },
    {
      key: 'shift',
      label: 'Shift & Timings',
      tab: 'work',
      isFilled: Boolean(employee.shift || employee.shiftStart),
    },

    // 3. Bank & Statutory Identifiers
    {
      key: 'bankName',
      label: 'Salary Bank Name',
      tab: 'statutory',
      isFilled: Boolean((employee.bankName && employee.bankName.trim() !== '' && employee.bankName !== '-') || (employee.bankAccount && employee.bankAccount.trim() !== '')),
    },
    {
      key: 'bankAcc',
      label: 'Bank Account Number',
      tab: 'statutory',
      isFilled: Boolean((employee.bankAcc && employee.bankAcc.trim() !== '' && employee.bankAcc !== '-') || (employee.bankAccount && employee.bankAccount.trim() !== '')),
    },
    {
      key: 'bankIfsc',
      label: 'Bank IFSC Code',
      tab: 'statutory',
      isFilled: Boolean(employee.bankIfsc && employee.bankIfsc.trim() !== '' && employee.bankIfsc !== '-'),
    },
    {
      key: 'panNumber',
      label: 'PAN Card Number',
      tab: 'statutory',
      isFilled: Boolean((employee.panNumber || employee.pan) && (employee.panNumber !== '-' && employee.pan !== '-')),
    },
    {
      key: 'aadhaar',
      label: 'Aadhaar Number',
      tab: 'statutory',
      isFilled: Boolean(employee.aadhaar && employee.aadhaar.trim() !== '' && employee.aadhaar !== '-'),
    },
    {
      key: 'uan',
      label: 'PF UAN Number / Enrollment',
      tab: 'statutory',
      isFilled: Boolean((employee.uan && employee.uan.trim() !== '' && employee.uan !== '-') || employee.pfEligible !== undefined),
    },

    // 4. Education, History & Skills
    {
      key: 'skills',
      label: 'Professional Skills',
      tab: 'history',
      isFilled: Boolean(Array.isArray(employee.skills) && employee.skills.length > 0),
    },
    {
      key: 'languagesKnown',
      label: 'Languages Known',
      tab: 'history',
      isFilled: Boolean(Array.isArray(employee.languagesKnown) && employee.languagesKnown.length > 0),
    },
    {
      key: 'education',
      label: 'Educational Qualification',
      tab: 'history',
      isFilled: Boolean(Array.isArray(employee.education) && employee.education.length > 0),
    },

    // 5. Verification & Documents
    {
      key: 'documentsUploaded',
      label: 'Identity / Verification Documents',
      tab: 'documents',
      isFilled: Boolean(
        (Array.isArray(employee.documentsUploaded) && employee.documentsUploaded.length > 0) ||
        employee.ndaSigned ||
        employee.acceptance?.signed ||
        employee.faceRegistered
      ),
    },
  ];

  const totalFieldsCount = checklist.length;
  const completedList = checklist.filter((item) => item.isFilled);
  const completedFieldsCount = completedList.length;
  const missingList = checklist.filter((item) => !item.isFilled);

  const missingFields: MissingFieldItem[] = missingList.map((item) => ({
    key: item.key,
    label: item.label,
    tab: item.tab,
  }));

  const missingCountByTab: Record<'work' | 'personal' | 'statutory' | 'history' | 'documents', number> = {
    work: 0,
    personal: 0,
    statutory: 0,
    history: 0,
    documents: 0,
  };

  missingFields.forEach((item) => {
    missingCountByTab[item.tab] = (missingCountByTab[item.tab] || 0) + 1;
  });

  const percentage = Math.round((completedFieldsCount / totalFieldsCount) * 100);
  const isComplete = percentage === 100;

  // Determine the first incomplete tab in a prioritized flow
  const tabPriority: ('personal' | 'statutory' | 'work' | 'history' | 'documents')[] = [
    'personal',
    'statutory',
    'history',
    'documents',
    'work',
  ];

  let firstIncompleteTab: 'work' | 'personal' | 'statutory' | 'history' | 'documents' = 'personal';
  for (const tab of tabPriority) {
    if (missingCountByTab[tab] > 0) {
      firstIncompleteTab = tab;
      break;
    }
  }

  return {
    percentage,
    isComplete,
    totalFieldsCount,
    completedFieldsCount,
    missingFields,
    missingCountByTab,
    firstIncompleteTab,
  };
}
