import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ThemeColors, SHADOWS, COLOR_PALETTES, getPaletteById, PaletteDefinition } from '../theme/colors';
import { Icon } from '../components/Icon';
import { ThemePaletteModal } from '../components/ThemePaletteModal';
import { useAppContext, EmployeeDocument, FamilyMember, EducationEntry, ExperienceEntry, Employee } from '../context/AppContext';
import { calculateProfileCompletion } from '../utils/profileCompletion';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  theme: ThemeColors;
  initialTab?: ProfileSectionTab;
  onToggleTheme: () => void;
  selectedPaletteId?: string;
  onSelectPalette?: (paletteId: string) => void;
  onLogout: () => void;
}


type ProfileSectionTab = 'work' | 'personal' | 'statutory' | 'history' | 'documents';

export function ProfileScreen({
  theme,
  initialTab,
  onToggleTheme,
  selectedPaletteId = 'default',
  onSelectPalette,
  onLogout,
}: ProfileScreenProps) {
  const { currentUser, employees, companyConfig, refreshData, requests, applyUnifiedRequest } = useAppContext();
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>(initialTab || 'work');
  const [refreshing, setRefreshing] = useState(false);
  const [showMaskedData, setShowMaskedData] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync initialTab when changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Profile completion status
  const profileCompletion = useMemo(() => calculateProfileCompletion(currentUser), [currentUser]);

  // Pending profile update request
  const pendingProfileRequest = useMemo(() => {
    return (requests || []).find(
      (r) =>
        (r.employeeId === currentUser?.id || (currentUser?.empCode && r.empCode === currentUser.empCode)) &&
        (r.category === 'profile' || (r as any).category === 'profile_update') &&
        r.status === 'Pending'
    );
  }, [requests, currentUser]);

  // Form State for Profile Completion
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formDob, setFormDob] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formMaritalStatus, setFormMaritalStatus] = useState('single');
  const [formPhone, setFormPhone] = useState('');
  const [formEmergencyName, setFormEmergencyName] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');

  const [formBankName, setFormBankName] = useState('');
  const [formBankAcc, setFormBankAcc] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formBankBranch, setFormBankBranch] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formAadhaar, setFormAadhaar] = useState('');
  const [formUan, setFormUan] = useState('');

  const [formSkills, setFormSkills] = useState('');
  const [formLanguages, setFormLanguages] = useState('');
  const [formDegree, setFormDegree] = useState('');
  const [formInstitute, setFormInstitute] = useState('');
  const [formGradYear, setFormGradYear] = useState('');

  // Single Field Edit State
  interface SingleFieldConfig {
    key: string;
    label: string;
    currentValue: any;
    inputType: 'text' | 'phone' | 'numeric' | 'gender' | 'bloodGroup' | 'maritalStatus' | 'date' | 'address' | 'bank' | 'education' | 'tags';
    placeholder?: string;
    subfields?: { [key: string]: any };
  }

  const [singleFieldModal, setSingleFieldModal] = useState<{
    open: boolean;
    config: SingleFieldConfig | null;
    val: string;
    subVals: { [key: string]: string };
    reason: string;
  }>({
    open: false,
    config: null,
    val: '',
    subVals: {},
    reason: '',
  });

  // Helper to detect if a specific field has a pending profile update request
  const getPendingFieldRequest = (fieldKey: string) => {
    return (requests || []).find((r) => {
      const isEmpMatch =
        r.employeeId === currentUser?.id ||
        (currentUser?.empCode && r.empCode === currentUser.empCode);
      const isProfileCat =
        r.category === 'profile' || (r as any).category === 'profile_update';
      const isPending = r.status === 'Pending';
      if (!isEmpMatch || !isProfileCat || !isPending) return false;

      if (r.metadata?.fieldKey === fieldKey) return true;
      if (r.metadata?.profileUpdates && r.metadata.profileUpdates[fieldKey] !== undefined) return true;
      // Map aliases
      if (fieldKey === 'pan' && (r.metadata?.fieldKey === 'panNumber' || r.metadata?.profileUpdates?.panNumber)) return true;
      if (fieldKey === 'panNumber' && (r.metadata?.fieldKey === 'pan' || r.metadata?.profileUpdates?.pan)) return true;
      if (fieldKey === 'bankAccount' && (r.metadata?.fieldKey === 'bankAcc' || r.metadata?.profileUpdates?.bankAcc)) return true;
      if (fieldKey === 'bankAcc' && (r.metadata?.fieldKey === 'bankAccount' || r.metadata?.profileUpdates?.bankAccount)) return true;
      if (fieldKey === 'address' && (r.metadata?.fieldKey === 'addressLine1' || r.metadata?.profileUpdates?.addressLine1)) return true;
      return false;
    });
  };

  const handleSaveSingleField = async () => {
    if (!singleFieldModal.config) return;
    setIsSaving(true);
    try {
      const { key, label, inputType } = singleFieldModal.config;
      let updates: Partial<Employee> = {};
      let oldValDisplay = '';
      let newValDisplay = '';

      if (inputType === 'gender') {
        const g = (singleFieldModal.val.toLowerCase() as any) || 'male';
        updates = { gender: g };
        oldValDisplay = currentUser?.gender || '(Not set)';
        newValDisplay = g;
      } else if (inputType === 'bloodGroup') {
        const bg = singleFieldModal.val.trim() || 'O+';
        updates = { bloodGroup: bg };
        oldValDisplay = currentUser?.bloodGroup || '(Not set)';
        newValDisplay = bg;
      } else if (inputType === 'maritalStatus') {
        const ms = (singleFieldModal.val.toLowerCase() as any) || 'single';
        updates = { maritalStatus: ms };
        oldValDisplay = currentUser?.maritalStatus || '(Not set)';
        newValDisplay = ms;
      } else if (inputType === 'address') {
        const addr = singleFieldModal.val.trim();
        const city = singleFieldModal.subVals.city?.trim() || currentUser?.city || '';
        const state = singleFieldModal.subVals.state?.trim() || currentUser?.state || '';
        const pincode = singleFieldModal.subVals.pincode?.trim() || currentUser?.pincode || '';
        updates = {
          address: addr,
          addressLine1: addr,
          city,
          state,
          pincode,
        };
        oldValDisplay = currentUser?.address || currentUser?.addressLine1 || '(Not set)';
        newValDisplay = [addr, city, state, pincode].filter(Boolean).join(', ');
      } else if (inputType === 'bank') {
        const bName = singleFieldModal.subVals.bankName?.trim() || currentUser?.bankName || '';
        const bAcc = singleFieldModal.val.trim();
        const bIfsc = singleFieldModal.subVals.bankIfsc?.trim() || currentUser?.bankIfsc || '';
        const bBranch = singleFieldModal.subVals.bankBranch?.trim() || currentUser?.bankBranch || '';
        updates = {
          bankName: bName,
          bankAcc: bAcc,
          bankAccount: bAcc ? `${bName || 'Bank'} (A/C: ${bAcc})` : currentUser?.bankAccount,
          bankIfsc: bIfsc,
          bankBranch: bBranch,
        };
        oldValDisplay = currentUser?.bankAcc || currentUser?.bankAccount || '(Not set)';
        newValDisplay = `${bName || 'Bank'} - A/C: ${bAcc} (IFSC: ${bIfsc || 'N/A'})`;
      } else if (inputType === 'education') {
        const degree = singleFieldModal.val.trim();
        const inst = singleFieldModal.subVals.institute?.trim() || '';
        const year = singleFieldModal.subVals.year?.trim() || '';
        let nextEdu = Array.isArray(currentUser?.education) ? [...currentUser.education] : [];
        if (nextEdu.length > 0) {
          nextEdu[0] = {
            ...nextEdu[0],
            level: degree || nextEdu[0].level,
            institute: inst || nextEdu[0].institute,
            year: year || nextEdu[0].year,
          };
        } else {
          nextEdu.push({
            level: degree || 'Degree',
            institute: inst || 'College',
            year: year || '2023',
            grade: 'Completed',
            field: 'General',
          });
        }
        updates = { education: nextEdu };
        oldValDisplay = currentUser?.education?.[0]?.level
          ? `${currentUser.education[0].level} (${currentUser.education[0].institute || ''})`
          : '(Not set)';
        newValDisplay = `${degree} (${inst || 'Institute'}, ${year || 'Year'})`;
      } else if (inputType === 'tags') {
        const tagsArr = singleFieldModal.val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (key === 'skills') {
          updates = { skills: tagsArr };
          oldValDisplay = Array.isArray(currentUser?.skills) ? currentUser.skills.join(', ') : '(Not set)';
          newValDisplay = tagsArr.join(', ');
        } else {
          updates = { languagesKnown: tagsArr };
          oldValDisplay = Array.isArray(currentUser?.languagesKnown) ? currentUser.languagesKnown.join(', ') : '(Not set)';
          newValDisplay = tagsArr.join(', ');
        }
      } else {
        const stringVal = singleFieldModal.val.trim();
        if (key === 'pan' || key === 'panNumber') {
          updates = { pan: stringVal.toUpperCase(), panNumber: stringVal.toUpperCase() };
          oldValDisplay = currentUser?.panNumber || currentUser?.pan || '(Not set)';
          newValDisplay = stringVal.toUpperCase();
        } else {
          updates = { [key]: stringVal } as any;
          oldValDisplay = (currentUser as any)?.[key] || '(Not set)';
          newValDisplay = stringVal;
        }
      }

      const res = await applyUnifiedRequest({
        category: 'profile',
        type: `Profile Update: ${label}`,
        title: `${currentUser?.name || 'Employee'} requested update for ${label}`,
        details: `Field update for ${label}: "${oldValDisplay}" ➔ "${newValDisplay}".`,
        reason: singleFieldModal.reason.trim() || `Employee self-service update for ${label}`,
        notes: `Field: ${label} (${key})\nOld: ${oldValDisplay}\nNew: ${newValDisplay}`,
        metadata: {
          fieldKey: key,
          fieldLabel: label,
          oldValue: oldValDisplay,
          newValue: newValDisplay,
          profileUpdates: updates,
          submittedAt: new Date().toISOString(),
        },
      });

      if (res.success) {
        setSingleFieldModal({ open: false, config: null, val: '', subVals: {}, reason: '' });
        await refreshData();
        Alert.alert(
          'Submitted for Admin Approval 📨',
          `Your update for "${label}" has been submitted to Admin under "Requests & Approvals".\n\nOnce reviewed and approved by HR/Admin, your official profile and onboarding progress bar will update automatically.`
        );
      } else {
        Alert.alert('Submission Failed', res.error || 'Unable to submit update request. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit profile update.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (targetTab?: ProfileSectionTab) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setFormName(currentUser?.name || '');
    setFormGender(currentUser?.gender || 'male');
    setFormDob(currentUser?.dob || '');
    setFormBloodGroup(currentUser?.bloodGroup || 'O+');
    setFormMaritalStatus(currentUser?.maritalStatus || 'single');
    setFormPhone(currentUser?.phone || '');
    setFormEmergencyName(currentUser?.emergencyName || '');
    setFormEmergencyPhone(currentUser?.emergencyContact || currentUser?.emergencyPhone2 || '');
    setFormAddress(currentUser?.address || currentUser?.addressLine1 || '');
    setFormCity(currentUser?.city || '');
    setFormState(currentUser?.state || '');
    setFormPincode(currentUser?.pincode || '');

    setFormBankName(currentUser?.bankName || '');
    setFormBankAcc(currentUser?.bankAcc || currentUser?.bankAccount || '');
    setFormBankIfsc(currentUser?.bankIfsc || '');
    setFormBankBranch(currentUser?.bankBranch || '');
    setFormPan(currentUser?.panNumber || currentUser?.pan || '');
    setFormAadhaar(currentUser?.aadhaar || '');
    setFormUan(currentUser?.uan || '');

    setFormSkills(Array.isArray(currentUser?.skills) ? currentUser.skills.join(', ') : '');
    setFormLanguages(Array.isArray(currentUser?.languagesKnown) ? currentUser.languagesKnown.join(', ') : '');

    const topEdu = Array.isArray(currentUser?.education) && currentUser.education.length > 0 ? currentUser.education[0] : null;
    setFormDegree(topEdu?.level || '');
    setFormInstitute(topEdu?.institute || '');
    setFormGradYear(topEdu?.year || '');

    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const skillsArr = formSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const langArr = formLanguages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      let nextEdu = Array.isArray(currentUser?.education) ? [...currentUser.education] : [];
      if (formDegree.trim() || formInstitute.trim()) {
        if (nextEdu.length > 0) {
          nextEdu[0] = {
            ...nextEdu[0],
            level: formDegree.trim() || nextEdu[0].level,
            institute: formInstitute.trim() || nextEdu[0].institute,
            year: formGradYear.trim() || nextEdu[0].year,
          };
        } else {
          nextEdu.push({
            level: formDegree.trim() || 'Degree / Diploma',
            institute: formInstitute.trim() || 'University',
            year: formGradYear.trim() || '2023',
            grade: 'Completed',
            field: 'General',
          });
        }
      }

      const updates: Partial<Employee> = {
        name: formName.trim() || currentUser?.name,
        gender: (formGender.trim() as any) || currentUser?.gender,
        dob: formDob.trim() || currentUser?.dob,
        bloodGroup: formBloodGroup.trim() || currentUser?.bloodGroup,
        maritalStatus: (formMaritalStatus.trim() as any) || currentUser?.maritalStatus,
        phone: formPhone.trim() || currentUser?.phone,
        emergencyName: formEmergencyName.trim() || currentUser?.emergencyName,
        emergencyContact: formEmergencyPhone.trim() || currentUser?.emergencyContact,
        address: formAddress.trim() || currentUser?.address,
        addressLine1: formAddress.trim() || currentUser?.addressLine1,
        city: formCity.trim() || currentUser?.city,
        state: formState.trim() || currentUser?.state,
        pincode: formPincode.trim() || currentUser?.pincode,

        bankName: formBankName.trim() || currentUser?.bankName,
        bankAcc: formBankAcc.trim() || currentUser?.bankAcc,
        bankAccount: formBankAcc.trim() ? `${formBankName.trim() || 'Bank'} (A/C: ${formBankAcc.trim()})` : currentUser?.bankAccount,
        bankIfsc: formBankIfsc.trim() || currentUser?.bankIfsc,
        bankBranch: formBankBranch.trim() || currentUser?.bankBranch,
        panNumber: formPan.trim() || currentUser?.panNumber,
        pan: formPan.trim() || currentUser?.pan,
        aadhaar: formAadhaar.trim() || currentUser?.aadhaar,
        uan: formUan.trim() || currentUser?.uan,

        skills: skillsArr.length > 0 ? skillsArr : currentUser?.skills,
        languagesKnown: langArr.length > 0 ? langArr : currentUser?.languagesKnown,
        education: nextEdu.length > 0 ? nextEdu : currentUser?.education,
      };

      // Detect modified field names
      const updatedFieldsList: string[] = [];
      if (formName.trim() && formName.trim() !== (currentUser?.name || '')) updatedFieldsList.push('Legal Name');
      if (formGender.trim() && formGender.trim() !== (currentUser?.gender || '')) updatedFieldsList.push('Gender');
      if (formDob.trim() && formDob.trim() !== (currentUser?.dob || '')) updatedFieldsList.push('Date of Birth');
      if (formBloodGroup.trim() && formBloodGroup.trim() !== (currentUser?.bloodGroup || '')) updatedFieldsList.push('Blood Group');
      if (formMaritalStatus.trim() && formMaritalStatus.trim() !== (currentUser?.maritalStatus || '')) updatedFieldsList.push('Marital Status');
      if (formPhone.trim() && formPhone.trim() !== (currentUser?.phone || '')) updatedFieldsList.push('Phone Number');
      if (formEmergencyName.trim() && formEmergencyName.trim() !== (currentUser?.emergencyName || '')) updatedFieldsList.push('Emergency Contact Person');
      if (formEmergencyPhone.trim() && formEmergencyPhone.trim() !== (currentUser?.emergencyContact || '')) updatedFieldsList.push('Emergency Phone');
      if (formAddress.trim() && formAddress.trim() !== (currentUser?.address || '')) updatedFieldsList.push('Residential Address');
      if (formBankName.trim() && formBankName.trim() !== (currentUser?.bankName || '')) updatedFieldsList.push('Bank Name');
      if (formBankAcc.trim() && formBankAcc.trim() !== (currentUser?.bankAcc || '')) updatedFieldsList.push('Bank Account Number');
      if (formBankIfsc.trim() && formBankIfsc.trim() !== (currentUser?.bankIfsc || '')) updatedFieldsList.push('Bank IFSC');
      if (formPan.trim() && formPan.trim() !== (currentUser?.panNumber || currentUser?.pan || '')) updatedFieldsList.push('PAN Number');
      if (formAadhaar.trim() && formAadhaar.trim() !== (currentUser?.aadhaar || '')) updatedFieldsList.push('Aadhaar Number');
      if (formUan.trim() && formUan.trim() !== (currentUser?.uan || '')) updatedFieldsList.push('PF UAN');
      if (formDegree.trim() || formInstitute.trim()) updatedFieldsList.push('Qualifications');
      if (skillsArr.length > 0) updatedFieldsList.push('Skills');
      if (langArr.length > 0) updatedFieldsList.push('Languages');

      const count = updatedFieldsList.length || 1;
      const summaryTitle = `Profile Update: ${count} field${count > 1 ? 's' : ''} (${updatedFieldsList.slice(0, 3).join(', ')}${count > 3 ? '...' : ''})`;
      const summaryDetails = `Updated fields submitted for admin verification: ${updatedFieldsList.join(', ')}.`;

      const res = await applyUnifiedRequest({
        category: 'profile',
        type: 'Profile & Onboarding Update',
        title: summaryTitle,
        details: summaryDetails,
        reason: 'Employee self-service profile & onboarding data submission',
        notes: `Fields submitted: ${updatedFieldsList.join(', ')}`,
        metadata: {
          profileUpdates: updates,
          fieldsModified: updatedFieldsList,
          submittedAt: new Date().toISOString(),
        },
      });

      if (res.success) {
        setShowEditModal(false);
        await refreshData();
        Alert.alert(
          'Submitted for Admin Approval 📨',
          'Your profile updates have been sent to HR & Admin under "Requests & Approvals".\n\nOnce reviewed and approved by the admin, your official profile and progress bar will be updated accordingly!'
        );
      } else {
        Alert.alert('Submission Failed', res.error || 'Unable to submit profile updates. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (err) {
      console.warn('[ProfileScreen] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const isFaceEnrolled = Boolean(currentUser?.faceRegistered || (currentUser?.photoDataUrl && currentUser.photoDataUrl.startsWith('http')));

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out of SWIFT HRMS?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const initial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'E';
  const branches = companyConfig?.branches || [];
  const assignedBranches = branches.filter((b: any) => (currentUser?.branchIds?.includes(b.id) || b.id === currentUser?.branchId));
  const branchNameDisplay = assignedBranches.length > 0
    ? assignedBranches.map((b: any) => `${b.name} (${b.code || 'Main'})`).join(', ')
    : (branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'Head Office');

  // Format full address from real-time profile fields
  const fullAddressDisplay = currentUser?.address || [
    currentUser?.addressLine1,
    currentUser?.addressLine2,
    currentUser?.city,
    currentUser?.state,
    currentUser?.pincode ? `- ${currentUser.pincode}` : '',
    currentUser?.country,
  ].filter(Boolean).join(', ') || 'Registered Address';

  const familyList: FamilyMember[] = Array.isArray(currentUser?.family) ? currentUser.family : [];
  const educationList: EducationEntry[] = Array.isArray(currentUser?.education) ? currentUser.education : [];
  const experienceList: ExperienceEntry[] = Array.isArray(currentUser?.experience) ? currentUser.experience : [];
  const documentsList: EmployeeDocument[] = Array.isArray(currentUser?.documentsUploaded) ? currentUser.documentsUploaded : [];
  const skillsList: string[] = Array.isArray(currentUser?.skills) ? currentUser.skills : [];
  const languagesList: string[] = Array.isArray(currentUser?.languagesKnown) ? currentUser.languagesKnown : [];

  // Robust Reporting Manager Resolution
  const reportingManagerDisplay = useMemo(() => {
    // 1. Direct explicit name or value on currentUser
    if (currentUser?.reportingManager && currentUser.reportingManager.trim() !== '' && currentUser.reportingManager !== '-') {
      const matchEmp = (employees || []).find(
        (e: any) => e.id === currentUser.reportingManager || e.empCode === currentUser.reportingManager
      );
      if (matchEmp) {
        return `${matchEmp.name} (${matchEmp.designation || 'Manager'})`;
      }
      return currentUser.reportingManager;
    }

    // 2. managerId lookup in employee roster
    if (currentUser?.managerId && currentUser.managerId !== '__none') {
      const matchMgr = (employees || []).find(
        (e: any) => e.id === currentUser.managerId || e.empCode === currentUser.managerId
      );
      if (matchMgr) {
        return `${matchMgr.name} (${matchMgr.designation || 'Manager'})`;
      }
    }

    // 3. Custom approval workflow hierarchy
    const workflowApproverId = (companyConfig as any)?.approvalSettings?.customWorkflows?.find(
      (w: any) => w.employeeId === currentUser?.id
    )?.approverId;
    if (workflowApproverId) {
      const matchApprover = (employees || []).find((e: any) => e.id === workflowApproverId);
      if (matchApprover) {
        return `${matchApprover.name} (${matchApprover.designation || 'Approver'})`;
      }
    }

    // 4. Role / Designation based intelligent hierarchy fallback
    const designationLower = (currentUser?.designation || '').toLowerCase();
    const roleLower = (currentUser?.roleName || '').toLowerCase();

    if (
      designationLower.includes('founder') ||
      designationLower.includes('director') ||
      designationLower.includes('ceo') ||
      designationLower.includes('president') ||
      designationLower.includes('partner') ||
      roleLower.includes('owner') ||
      roleLower.includes('super admin')
    ) {
      return 'Top Management / Board of Directors';
    }

    // 5. Check if there is a department head
    const deptHead = (employees || []).find(
      (e: any) =>
        e.id !== currentUser?.id &&
        e.department === currentUser?.department &&
        ((e.designation || '').toLowerCase().includes('lead') ||
          (e.designation || '').toLowerCase().includes('head') ||
          (e.designation || '').toLowerCase().includes('manager'))
    );
    if (deptHead) {
      return `${deptHead.name} (${deptHead.designation || 'Dept Head'})`;
    }

    return 'Direct Management / HR Admin';
  }, [currentUser, employees, companyConfig]);

  // Helper to render an individual field row with Edit button & pending badge
  const renderEditableRow = (
    fieldKey: string,
    fieldLabel: string,
    currentDisplayValue: string | undefined | null,
    config: {
      inputType: SingleFieldConfig['inputType'];
      placeholder?: string;
      isSensitive?: boolean;
      isLast?: boolean;
      highlightColor?: string;
      subfields?: { [k: string]: any };
    }
  ) => {
    const pendingReq = getPendingFieldRequest(fieldKey);
    const isEmpty =
      !currentDisplayValue ||
      currentDisplayValue === '-' ||
      currentDisplayValue === 'Registered Address' ||
      currentDisplayValue === '(Not set)' ||
      currentDisplayValue === '';

    const handleOpenEdit = () => {
      let initialVal = '';
      let initialSubVals: { [k: string]: string } = {};

      if (config.inputType === 'address') {
        initialVal = currentUser?.address || currentUser?.addressLine1 || '';
        initialSubVals = {
          city: currentUser?.city || '',
          state: currentUser?.state || '',
          pincode: currentUser?.pincode || '',
        };
      } else if (config.inputType === 'bank') {
        initialVal = currentUser?.bankAcc || currentUser?.bankAccount || '';
        initialSubVals = {
          bankName: currentUser?.bankName || '',
          bankIfsc: currentUser?.bankIfsc || '',
          bankBranch: currentUser?.bankBranch || '',
        };
      } else if (config.inputType === 'education') {
        const topEdu = Array.isArray(currentUser?.education) && currentUser.education.length > 0 ? currentUser.education[0] : null;
        initialVal = topEdu?.level || '';
        initialSubVals = {
          institute: topEdu?.institute || '',
          year: topEdu?.year || '',
        };
      } else if (config.inputType === 'tags') {
        if (fieldKey === 'skills') {
          initialVal = Array.isArray(currentUser?.skills) ? currentUser.skills.join(', ') : '';
        } else {
          initialVal = Array.isArray(currentUser?.languagesKnown) ? currentUser.languagesKnown.join(', ') : '';
        }
      } else if (config.inputType === 'gender') {
        initialVal = currentUser?.gender || 'male';
      } else if (config.inputType === 'bloodGroup') {
        initialVal = currentUser?.bloodGroup || 'O+';
      } else if (config.inputType === 'maritalStatus') {
        initialVal = currentUser?.maritalStatus || 'single';
      } else if (fieldKey === 'pan' || fieldKey === 'panNumber') {
        initialVal = currentUser?.panNumber || currentUser?.pan || '';
      } else {
        initialVal = (currentUser as any)?.[fieldKey] || '';
      }

      setSingleFieldModal({
        open: true,
        config: {
          key: fieldKey,
          label: fieldLabel,
          currentValue: currentDisplayValue,
          inputType: config.inputType,
          placeholder: config.placeholder,
          subfields: config.subfields,
        },
        val: initialVal,
        subVals: initialSubVals,
        reason: '',
      });
    };

    return (
      <View
        key={fieldKey}
        style={[
          styles.editableInfoRow,
          {
            borderBottomColor: theme.cardBorder,
            borderBottomWidth: config.isLast ? 0 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{fieldLabel}</Text>
            {pendingReq && (
              <View style={[styles.pendingPillBadge, { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7', borderColor: '#f59e0b' }]}>
                <Icon name="clock" size={9} color="#d97706" />
                <Text style={styles.pendingPillBadgeText}>Pending Approval</Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.infoVal,
              {
                color: isEmpty
                  ? '#ea580c'
                  : (config.highlightColor || theme.textPrimary),
                marginTop: 4,
                fontStyle: isEmpty ? 'italic' : 'normal',
                fontWeight: isEmpty ? '600' : '700',
              },
            ]}
            numberOfLines={2}
          >
            {isEmpty ? '⚠️ Incomplete • Tap to Add' : currentDisplayValue}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.rowEditBtn,
            {
              backgroundColor: pendingReq
                ? (theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7')
                : (isEmpty ? (theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2') : theme.inputBg),
              borderColor: pendingReq ? '#f59e0b' : (isEmpty ? '#ef4444' : theme.cardBorder),
            },
          ]}
          onPress={handleOpenEdit}
          activeOpacity={0.7}
        >
          <Icon
            name="task"
            size={11}
            color={pendingReq ? '#d97706' : (isEmpty ? '#dc2626' : theme.primary)}
          />
          <Text
            style={[
              styles.rowEditBtnText,
              {
                color: pendingReq ? '#d97706' : (isEmpty ? '#dc2626' : theme.primary),
              },
            ]}
          >
            {pendingReq ? 'Edit Pending' : (isEmpty ? '+ Add' : 'Edit')}
          </Text>
        </TouchableOpacity>
      </View>
    );
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
      {/* 1. TOP PROFILE HERO CARD (White Background with Theme-Based Border) */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.isDark ? theme.card : '#ffffff',
            borderColor: theme.primary,
          },
        ]}
      >
        {/* Top Row: Avatar on Left, Two Stacked Pills on Right */}
        <View style={styles.heroTopRow}>
          {/* Avatar on Top Left */}
          <View style={[styles.heroAvatarCircle, { backgroundColor: theme.primary }]}>
            {currentUser?.photoDataUrl ? (
              <Image source={{ uri: currentUser.photoDataUrl }} style={styles.heroAvatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.heroAvatarInitial, { color: '#ffffff' }]}>{initial}</Text>
            )}
          </View>

          {/* Stacked Pills on Top Right */}
          <View style={styles.heroTopRightStack}>
            {/* Pill 1: Status */}
            <View
              style={[
                styles.heroPillTop,
                {
                  backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7',
                },
              ]}
            >
              <View style={[styles.heroStatusDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.heroPillTextTop, { color: theme.isDark ? '#4ade80' : '#15803d' }]}>
                {currentUser?.status ? currentUser.status.toUpperCase() : 'ACTIVE'} • FULL-TIME
              </Text>
            </View>

            {/* Pill 2: Realtime Sync */}
            <TouchableOpacity
              style={[
                styles.heroPillBottom,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={onRefresh}
              activeOpacity={0.75}
            >
              <Icon name="history" size={12} color={theme.primary} />
              <Text style={[styles.heroPillTextBottom, { color: theme.primary }]}>Realtime Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Row: Name & Role on Left, 2 Mini Info Boxes on Right */}
        <View style={styles.heroBottomRow}>
          {/* Bottom Left: Name & Role */}
          <View style={styles.heroNameCol}>
            <Text style={[styles.heroNameText, { color: theme.textPrimary }]} numberOfLines={1}>
              {currentUser?.name || 'Employee'}
            </Text>
            <Text style={[styles.heroRoleText, { color: theme.textMuted }]} numberOfLines={1}>
              {currentUser?.designation || 'Team Member'} • <Text style={{ color: theme.primary, fontWeight: '700' }}>{currentUser?.department || 'General'}</Text>
            </Text>
          </View>

          {/* Bottom Right: 2 Stacked Info Boxes */}
          <View style={styles.heroInfoBoxesCol}>
            <View
              style={[
                styles.heroInfoBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.heroInfoBoxText, { color: theme.textPrimary }]} numberOfLines={1}>
                ID: {currentUser?.empCode || currentUser?.code || currentUser?.id || 'EMP'}
              </Text>
            </View>

            <View
              style={[
                styles.heroInfoBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.heroInfoBoxText, { color: theme.textPrimary }]} numberOfLines={1}>
                {currentUser?.bloodGroup ? `🩸 ${currentUser.bloodGroup}` : `Branch: ${branches.find((b: any) => b.id === currentUser?.branchId)?.name || 'Main'}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. MIDDLE QUICK METRIC STRIP (Divided Bar from Wireframe) */}
      <View style={[styles.metricStripCard, { backgroundColor: theme.card }]}>
        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: isFaceEnrolled ? (theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7') }]}>
            <Icon name={isFaceEnrolled ? 'check' : 'camera'} size={12} color={isFaceEnrolled ? '#16a34a' : '#d97706'} />
          </View>
          <Text style={[styles.metricMainText, { color: isFaceEnrolled ? '#16a34a' : '#d97706' }]}>
            {isFaceEnrolled ? 'Enrolled' : 'Pending'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Face ID</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.18)' : '#e0f2fe' }]}>
            <Icon name="calendar" size={12} color={theme.primary} />
          </View>
          <Text style={[styles.metricMainText, { color: theme.primary }]}>Active</Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Leaves</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7' }]}>
            <Icon name="document" size={12} color="#16a34a" />
          </View>
          <Text style={[styles.metricMainText, { color: '#16a34a' }]}>
            {documentsList.length > 0 ? 'Verified' : 'Active'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Onboarding</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? (theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7') }]}>
            <Icon name="wallet" size={12} color={(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706'} />
          </View>
          <Text style={[styles.metricMainText, { color: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706' }]}>
            {(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? 'Linked' : 'Pending'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Salary A/C</Text>
        </View>
      </View>

      {/* 2.4 PENDING ADMIN APPROVAL BANNER */}
      {pendingProfileRequest && (
        <View style={[styles.pendingApprovalBanner, { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', borderColor: '#f59e0b' }]}>
          <View style={styles.pendingBannerIconCircle}>
            <Icon name="clock" size={14} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pendingBannerTitle, { color: theme.isDark ? '#fbbf24' : '#b45309' }]}>
              Profile Update Awaiting Admin Approval ⏳
            </Text>
            <Text style={[styles.pendingBannerSub, { color: theme.isDark ? '#fde68a' : '#92400e' }]}>
              {pendingProfileRequest.title || 'Your profile updates'} submitted for review. Once approved in Admin Panel Requests & Approvals, your progress bar will be updated.
            </Text>
          </View>
        </View>
      )}

      {/* 2.5 ONBOARDING STATUS PROGRESS CARD (Red Progress Bar & Incomplete Resolution) */}
      <View
        style={[
          styles.onboardingHeroCard,
          {
            backgroundColor: theme.isDark ? theme.card : '#ffffff',
            borderColor: profileCompletion.isComplete ? '#10b981' : '#ef4444',
          },
        ]}
      >
        <View style={styles.onboardingHeroTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={[
                  styles.statusHeroDot,
                  { backgroundColor: profileCompletion.isComplete ? '#10b981' : '#ef4444' },
                ]}
              />
              <Text style={[styles.onboardingHeroTitle, { color: theme.textPrimary }]}>
                {profileCompletion.isComplete ? 'Onboarding Completed (100%)' : 'Onboarding Status & Verification'}
              </Text>
            </View>
            <Text style={[styles.onboardingHeroSub, { color: theme.textMuted }]}>
              {profileCompletion.isComplete
                ? 'All personal, employment, bank and compliance details are 100% verified.'
                : `${profileCompletion.missingFields.length} profile fields require your attention to reach 100%.`}
            </Text>
          </View>

          <View
            style={[
              styles.onboardingPercentBadge,
              {
                backgroundColor: profileCompletion.isComplete
                  ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                  : (theme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
              },
            ]}
          >
            <Text
              style={[
                styles.onboardingPercentBadgeText,
                { color: profileCompletion.isComplete ? '#16a34a' : '#dc2626' },
              ]}
            >
              {profileCompletion.percentage}%
            </Text>
          </View>
        </View>

        {/* Progress Bar Track (Red if <100%, Green if 100%) */}
        <View style={[styles.onboardingHeroBarTrack, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.45)' : '#e2e8f0' }]}>
          <View
            style={[
              styles.onboardingHeroBarFill,
              {
                width: `${Math.max(8, profileCompletion.percentage)}%`,
                backgroundColor: profileCompletion.isComplete ? '#10b981' : '#ef4444',
              },
            ]}
          >
            <Text style={styles.onboardingHeroBarInner}>
              {profileCompletion.percentage}%
            </Text>
          </View>
        </View>

        {/* Incomplete Categories & Action Button */}
        <View style={styles.onboardingHeroFooter}>
          {!profileCompletion.isComplete ? (
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.onboardingMissingLabel, { color: theme.textMuted }]}>
                Incomplete Sections:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {profileCompletion.missingCountByTab.personal > 0 && (
                  <TouchableOpacity
                    style={[styles.missingTabChip, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2' }]}
                    onPress={() => setActiveTab('personal')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.missingTabChipText}>Personal ({profileCompletion.missingCountByTab.personal})</Text>
                  </TouchableOpacity>
                )}
                {profileCompletion.missingCountByTab.statutory > 0 && (
                  <TouchableOpacity
                    style={[styles.missingTabChip, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2' }]}
                    onPress={() => setActiveTab('statutory')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.missingTabChipText}>Bank & Tax ({profileCompletion.missingCountByTab.statutory})</Text>
                  </TouchableOpacity>
                )}
                {profileCompletion.missingCountByTab.history > 0 && (
                  <TouchableOpacity
                    style={[styles.missingTabChip, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2' }]}
                    onPress={() => setActiveTab('history')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.missingTabChipText}>Skills & Edu ({profileCompletion.missingCountByTab.history})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.onboardingActionBtn,
              { backgroundColor: profileCompletion.isComplete ? theme.primary : '#ef4444' },
            ]}
            onPress={() => openEditModal(profileCompletion.firstIncompleteTab)}
            activeOpacity={0.8}
          >
            <Icon name="task" size={13} color="#ffffff" />
            <Text style={styles.onboardingActionBtnText}>
              {profileCompletion.isComplete ? 'Edit Profile' : 'Complete Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. SEGMENTED TAB SWITCHER (Horizontal Capsule Strip with Incomplete Badges) */}
      <View style={[styles.segmentedPillContainer, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.inputBg, borderColor: theme.cardBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentedPillScroll}
        >
          {[
            { id: 'work', label: 'Work & Org', icon: 'home', count: profileCompletion.missingCountByTab.work },
            { id: 'personal', label: 'Personal Details', icon: 'user', count: profileCompletion.missingCountByTab.personal },
            { id: 'statutory', label: 'Bank & Statutory', icon: 'wallet', count: profileCompletion.missingCountByTab.statutory },
            { id: 'history', label: 'Education & Exp', icon: 'calendar', count: profileCompletion.missingCountByTab.history },
            { id: 'documents', label: `Documents (${documentsList.length})`, icon: 'document', count: profileCompletion.missingCountByTab.documents },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.segmentedPillBtn,
                  isActive && {
                    backgroundColor: theme.primary,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
                onPress={() => setActiveTab(tab.id as ProfileSectionTab)}
                activeOpacity={0.75}
              >
                <Icon
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? '#ffffff' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.segmentedPillText,
                    {
                      color: isActive ? '#ffffff' : theme.textMuted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadgeIncomplete, { backgroundColor: isActive ? '#ffffff' : '#ef4444' }]}>
                    <Text style={[styles.tabBadgeIncompleteText, { color: isActive ? '#ef4444' : '#ffffff' }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TAB CONTENT: Work & Organization */}
      {activeTab === 'work' && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Employment & Organization</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Company</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.companyName || companyConfig?.companyName || 'SWIFT HRMS'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Department</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.department || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Designation</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.designation || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Assigned Branches</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{branchNameDisplay}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Shift & Timings</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>
                {currentUser?.shift || `Regular Shift (${currentUser?.shiftStart || '09:00'} - ${currentUser?.shiftEnd || '18:00'})`}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Grace Period</Text>
              <Text style={[styles.infoVal, { color: theme.primary }]}>
                {currentUser?.graceTime === 'always' ? 'Flexible (Always)' : `${currentUser?.graceTime || '15'} mins (Morning) • ${currentUser?.afternoonGraceTime || '15'} mins (Afternoon)`}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Reporting Manager</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{reportingManagerDisplay}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Date of Joining</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.joiningDate || currentUser?.doj || '-'}</Text>
            </View>
            {currentUser?.probationDate ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Probation Review Date</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.probationDate}</Text>
              </View>
            ) : null}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>System Role</Text>
              <Text style={[styles.infoVal, { color: theme.primary }]}>{currentUser?.roleName || 'General Employee'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT: Personal & Address */}
      {activeTab === 'personal' && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Personal Demographics</Text>
            <TouchableOpacity
              style={[styles.sectionEditBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => openEditModal('personal')}
              activeOpacity={0.75}
            >
              <Icon name="task" size={12} color={theme.primary} />
              <Text style={[styles.sectionEditBtnText, { color: theme.primary }]}>Bulk Complete</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {renderEditableRow('name', 'Full Legal Name', currentUser?.name, { inputType: 'text', placeholder: 'Enter legal name' })}
            {renderEditableRow('gender', 'Gender', currentUser?.gender, { inputType: 'gender' })}
            {renderEditableRow('dob', 'Date of Birth', currentUser?.dob, { inputType: 'date', placeholder: 'YYYY-MM-DD' })}
            {renderEditableRow('bloodGroup', 'Blood Group', currentUser?.bloodGroup, { inputType: 'bloodGroup', highlightColor: '#dc2626' })}
            {renderEditableRow('maritalStatus', 'Marital Status', currentUser?.maritalStatus, { inputType: 'maritalStatus' })}
            {renderEditableRow('nationality', 'Nationality', currentUser?.nationality || 'Indian', { inputType: 'text' })}
            {renderEditableRow('fatherName', "Father's Name", currentUser?.fatherName, { inputType: 'text', placeholder: "Father's Name" })}
            {renderEditableRow('motherName', "Mother's Name", currentUser?.motherName, { inputType: 'text', placeholder: "Mother's Name" })}
            {renderEditableRow('spouseName', "Spouse's Name", currentUser?.spouseName, { inputType: 'text', isLast: true, placeholder: "Spouse's Name" })}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Contact & Emergency</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Work Email</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.email || '-'}</Text>
            </View>
            {renderEditableRow('phone', 'Personal Phone Number', currentUser?.phone, { inputType: 'phone', placeholder: '+91 98765 43210' })}
            {renderEditableRow('emergencyName', 'Emergency Contact Person', currentUser?.emergencyName, { inputType: 'text', placeholder: 'e.g. Parent / Spouse' })}
            {renderEditableRow('emergencyContact', 'Emergency Phone 1', currentUser?.emergencyContact || currentUser?.phone, { inputType: 'phone', highlightColor: '#ea580c', placeholder: '+91 98765 00000' })}
            {renderEditableRow('emergencyPhone2', 'Emergency Phone 2', currentUser?.emergencyPhone2, { inputType: 'phone', isLast: true, placeholder: '+91 98765 00000' })}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Residential Address</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {renderEditableRow('address', 'Current / Communication Address', fullAddressDisplay, { inputType: 'address', isLast: true })}
          </View>

          {/* Family Members Sub-list */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Family & Dependents ({familyList.length})</Text>
          {familyList.length > 0 ? (
            familyList.map((f, idx) => (
              <View key={idx} style={[styles.subListItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subListTitle, { color: theme.textPrimary }]}>{f.name}</Text>
                  <Text style={[styles.subListSub, { color: theme.textMuted }]}>
                    {f.relation} {f.dob ? `• Born ${f.dob}` : ''} {f.contact ? `• ${f.contact}` : ''}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: f.dependent ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : theme.inputBg }]}>
                  <Text style={[styles.tagBadgeText, { color: f.dependent ? '#16a34a' : theme.textMuted }]}>
                    {f.dependent ? 'Dependent' : 'Non-Dependent'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="info" size={15} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No family members or dependents submitted in onboarding profile.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB CONTENT: Bank & Statutory */}
      {activeTab === 'statutory' && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Salary & Bank Account</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.sectionEditBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => openEditModal('statutory')}
                activeOpacity={0.75}
              >
                <Icon name="task" size={12} color={theme.primary} />
                <Text style={[styles.sectionEditBtnText, { color: theme.primary }]}>Bulk Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMaskedData(!showMaskedData)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <Icon name="shield" size={13} color={theme.primary} />
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>
                  {showMaskedData ? 'Hide' : 'Reveal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {renderEditableRow(
              'bankAcc',
              'Bank Account & Banking Details',
              currentUser?.bankAcc
                ? `${currentUser?.bankName || 'Bank'} (A/C: ${showMaskedData ? currentUser.bankAcc : `•••• •••• ${currentUser.bankAcc.length >= 4 ? currentUser.bankAcc.slice(-4) : currentUser.bankAcc}`}) • IFSC: ${currentUser?.bankIfsc || '-'}`
                : (currentUser?.bankAccount || ''),
              { inputType: 'bank' }
            )}
            {renderEditableRow('bankBranch', 'Bank Branch', currentUser?.bankBranch, { inputType: 'text', placeholder: 'e.g. T Nagar, Chennai' })}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Account Type</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, textTransform: 'capitalize' }]}>{currentUser?.bankAccountType || (currentUser?.bankAcc ? 'Savings' : '-')}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Government & Statutory Identifiers</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {renderEditableRow('pan', 'PAN Card Number', currentUser?.panNumber || currentUser?.pan, { inputType: 'text', placeholder: 'ABCDE1234F' })}
            {renderEditableRow(
              'aadhaar',
              'Aadhaar Number',
              currentUser?.aadhaar
                ? (showMaskedData ? currentUser.aadhaar : `•••• •••• ${currentUser.aadhaar.length >= 4 ? currentUser.aadhaar.slice(-4) : currentUser.aadhaar}`)
                : '',
              { inputType: 'numeric', placeholder: '12-digit Aadhaar' }
            )}
            {renderEditableRow('uan', 'PF UAN Number', currentUser?.uan, { inputType: 'numeric', placeholder: '12-digit UAN' })}
            {renderEditableRow('pfNumber', 'PF Member ID', currentUser?.pfNumber, { inputType: 'text', placeholder: 'PF Member ID' })}
            {renderEditableRow('esic', 'ESIC Number', currentUser?.esic, { inputType: 'text', placeholder: 'ESIC Number' })}
            {renderEditableRow('ptNumber', 'Professional Tax ID', currentUser?.ptNumber, { inputType: 'text', placeholder: 'PT Number' })}
            {renderEditableRow('passportNumber', 'Passport Number', currentUser?.passportNumber, { inputType: 'text', placeholder: 'Passport Number' })}
            {renderEditableRow('drivingLicense', 'Driving License', currentUser?.drivingLicense, { inputType: 'text', isLast: true, placeholder: 'Driving License No' })}
          </View>

          {/* Statutory Enrollments Pill Row */}
          <View style={[styles.statutoryPillsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 8 }]}>Statutory Enrollments</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={[styles.enrollPill, { backgroundColor: currentUser?.pfEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.pfEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.pfEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.pfEligible !== false ? '#15803d' : '#991b1b' }]}>Provident Fund (PF)</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.esiEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.esiEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.esiEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.esiEligible !== false ? '#15803d' : '#991b1b' }]}>ESI Healthcare</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.ptEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.ptEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.ptEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.ptEligible !== false ? '#15803d' : '#991b1b' }]}>Professional Tax (PT)</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.tdsEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.tdsEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.tdsEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.tdsEligible !== false ? '#15803d' : '#991b1b' }]}>TDS Tax Deduction</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT: Education & Experience */}
      {activeTab === 'history' && (
        <View>
          {/* Skills & Languages */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Skills & Languages</Text>
            <TouchableOpacity
              style={[styles.sectionEditBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => openEditModal('history')}
              activeOpacity={0.75}
            >
              <Icon name="task" size={12} color={theme.primary} />
              <Text style={[styles.sectionEditBtnText, { color: theme.primary }]}>Bulk Complete</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {renderEditableRow('skills', 'Professional Skills', skillsList.join(', '), { inputType: 'tags', placeholder: 'e.g. React Native, Node.js, Sales' })}
            {renderEditableRow('languagesKnown', 'Languages Known', languagesList.join(', '), { inputType: 'tags', isLast: true, placeholder: 'e.g. English, Hindi, Tamil' })}
          </View>

          {/* Education Entries */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Education & Qualifications ({educationList.length})</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 14 }]}>
            {renderEditableRow(
              'education',
              'Highest Academic Qualification',
              educationList[0] ? `${educationList[0].level} • ${educationList[0].institute} (${educationList[0].year || 'Completed'})` : '',
              { inputType: 'education', isLast: true }
            )}
          </View>

          {/* Work Experience Entries */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>Prior Work Experience ({experienceList.length})</Text>
          {experienceList.length > 0 ? (
            experienceList.map((exp, idx) => (
              <View key={idx} style={[styles.subListItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subListTitle, { color: theme.textPrimary }]}>{exp.role || 'Role'}</Text>
                  <Text style={[styles.subListSub, { color: theme.textPrimary, fontWeight: '600', marginTop: 2 }]}>{exp.company || '-'}</Text>
                  <Text style={[styles.subListDetail, { color: theme.textMuted }]}>
                    {exp.from || 'Start'} to {exp.to || 'End'} {exp.ctc ? `• CTC: ₹${exp.ctc.toLocaleString()}` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="info" size={15} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No prior employment experience recorded (First employment / Fresher profile).
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB CONTENT: Documents & Compliance */}
      {activeTab === 'documents' && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Onboarding Verification Documents ({documentsList.length})</Text>
          {documentsList.length > 0 ? (
            documentsList.map((doc, idx) => (
              <View key={idx} style={[styles.docItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.docIconWrap, { backgroundColor: theme.inputBg }]}>
                  <Icon name="document" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docTitle, { color: theme.textPrimary }]} numberOfLines={1}>{doc.name || 'Document'}</Text>
                  <Text style={[styles.docSub, { color: theme.textMuted }]}>
                    Type: {doc.type ? doc.type.toUpperCase() : 'PDF'} • Uploaded {doc.uploadedAt || 'at Onboarding'}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: doc.verified !== false ? '#dcfce7' : '#fef3c7' }]}>
                  <Icon name={doc.verified !== false ? 'check' : 'alert-circle'} size={10} color={doc.verified !== false ? '#16a34a' : '#d97706'} />
                  <Text style={[styles.tagBadgeText, { color: doc.verified !== false ? '#15803d' : '#b45309' }]}>
                    {doc.verified !== false ? 'Verified' : 'Review'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="document" size={18} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No uploaded verification documents on file for this employee.
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>Compliance & Legal Sign-offs</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>NDA & Confidentiality</Text>
              <Text style={[styles.infoVal, { color: (currentUser?.ndaSigned || currentUser?.acceptance?.signed) ? '#16a34a' : theme.textPrimary, fontWeight: '800' }]}>
                {(currentUser?.ndaSigned || currentUser?.acceptance?.signed) ? 'Signed & Acknowledged ✓' : 'Self-Certified'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Background Verification</Text>
              <Text style={[styles.infoVal, { color: '#16a34a', fontWeight: '800' }]}>
                {currentUser?.backgroundCheckStatus === 'clear' ? 'Cleared (Green) ✓' : (currentUser?.backgroundCheckStatus ? `${currentUser.backgroundCheckStatus} ✓` : 'Verified ✓')}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Police Verification</Text>
              <Text style={[styles.infoVal, { color: currentUser?.policeVerification ? '#16a34a' : theme.textPrimary }]}>
                {currentUser?.policeVerification ? 'Verified ✓' : 'Self-Certified'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Medical Fitness Declaration</Text>
              <Text style={[styles.infoVal, { color: '#16a34a' }]}>
                {currentUser?.medicalFitness ? 'Submitted & Approved ✓' : 'Self-Declared'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* App Preferences Card */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>App Preferences & Security</Text>
      <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name={theme.isDark ? 'moon' : 'sun'} size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Theme Appearance</Text>
          </View>
          <Text style={[styles.settingVal, { color: theme.primary }]}>
            {theme.isDark ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </TouchableOpacity>

        {/* Color Palette Theme Option (Below Dark Mode Option) */}
        <View
          style={[
            styles.paletteOptionContainer,
            { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowPaletteModal(true)}
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
              <Icon name="sparkles" size={18} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Color Theme Palette</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }} numberOfLines={1}>
                  {getPaletteById(selectedPaletteId).name} • {getPaletteById(selectedPaletteId).vibe}
                </Text>
              </View>
            </View>

            <View style={styles.paletteTriggerRight}>
              <View style={styles.miniSwatchBar}>
                {getPaletteById(selectedPaletteId).hexes.map((h, i) => (
                  <View key={i} style={[styles.miniSwatchDot, { backgroundColor: h }]} />
                ))}
              </View>
              <Text style={[styles.settingVal, { color: theme.primary, marginLeft: 6 }]}>
                Change →
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Palette Horizontal Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPalettesRow}
            style={styles.quickPalettesScroll}
          >
            {COLOR_PALETTES.map((p) => {
              const isSelected = selectedPaletteId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.quickPaletteCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: isSelected ? theme.primary : theme.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => onSelectPalette && onSelectPalette(p.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickSwatchRow}>
                    {p.hexes.map((hex, i) => (
                      <View
                        key={i}
                        style={[
                          styles.quickSwatchSegment,
                          {
                            backgroundColor: hex,
                            borderTopLeftRadius: i === 0 ? 4 : 0,
                            borderBottomLeftRadius: i === 0 ? 4 : 0,
                            borderTopRightRadius: i === 4 ? 4 : 0,
                            borderBottomRightRadius: i === 4 ? 4 : 0,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.quickTitleRow}>
                    <Text
                      style={[
                        styles.quickPaletteName,
                        { color: isSelected ? theme.primary : theme.textPrimary, fontWeight: isSelected ? '800' : '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    {isSelected && <Icon name="check" size={10} color={theme.primary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={18} color={theme.primary} />
            <View>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Biometric AI Face Matching</Text>
              <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>Enrolled & Protected (Admin Locked)</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.settingVal, { color: isFaceEnrolled ? theme.success : '#d97706', fontWeight: '800' }]}>
              {isFaceEnrolled ? 'Enrolled ✓' : 'Pending'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
          onPress={onRefresh}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="history" size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Cloud Profile Sync</Text>
          </View>
          <Text style={[styles.settingVal, { color: theme.primary }]}>
            Tap to Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
        onPress={handleLogoutPress}
        activeOpacity={0.8}
      >
        <Icon name="logout" size={16} color={theme.danger} />
        <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Log Out of Account</Text>
      </TouchableOpacity>

      {/* 20 Curated Themes Modal */}
      <ThemePaletteModal
        visible={showPaletteModal}
        theme={theme}
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={(id) => {
          if (onSelectPalette) onSelectPalette(id);
        }}
        onClose={() => setShowPaletteModal(false)}
      />

      {/* COMPLETE / EDIT PROFILE MODAL */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Complete Profile & Onboarding
                </Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Fill all required fields to reach 100% onboarding completion.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => setShowEditModal(false)}
              >
                <Icon name="cross" size={16} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* SECTION: Personal Information */}
              <Text style={[styles.formSectionHeading, { color: theme.primary }]}>
                1. Personal & Contact Details
              </Text>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Full Legal Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter full legal name"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Gender *</Text>
                  <View style={styles.genderRow}>
                    {['male', 'female', 'other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.radioPill,
                          {
                            backgroundColor: formGender.toLowerCase() === g ? theme.primary : theme.inputBg,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                        onPress={() => setFormGender(g)}
                      >
                        <Text style={[styles.radioPillText, { color: formGender.toLowerCase() === g ? '#ffffff' : theme.textPrimary }]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Blood Group *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formBloodGroup}
                    onChangeText={setFormBloodGroup}
                    placeholder="e.g. O+, A+, B+"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Date of Birth (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formDob}
                    onChangeText={setFormDob}
                    placeholder="1995-08-15"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Marital Status *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formMaritalStatus}
                    onChangeText={setFormMaritalStatus}
                    placeholder="single / married"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Personal Mobile Number *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Emergency Contact Person *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formEmergencyName}
                    onChangeText={setFormEmergencyName}
                    placeholder="e.g. Parent / Spouse"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Emergency Phone Number *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formEmergencyPhone}
                    onChangeText={setFormEmergencyPhone}
                    placeholder="+91 98765 00000"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Residential Address *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Door No, Street name, Area"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>City *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formCity}
                    onChangeText={setFormCity}
                    placeholder="e.g. Chennai"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Pincode *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formPincode}
                    onChangeText={setFormPincode}
                    placeholder="600040"
                    keyboardType="numeric"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              {/* SECTION: Bank & Statutory */}
              <Text style={[styles.formSectionHeading, { color: theme.primary, marginTop: 18 }]}>
                2. Bank & Statutory Details
              </Text>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Bank Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder="e.g. HDFC Bank Ltd"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Account Number *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formBankAcc}
                    onChangeText={setFormBankAcc}
                    placeholder="5010001234567"
                    keyboardType="numeric"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>IFSC Code *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, textTransform: 'uppercase' }]}
                    value={formBankIfsc}
                    onChangeText={setFormBankIfsc}
                    placeholder="HDFC0001234"
                    autoCapitalize="characters"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>PAN Card Number *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, textTransform: 'uppercase' }]}
                    value={formPan}
                    onChangeText={setFormPan}
                    placeholder="ABCDE1234F"
                    autoCapitalize="characters"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Aadhaar Number *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formAadhaar}
                    onChangeText={setFormAadhaar}
                    placeholder="1234 5678 9012"
                    keyboardType="numeric"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>PF UAN Number (Optional/If enrolled)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formUan}
                onChangeText={setFormUan}
                placeholder="100987654321"
                keyboardType="numeric"
                placeholderTextColor={theme.textMuted}
              />

              {/* SECTION: Education & Skills */}
              <Text style={[styles.formSectionHeading, { color: theme.primary, marginTop: 18 }]}>
                3. Qualifications & Skills
              </Text>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Highest Academic Qualification *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formDegree}
                onChangeText={setFormDegree}
                placeholder="e.g. B.Tech / B.Sc / MBA"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.4 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>College / Institute *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formInstitute}
                    onChangeText={setFormInstitute}
                    placeholder="University / College"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flex: 0.6 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Year *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={formGradYear}
                    onChangeText={setFormGradYear}
                    placeholder="2022"
                    keyboardType="numeric"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Professional Skills (comma-separated) *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formSkills}
                onChangeText={setFormSkills}
                placeholder="React Native, Node.js, Customer Support, Operations"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Languages Known (comma-separated) *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={formLanguages}
                onChangeText={setFormLanguages}
                placeholder="English, Hindi, Tamil"
                placeholderTextColor={theme.textMuted}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={[styles.modalFooter, { borderTopColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Icon name="check" size={14} color="#ffffff" />
                    <Text style={styles.modalSaveBtnText}>Save & Sync 100%</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SINGLE FIELD TARGETED EDIT MODAL */}
      <Modal
        visible={singleFieldModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setSingleFieldModal({ open: false, config: null, val: '', subVals: {}, reason: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '90%' }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    Edit {singleFieldModal.config?.label || 'Field'}
                  </Text>
                </View>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Submit your update for HR / Admin review & approval.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.inputBg }]}
                onPress={() => setSingleFieldModal({ open: false, config: null, val: '', subVals: {}, reason: '' })}
              >
                <Icon name="cross" size={16} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Field Info & Current Value Pill */}
              <View style={[styles.oldValPreviewBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Text style={[styles.oldValLabel, { color: theme.textMuted }]}>Current Recorded Value:</Text>
                <Text style={[styles.oldValText, { color: theme.textPrimary }]}>
                  {singleFieldModal.config?.currentValue || '(Not configured / Empty)'}
                </Text>
              </View>

              {/* INPUT TYPE: GENDER */}
              {singleFieldModal.config?.inputType === 'gender' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Select Gender *</Text>
                  <View style={styles.genderRow}>
                    {['male', 'female', 'other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.radioPill,
                          {
                            backgroundColor: singleFieldModal.val.toLowerCase() === g ? theme.primary : theme.inputBg,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                        onPress={() => setSingleFieldModal((prev) => ({ ...prev, val: g }))}
                      >
                        <Text style={[styles.radioPillText, { color: singleFieldModal.val.toLowerCase() === g ? '#ffffff' : theme.textPrimary }]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* INPUT TYPE: BLOOD GROUP */}
              {singleFieldModal.config?.inputType === 'bloodGroup' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Select Blood Group *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        style={[
                          styles.bloodGroupPill,
                          {
                            backgroundColor: singleFieldModal.val === bg ? '#dc2626' : theme.inputBg,
                            borderColor: singleFieldModal.val === bg ? '#dc2626' : theme.cardBorder,
                          },
                        ]}
                        onPress={() => setSingleFieldModal((prev) => ({ ...prev, val: bg }))}
                      >
                        <Text style={[styles.bloodGroupPillText, { color: singleFieldModal.val === bg ? '#ffffff' : theme.textPrimary }]}>
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* INPUT TYPE: MARITAL STATUS */}
              {singleFieldModal.config?.inputType === 'maritalStatus' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Select Marital Status *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {['single', 'married', 'divorced', 'widowed'].map((ms) => (
                      <TouchableOpacity
                        key={ms}
                        style={[
                          styles.radioPill,
                          {
                            backgroundColor: singleFieldModal.val.toLowerCase() === ms ? theme.primary : theme.inputBg,
                            borderColor: theme.cardBorder,
                            flex: 0,
                            paddingHorizontal: 16,
                          },
                        ]}
                        onPress={() => setSingleFieldModal((prev) => ({ ...prev, val: ms }))}
                      >
                        <Text style={[styles.radioPillText, { color: singleFieldModal.val.toLowerCase() === ms ? '#ffffff' : theme.textPrimary }]}>
                          {ms.charAt(0).toUpperCase() + ms.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* INPUT TYPE: ADDRESS (Full Address + City + State + Pincode) */}
              {singleFieldModal.config?.inputType === 'address' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Street Address / Line 1 *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                    value={singleFieldModal.val}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, val: t }))}
                    placeholder="Door No, Street name, Landmark"
                    placeholderTextColor={theme.textMuted}
                    multiline
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>City *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                        value={singleFieldModal.subVals.city || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, city: t } }))}
                        placeholder="e.g. Chennai"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Pincode *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                        value={singleFieldModal.subVals.pincode || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, pincode: t } }))}
                        placeholder="600040"
                        keyboardType="numeric"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>

                  <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 8 }]}>State / Province *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={singleFieldModal.subVals.state || ''}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, state: t } }))}
                    placeholder="e.g. Tamil Nadu"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              )}

              {/* INPUT TYPE: BANK (Bank Name + Account + IFSC + Branch) */}
              {singleFieldModal.config?.inputType === 'bank' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Bank Name *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={singleFieldModal.subVals.bankName || ''}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, bankName: t } }))}
                    placeholder="e.g. HDFC Bank Ltd"
                    placeholderTextColor={theme.textMuted}
                  />

                  <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 8 }]}>Account Number *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={singleFieldModal.val}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, val: t }))}
                    placeholder="5010001234567"
                    keyboardType="numeric"
                    placeholderTextColor={theme.textMuted}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>IFSC Code *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, textTransform: 'uppercase' }]}
                        value={singleFieldModal.subVals.bankIfsc || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, bankIfsc: t.toUpperCase() } }))}
                        placeholder="HDFC0001234"
                        autoCapitalize="characters"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Branch Name</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                        value={singleFieldModal.subVals.bankBranch || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, bankBranch: t } }))}
                        placeholder="e.g. T Nagar"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* INPUT TYPE: EDUCATION (Degree + Institute + Year) */}
              {singleFieldModal.config?.inputType === 'education' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Degree / Qualification Level *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={singleFieldModal.val}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, val: t }))}
                    placeholder="e.g. B.Tech Computer Science / MBA"
                    placeholderTextColor={theme.textMuted}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>College / University *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                        value={singleFieldModal.subVals.institute || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, institute: t } }))}
                        placeholder="University Name"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                    <View style={{ flex: 0.6 }}>
                      <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Year *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                        value={singleFieldModal.subVals.year || ''}
                        onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, subVals: { ...prev.subVals, year: t } }))}
                        placeholder="2022"
                        keyboardType="numeric"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* INPUT TYPE: TAGS (Skills / Languages) */}
              {singleFieldModal.config?.inputType === 'tags' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>
                    {singleFieldModal.config?.label} (comma-separated) *
                  </Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={singleFieldModal.val}
                    onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, val: t }))}
                    placeholder={singleFieldModal.config?.placeholder || 'e.g. React, Node.js, Sales'}
                    placeholderTextColor={theme.textMuted}
                  />
                  {/* Live tag preview */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {singleFieldModal.val
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((t, i) => (
                        <View key={i} style={[styles.chip, { backgroundColor: theme.inputBg, borderColor: theme.primary }]}>
                          <Text style={[styles.chipText, { color: theme.primary }]}>{t}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* DEFAULT TEXT / PHONE / NUMERIC / DATE INPUT */}
              {['text', 'phone', 'numeric', 'date'].includes(singleFieldModal.config?.inputType || '') && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>
                    New {singleFieldModal.config?.label} *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: theme.cardBorder,
                        textTransform: singleFieldModal.config?.key.includes('pan') ? 'uppercase' : 'none',
                      },
                    ]}
                    value={singleFieldModal.val}
                    onChangeText={(t) =>
                      setSingleFieldModal((prev) => ({
                        ...prev,
                        val: singleFieldModal.config?.key.includes('pan') ? t.toUpperCase() : t,
                      }))
                    }
                    placeholder={singleFieldModal.config?.placeholder || `Enter ${singleFieldModal.config?.label}`}
                    placeholderTextColor={theme.textMuted}
                    keyboardType={
                      singleFieldModal.config?.inputType === 'phone'
                        ? 'phone-pad'
                        : singleFieldModal.config?.inputType === 'numeric'
                        ? 'numeric'
                        : 'default'
                    }
                    autoCapitalize={singleFieldModal.config?.key.includes('pan') ? 'characters' : 'sentences'}
                  />
                </View>
              )}

              {/* Reason / Notes Input for Admin */}
              <Text style={[styles.formLabel, { color: theme.textPrimary, marginTop: 14 }]}>
                Reason / Note for Admin (Optional)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary,
                    borderColor: theme.cardBorder,
                    height: 54,
                    textAlignVertical: 'top',
                    paddingTop: 8,
                  },
                ]}
                value={singleFieldModal.reason}
                onChangeText={(t) => setSingleFieldModal((prev) => ({ ...prev, reason: t }))}
                placeholder="e.g. Updated primary contact number"
                placeholderTextColor={theme.textMuted}
                multiline
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={[styles.modalFooter, { borderTopColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => setSingleFieldModal({ open: false, config: null, val: '', subVals: {}, reason: '' })}
                disabled={isSaving}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveSingleField}
                disabled={isSaving || !singleFieldModal.val.trim()}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Icon name="check" size={14} color="#ffffff" />
                    <Text style={styles.modalSaveBtnText}>Submit for Approval</Text>
                  </>
                )}
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
    paddingBottom: 110,
  },

  // 1. HERO CARD (White Background with Theme-Based Border)
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroAvatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  heroAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroAvatarInitial: {
    fontSize: 32,
    fontWeight: '900',
  },
  heroTopRightStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  heroPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  heroPillTextTop: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroPillBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillTextBottom: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  heroNameCol: {
    flex: 1,
    marginRight: 12,
  },
  heroNameText: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroRoleText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 3,
  },
  heroInfoBoxesCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  heroInfoBox: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 9,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroInfoBoxText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // 2. MIDDLE QUICK METRIC STRIP
  metricStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 0,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  metricMainText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  metricLabelText: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  metricVerticalDivider: {
    width: 1,
    height: 32,
    opacity: 0.6,
  },

  // 3. SEGMENTED TAB SWITCHER
  segmentedPillContainer: {
    borderRadius: 14,
    borderWidth: 0,
    padding: 3.5,
    marginBottom: 16,
  },
  segmentedPillScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  segmentedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentedPillText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  subListItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  subListTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  subListSub: {
    fontSize: 12,
  },
  subListDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statutoryPillsCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  enrollPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  enrollPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  docSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emptyCardText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  settingCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  paletteOptionContainer: {
    marginBottom: 4,
  },
  paletteTriggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniSwatchBar: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  miniSwatchDot: {
    width: 9,
    height: 14,
    borderRadius: 2,
  },
  quickPalettesScroll: {
    marginTop: 10,
    marginBottom: 2,
  },
  quickPalettesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  quickPaletteCard: {
    borderRadius: 12,
    padding: 8,
    width: 130,
  },
  quickSwatchRow: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quickSwatchSegment: {
    flex: 1,
    height: '100%',
  },
  quickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickPaletteName: {
    fontSize: 11,
    flex: 1,
  },

  // ONBOARDING STATUS HERO CARD
  onboardingHeroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  onboardingHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusHeroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onboardingHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  onboardingHeroSub: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  onboardingPercentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onboardingPercentBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  onboardingHeroBarTrack: {
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  onboardingHeroBarFill: {
    height: '100%',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  onboardingHeroBarInner: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
  },
  onboardingHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onboardingMissingLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  missingTabChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  missingTabChipText: {
    fontSize: 10.5,
    color: '#dc2626',
    fontWeight: '700',
  },
  onboardingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  onboardingActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Incomplete Tab Pill Badge
  tabBadgeIncomplete: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeIncompleteText: {
    fontSize: 10,
    fontWeight: '900',
  },

  // COMPLETE PROFILE MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  formSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 8,
  },
  formInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  radioPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Pending Banner
  pendingApprovalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  pendingBannerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  pendingBannerSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  // Section Header with Edit Btn
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionEditBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Per-Field Editable Rows
  editableInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  rowEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pendingPillBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#d97706',
  },
  oldValPreviewBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  oldValLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  oldValText: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 3,
  },
  bloodGroupPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodGroupPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

