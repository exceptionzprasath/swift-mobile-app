import React, { useState } from 'react';
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
} from 'react-native';
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

const DEFAULT_COMPANY_AGREEMENTS: CompanyAgreementItem[] = [
  {
    code: 'APT',
    title: 'Appointment Letter & Terms of Employment',
    category: 'Employment Contract',
    description: 'Formal appointment letter governing terms of employment, compensation, and workplace guidelines.',
    terms: `1. Employment Terms: The employee is appointed in the assigned role and department subject to standard probation and performance reviews.
2. Duties & Working Hours: The employee agrees to perform assigned duties diligently and abide by company working hours, shift timings, and attendance policies.
3. Compensation: Remuneration, allowances, statutory deductions (PF, ESI, PT, TDS) are processed as per the company payroll structure.
4. Confidentiality: The employee shall not disclose proprietary business information, source code, client data, or trade secrets to any third party.
5. Termination: Either party may terminate employment with required notice period or salary in lieu thereof as per company policy.`,
  },
  {
    code: 'NDA',
    title: 'Non-Disclosure & Confidentiality Agreement',
    category: 'Legal & IP',
    description: 'Agreement protecting company confidential information, intellectual property, and client data.',
    terms: `1. Scope of Confidential Information: All technical data, trade secrets, software code, customer lists, business plans, and financial details.
2. Non-Disclosure Obligations: The employee agrees to hold all confidential information in strict trust and not disclose to unauthorized persons.
3. Return of Materials: Upon departure or request, all physical and electronic documents, devices, and copies must be returned immediately.
4. Survival: Confidentiality obligations survive termination of employment indefinitely.`,
  },
  {
    code: 'COC',
    title: 'Employee Code of Conduct & Workplace Ethics',
    category: 'Compliance',
    description: 'Standards of professional behavior, anti-harassment, non-discrimination, and integrity guidelines.',
    terms: `1. Professional Conduct: Employees must treat colleagues, clients, and partners with dignity, fairness, and mutual respect.
2. Prevention of Harassment (POSH): Zero tolerance for any form of sexual harassment, discrimination, bullying, or intimidation.
3. Conflict of Interest: Employees must avoid outside business engagements or personal interests that conflict with company obligations.
4. Use of Company Assets: Company hardware, software licenses, and accounts must be used for legitimate business purposes only.`,
  },
  {
    code: 'POL',
    title: 'Information Security & IT Usage Policy',
    category: 'IT & Security',
    description: 'Rules for electronic equipment usage, strong passwords, data protection, and cloud access.',
    terms: `1. Access Security: Multi-factor authentication (MFA) and strong passwords are required. Sharing passwords is strictly forbidden.
2. Device Security: Company laptops and mobile devices must remain encrypted and locked when unattended.
3. Data Protection: Downloading unauthorized software or transferring internal data to unapproved personal storage is prohibited.
4. Incident Reporting: Any lost device or security breach must be reported immediately to the IT administrator.`,
  },
  {
    code: 'PFR',
    title: 'EPF / EPS Statutory Declaration (Form 11)',
    category: 'Statutory Compliance',
    description: 'Declaration for membership under the Employees Provident Fund & Miscellaneous Provisions Act.',
    terms: `1. I hereby declare that I agree to contribute to the Employees Provident Fund (EPF) and Pension Scheme (EPS) as applicable by law.
2. I certify that the Aadhaar and PAN details submitted by me are correct and can be linked for Universal Account Number (UAN) generation.
3. I understand that previous employer PF transfers or withdrawals must be declared truthfully.`,
  },
  {
    code: 'ESI',
    title: 'ESIC Medical Benefit Joining Declaration',
    category: 'Statutory Benefits',
    description: 'Declaration for health and medical benefit insurance under Employees State Insurance Corporation.',
    terms: `1. I hereby declare that I agree to enroll under the Employees State Insurance (ESI) scheme as per statutory wage eligibility.
2. Details of dependent family members provided during registration are accurate for ESI biometric e-Pehchan card issuance.
3. I undertake to report any change in family dependents or residential address promptly to HR.`,
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
    docRequests,
    userRole,
    canApproveDocuments,
    actOnDocStep,
    forwardDocStep,
    acceptDocument,
    signCompanyDocument,
    uploadEmployeeDocument,
    deleteEmployeeDocument,
    employees,
    roles,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'onboarding' | 'uploads' | 'approvals'>('onboarding');

  // Modal states for signing company agreement
  const [signingAgr, setSigningAgr] = useState<CompanyAgreementItem | null>(null);
  const [agrSignatureText, setAgrSignatureText] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Modal states for doc requests
  const [signingDocReq, setSigningDocReq] = useState<DocRequest | null>(null);
  const [docReqSignatureText, setDocReqSignatureText] = useState('');

  // Modal states for uploading new document
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(KYC_DOC_CATEGORIES[0]);
  const [uploadDocName, setUploadDocName] = useState('');

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);

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

  // Employee's signed agreements
  const signedDocs = currentUser?.signedDocs || {};
  const uploadedDocs = currentUser?.documentsUploaded || [];

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
  const pendingAgreementCount = DEFAULT_COMPANY_AGREEMENTS.filter((agr) => {
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

  // --- Handlers for Uploading KYC Proofs ---
  const handleConfirmUpload = async () => {
    const docTitle = uploadDocName.trim() || `${uploadCategory} - ${currentUser?.name || 'Employee'}`;
    setBusy(true);

    // Create standard data URL document attachment
    const simulatedDataUrl = `data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp420...${encodeURIComponent(docTitle)}`;

    const ok = await uploadEmployeeDocument({
      type: uploadCategory,
      name: docTitle,
      dataUrl: simulatedDataUrl,
    });
    setBusy(false);

    if (ok) {
      Alert.alert('Document Uploaded', `"${docTitle}" has been saved and synced with HR Admin.`);
      setUploadDocName('');
      setUploadModalOpen(false);
    } else {
      Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Documents &amp; Signatures</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {currentUser?.name} · {currentUser?.designation || 'Employee'} ({currentUser?.empCode || 'SWIFT'})
          </Text>
        </View>
      </View>

      {/* Segmented Tab Navigation */}
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
              Sign &amp; Acknowledge
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
            Company Onboarding Agreements ({DEFAULT_COMPANY_AGREEMENTS.length})
          </Text>

          <View style={styles.cardList}>
            {DEFAULT_COMPANY_AGREEMENTS.map((agr) => {
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

          {/* Issued Official Letters from HR */}
          {myIssuedDocs.length > 0 && (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Letters Issued from HR ({myIssuedDocs.length})
              </Text>
              {myIssuedDocs.map((doc) => {
                const isApproved = doc.status === 'approved';
                const isPending = doc.status === 'pending';
                const needsSignature = isApproved && !doc.employeeAccepted;
                const isAccepted = isApproved && doc.employeeAccepted;

                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.docCard,
                      { backgroundColor: theme.card, borderColor: needsSignature ? theme.primary : theme.cardBorder },
                    ]}
                  >
                    <View style={[styles.docIconBg, { backgroundColor: theme.tealSoft }]}>
                      <Icon name="document" size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{doc.letterTitle}</Text>
                      <Text style={[styles.docMeta, { color: theme.textMuted }]}>
                        Format: {doc.format?.toUpperCase() || 'PDF'} · Date: {new Date(doc.requestedAt).toLocaleDateString()}
                      </Text>

                      <View style={styles.statusPillRow}>
                        {isPending && (
                          <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
                            <Text style={[styles.statusPillText, { color: '#b45309' }]}>⏳ Under Review</Text>
                          </View>
                        )}
                        {needsSignature && (
                          <View style={[styles.statusPill, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.statusPillText, { color: '#b91c1c' }]}>✍️ E-Signature Required</Text>
                          </View>
                        )}
                        {isAccepted && (
                          <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.statusPillText, { color: '#15803d' }]}>✅ Accepted &amp; Signed</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionsCol}>
                      {needsSignature ? (
                        <TouchableOpacity
                          style={[styles.signBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleOpenSignDocReq(doc)}
                        >
                          <Text style={styles.signBtnText}>Sign</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                          onPress={() => Alert.alert('Download', `Downloading ${doc.letterTitle}...`)}
                        >
                          <Icon name="download" size={16} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MY UPLOADS & KYC DOCUMENT LOCKER */}
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
              <Text style={[styles.termsTitle, { color: theme.textPrimary }]}>Terms &amp; Conditions Summary:</Text>
              <Text style={[styles.termsText, { color: theme.textMuted }]}>{signingAgr?.terms}</Text>
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

            <View style={[styles.fileAttachmentNotice, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Icon name="document" size={18} color={theme.primary} />
              <Text style={[styles.fileAttachmentText, { color: theme.textMuted }]}>
                Format: PDF, JPG, PNG accepted (up to 10MB).
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setUploadModalOpen(false)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmUpload}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Upload &amp; Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: PREVIEW DOCUMENT */}
      {/* ============================================================ */}
      <Modal visible={!!previewDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{previewDoc?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Category: {previewDoc?.type} · Uploaded on {previewDoc?.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleDateString() : 'N/A'}
            </Text>

            <View style={[styles.docPreviewArea, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Icon name="document" size={48} color={theme.primary} />
              <Text style={[styles.docPreviewText, { color: theme.textPrimary, marginTop: 8 }]}>
                {previewDoc?.name}
              </Text>
              <Text style={[styles.docPreviewSub, { color: theme.textMuted }]}>
                {previewDoc?.verified ? '✅ Verified Document' : '⏳ Awaiting HR Verification'}
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary, width: '100%' }]}
                onPress={() => setPreviewDoc(null)}
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
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  counterBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabSection: {
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoBannerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  cardList: {
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
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
    gap: 6,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  docDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  statusPillRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  signBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  reSignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  reSignBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
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
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  uploadCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  uploadCardDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  uploadActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  uploadActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
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
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  roleBannerText: {
    fontSize: 12,
    flex: 1,
  },
  approvalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
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
    fontSize: 10.5,
    lineHeight: 16,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  ackLabel: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  signAgreementBox: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  signAgreementText: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    marginBottom: 14,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  categoryChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 10.5,
  },
  fileAttachmentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  fileAttachmentText: {
    fontSize: 10.5,
    flex: 1,
  },
  docPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
  },
  docPreviewText: {
    fontSize: 13,
    fontWeight: '700',
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
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
