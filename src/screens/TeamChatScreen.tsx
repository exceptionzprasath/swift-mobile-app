import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import {
  fetchTeamGroups,
  fetchGroupMessages,
  requestCreateGroup,
  getWebSocketUrl,
} from '../services/api';

interface TeamChatScreenProps {
  theme: ThemeColors;
  onBack?: () => void;
}

export interface TeamGroupMember {
  id: string;
  name: string;
  role?: string;
  department?: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface TeamGroupMessage {
  id: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  time: string;
  isSystem?: boolean;
  createdAt?: string;
}

export interface TeamGroup {
  id: string;
  subject: string;
  description?: string;
  iconEmoji: string;
  iconBgColor: string;
  createdBy: string;
  creatorId?: string;
  createdAt: string;
  status: 'approved' | 'pending_approval' | 'rejected';
  members: TeamGroupMember[];
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageSender: string;
  unreadCount: number;
  requestId?: string;
  updatedAt?: string;
}

const STORAGE_GROUPS_KEY = '@swift_team_groups_cache_v2';
const STORAGE_MSGS_PREFIX = '@swift_team_group_msgs_cache_';

const EMOJI_OPTIONS = ['🚀', '💼', '⚡', '🎨', '📢', '☕', '🌟', '🎯', '💡', '🛡️', '📊', '🤝'];
const COLOR_OPTIONS = ['#075E54', '#128C7E', '#25D366', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const PARTICIPANT_COLORS = [
  '#0284c7',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#2563eb',
  '#4f46e5',
];

export function TeamChatScreen({ theme, onBack }: TeamChatScreenProps) {
  const { currentUser, employees } = useAppContext();
  const currentUserId = currentUser?.id || currentUser?.empCode || 'user-1';
  const currentUserName = currentUser?.name || 'You';
  const effectiveTenantId = currentUser?.tenantId || 'swift';

  // Screen View States: 'list' | 'create_step1' | 'create_step2' | 'chat'
  const [currentView, setCurrentView] = useState<'list' | 'create_step1' | 'create_step2' | 'chat'>('list');
  const [activeGroupTab, setActiveGroupTab] = useState<'approved' | 'pending'>('approved');
  const [activeGroup, setActiveGroup] = useState<TeamGroup | null>(null);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [groupMessages, setGroupMessages] = useState<TeamGroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [isConnectedWs, setIsConnectedWs] = useState(false);

  // Search in group list
  const [searchQuery, setSearchQuery] = useState('');

  // Group Creation Step 1 State (Select Participants)
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Group Creation Step 2 State (Subject & Icon)
  const [groupSubject, setGroupSubject] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [selectedColor, setSelectedColor] = useState('#128C7E');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group Conversation State
  const [messageInput, setMessageInput] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const chatScrollRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeGroupIdRef = useRef<string | null>(null);

  // Keep ref up to date for WS callbacks
  useEffect(() => {
    activeGroupIdRef.current = activeGroup?.id || null;
  }, [activeGroup]);

  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    bottomInset = insets?.bottom || 0;
  } catch (e) {}

  const safeBottomMargin = Math.max(bottomInset, 8) + 6;
  const floatingBtnBottomMargin = Math.max(bottomInset, 16) + 14;

  // On Android with windowSoftInputMode adjustResize, the window automatically resizes to the keyboard.
  // We only need a snug 6px padding above the keyboard when typing, just like WhatsApp.
  const currentBottomMargin = isKeyboardVisible
    ? 6
    : (currentView === 'chat' ? safeBottomMargin : floatingBtnBottomMargin);

  // Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ==========================================
  // WEBSOCKET REAL-TIME CONNECTION
  // ==========================================
  const connectWebSocket = useCallback(() => {
    try {
      const url = getWebSocketUrl();
      console.log('[TeamChat WS] Connecting to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TeamChat WS] Connected successfully');
        setIsConnectedWs(true);
        // Register client
        ws.send(
          JSON.stringify({
            type: 'join',
            tenantId: effectiveTenantId,
            employeeId: currentUserId,
            groupId: activeGroupIdRef.current,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[TeamChat WS] Received message:', data.type);

          if (data.type === 'new_message') {
            const { groupId, message } = data;
            // If message is for currently open group chat:
            if (activeGroupIdRef.current === groupId) {
              setGroupMessages((prev) => {
                // 1. If message with same ID already exists, replace it cleanly
                const existingIdx = prev.findIndex((m) => m.id === message.id);
                if (existingIdx !== -1) {
                  const updated = [...prev];
                  updated[existingIdx] = message;
                  return updated;
                }

                // 2. If sender is current user and matches recent optimistic message text, replace the optimistic message
                const optimisticMatchIdx = prev.findIndex(
                  (m) =>
                    m.senderId === message.senderId &&
                    m.text === message.text &&
                    Math.abs(new Date(m.createdAt || 0).getTime() - new Date(message.createdAt || 0).getTime()) < 6000
                );
                if (optimisticMatchIdx !== -1) {
                  const updated = [...prev];
                  updated[optimisticMatchIdx] = message;
                  return updated;
                }

                return [...prev, message];
              });
              setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
            }

            // Update preview in groups list
            setGroups((prev) =>
              prev.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      lastMessageText: message.text,
                      lastMessageTime: message.time,
                      lastMessageSender: message.senderName,
                      unreadCount: activeGroupIdRef.current === groupId ? 0 : g.unreadCount + 1,
                    }
                  : g
              )
            );
          } else if (data.type === 'group_status_changed') {
            const { groupId, status, group } = data;
            console.log(`[TeamChat WS] Group ${groupId} status changed to ${status}`);

            setGroups((prev) => {
              const exists = prev.some((g) => g.id === groupId);
              if (exists) {
                return prev.map((g) => (g.id === groupId ? { ...g, status, ...(group || {}) } : g));
              } else if (group) {
                return [group, ...prev];
              }
              return prev;
            });

            if (status === 'approved') {
              Alert.alert(
                'Group Approved! 🎉',
                `Your group "${group?.subject || 'Team Group'}" has been approved by the Admin and is now ready for chat!`
              );
            }
          }
        } catch (err) {
          console.warn('[TeamChat WS] Error parsing message:', err);
        }
      };

      ws.onerror = (e: any) => {
        console.warn('[TeamChat WS] Socket error:', e?.message || e);
        setIsConnectedWs(false);
      };

      ws.onclose = () => {
        console.log('[TeamChat WS] Disconnected');
        setIsConnectedWs(false);
      };
    } catch (err) {
      console.warn('[TeamChat WS] Connection exception:', err);
    }
  }, [effectiveTenantId, currentUserId]);

  useEffect(() => {
    connectWebSocket();

    // Heartbeat ping every 25 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // When active group changes, inform WS server of room switch
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === 1 && activeGroup) {
      wsRef.current.send(
        JSON.stringify({
          type: 'join',
          tenantId: effectiveTenantId,
          employeeId: currentUserId,
          groupId: activeGroup.id,
        })
      );
    }
  }, [activeGroup, effectiveTenantId, currentUserId]);

  // ==========================================
  // LOAD REAL GROUPS FROM BACKEND API
  // ==========================================
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiGroups = await fetchTeamGroups(effectiveTenantId, currentUserId);
      if (Array.isArray(apiGroups)) {
        setGroups(apiGroups);
        await AsyncStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(apiGroups));
      } else {
        // Fallback to cache if offline
        const cached = await AsyncStorage.getItem(STORAGE_GROUPS_KEY);
        if (cached) setGroups(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('[TeamChat] Failed to load groups:', e);
      const cached = await AsyncStorage.getItem(STORAGE_GROUPS_KEY);
      if (cached) setGroups(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveTenantId, currentUserId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Open a group conversation
  const handleOpenGroup = async (group: TeamGroup) => {
    if (group.status === 'pending_approval') {
      Alert.alert(
        'Awaiting Admin Approval',
        `Group "${group.subject}" is currently pending approval by your company admin. Once approved, the chat will be unlocked for all ${group.members?.length || 0} participants.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (group.status === 'rejected') {
      Alert.alert(
        'Group Request Declined',
        `The creation request for group "${group.subject}" was declined by the administrator.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setActiveGroup(group);
    setCurrentView('chat');

    // Fetch real group messages from API
    try {
      const msgs = await fetchGroupMessages(effectiveTenantId, group.id);
      if (Array.isArray(msgs) && msgs.length > 0) {
        setGroupMessages(msgs);
        await AsyncStorage.setItem(`${STORAGE_MSGS_PREFIX}${group.id}`, JSON.stringify(msgs));
      } else {
        const cached = await AsyncStorage.getItem(`${STORAGE_MSGS_PREFIX}${group.id}`);
        if (cached) {
          setGroupMessages(JSON.parse(cached));
        } else {
          // Clean initial system encryption note
          const initialMsgs: TeamGroupMessage[] = [
            {
              id: `sys-1`,
              senderId: 'system',
              senderName: 'System',
              text: `🔒 Messages and calls are end-to-end encrypted within your organization.`,
              time: group.createdAt ? new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
              isSystem: true,
            },
          ];
          setGroupMessages(initialMsgs);
        }
      }
    } catch (err) {
      console.warn('[TeamChat] Error loading messages:', err);
    }
  };

  // Start Group Creation Flow
  const handleStartCreateGroup = () => {
    setSelectedMemberIds([]);
    setParticipantSearch('');
    setGroupSubject('');
    setGroupDescription('');
    setSelectedEmoji('🚀');
    setSelectedColor('#128C7E');
    setCurrentView('create_step1');
  };

  const handleToggleMember = (empId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleProceedToStep2 = () => {
    if (selectedMemberIds.length === 0) {
      Alert.alert('Select Participants', 'Please select at least 1 colleague to create a group.');
      return;
    }
    setCurrentView('create_step2');
  };

  // Finalize Group Creation: SUBMITS APPROVAL REQUEST TO BACKEND
  const handleFinalizeCreateGroup = async () => {
    if (!groupSubject.trim()) {
      Alert.alert('Group Subject Required', 'Please provide a subject for the new group.');
      return;
    }

    setIsSubmittingGroup(true);

    const selectedEmployees = (employees || []).filter((e: any) =>
      selectedMemberIds.includes(e.id || e.empCode)
    );

    const membersList: TeamGroupMember[] = [
      {
        id: currentUserId,
        name: currentUserName,
        role: currentUser?.designation || 'Creator',
        department: currentUser?.department || 'Operations',
        avatar: currentUser?.photoDataUrl,
        isAdmin: true,
      },
      ...selectedEmployees.map((e: any) => ({
        id: e.id || e.empCode,
        name: e.name,
        role: e.designation || e.roleName || 'Member',
        department: e.department || 'Team',
        avatar: e.photoDataUrl,
        isAdmin: false,
      })),
    ];

    try {
      const res = await requestCreateGroup({
        tenantId: effectiveTenantId,
        creatorId: currentUserId,
        creatorName: currentUserName,
        subject: groupSubject.trim(),
        description: groupDescription.trim() || undefined,
        iconEmoji: selectedEmoji,
        iconBgColor: selectedColor,
        members: membersList,
      });

      if (res && res.success && res.group) {
        setGroups((prev) => [res.group, ...prev]);
        setActiveGroupTab('pending');
        setCurrentView('list');

        Alert.alert(
          'Group Request Submitted! ⏳',
          `Your request to create "${groupSubject.trim()}" has been sent to the Admin Panel for approval.\n\nOnce approved by the Administrator, the group will become active and all ${membersList.length} members will be able to chat.`,
          [{ text: 'Great' }]
        );
      } else {
        Alert.alert('Error', res?.error || 'Failed to submit group creation request. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Could not reach server.');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Send Message in Active Group
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeGroup) return;

    const text = messageInput.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clientMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const localMsg: TeamGroupMessage = {
      id: clientMsgId,
      groupId: activeGroup.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUser?.designation || 'Member',
      text,
      time: timeNow,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update UI immediately
    setGroupMessages((prev) => [...prev, localMsg]);
    setMessageInput('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);

    // Send via WebSocket with the exact message ID
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(
        JSON.stringify({
          type: 'send_message',
          id: clientMsgId,
          tenantId: effectiveTenantId,
          groupId: activeGroup.id,
          senderId: currentUserId,
          senderName: currentUserName,
          text,
          time: timeNow,
        })
      );
    } else {
      console.warn('[TeamChat] WS not connected, attempting reconnect...');
      connectWebSocket();
    }
  };

  const getParticipantColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PARTICIPANT_COLORS.length;
    return PARTICIPANT_COLORS[idx];
  };

  // Filter ONLY real employees (exclude self, exclude mock demo IDs like emp-01/emp-02 if real employees exist)
  const availableEmployees = (employees || []).filter((e: any) => {
    const isSelf = e.id === currentUserId || e.empCode === currentUserId || e.name === currentUserName;
    if (isSelf) return false;

    // Exclude mock demo IDs if we have real employee IDs (uuid-like or specific company names)
    const hasRealEmployees = (employees || []).some(
      (emp: any) => emp.id && emp.id.length > 10 && !emp.id.startsWith('emp-0')
    );
    if (hasRealEmployees && (e.id === 'emp-01' || e.id === 'emp-02' || e.id === 'emp-03' || e.id === 'emp-04' || e.id === 'emp-05' || e.id === 'emp-06')) {
      return false;
    }

    if (!participantSearch.trim()) return true;
    const q = participantSearch.toLowerCase();
    const nameMatch = (e.name || '').toLowerCase().includes(q);
    const roleMatch = (e.designation || e.roleName || '').toLowerCase().includes(q);
    const deptMatch = (e.department || '').toLowerCase().includes(q);
    return nameMatch || roleMatch || deptMatch;
  });

  // Approved vs Pending Groups
  const approvedGroups = groups.filter((g) => g.status === 'approved' || (!g.status && g.status !== 'pending_approval'));
  const pendingGroups = groups.filter((g) => g.status === 'pending_approval');

  const displayedGroups = activeGroupTab === 'approved' ? approvedGroups : pendingGroups;
  const filteredGroups = displayedGroups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.subject.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
  });

  const selectedMembersList = (employees || []).filter((e: any) =>
    selectedMemberIds.includes(e.id || e.empCode)
  );

  // ==========================================
  // VIEW 1: MAIN WHATSAPP GROUP LIST
  // ==========================================
  if (currentView === 'list') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* WhatsApp-Style Dark Teal Header */}
        <View style={[styles.waHeader, { backgroundColor: '#075E54' }]}>
          <View style={styles.waHeaderTop}>
            <View style={styles.waHeaderTitleRow}>
              {onBack && (
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                  <Icon name="arrow-left" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.waHeaderTitle}>Team Chat</Text>
                <View style={styles.wsStatusIndicatorRow}>
                  <View style={[styles.wsDot, { backgroundColor: isConnectedWs ? '#25D366' : '#f59e0b' }]} />
                  <Text style={styles.wsStatusText}>{isConnectedWs ? 'Live' : 'Connecting...'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.waHeaderActions}>
              <TouchableOpacity
                style={styles.waHeaderActionBtn}
                onPress={handleStartCreateGroup}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={19} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.waSearchContainer}>
            <View style={styles.waSearchInputBox}>
              <Icon name="search" size={16} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.waSearchInput}
                placeholder="Search team groups..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="cross" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Status Navigation Tabs (Active Groups vs Pending Approval) */}
        <View style={[styles.tabBarRow, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeGroupTab === 'approved' && styles.tabBtnActive]}
            onPress={() => setActiveGroupTab('approved')}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabBtnText, { color: theme.textMuted }, activeGroupTab === 'approved' && { color: '#075E54', fontWeight: '700' }]}>
              Active Groups ({approvedGroups.length})
            </Text>
            {activeGroupTab === 'approved' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeGroupTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveGroupTab('pending')}
            activeOpacity={0.75}
          >
            <View style={styles.pendingTabLabelWrap}>
              <Text style={[styles.tabBtnText, { color: theme.textMuted }, activeGroupTab === 'pending' && { color: '#075E54', fontWeight: '700' }]}>
                Pending Approval
              </Text>
              {pendingGroups.length > 0 && (
                <View style={styles.pendingCountBadge}>
                  <Text style={styles.pendingCountBadgeText}>{pendingGroups.length}</Text>
                </View>
              )}
            </View>
            {activeGroupTab === 'pending' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Groups Scroll List */}
        <ScrollView
          style={styles.groupsScrollView}
          contentContainerStyle={[styles.groupsContent, { paddingBottom: currentBottomMargin + 70 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top WhatsApp "New group" Action Row */}
          <TouchableOpacity
            style={[styles.newGroupTopCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={handleStartCreateGroup}
            activeOpacity={0.75}
          >
            <View style={styles.newGroupIconWrap}>
              <Icon name="users" size={20} color="#ffffff" />
            </View>
            <View style={styles.newGroupTextWrap}>
              <Text style={[styles.newGroupTitle, { color: theme.textPrimary }]}>New group</Text>
              <Text style={[styles.newGroupSub, { color: theme.textMuted }]}>
                Create team group (requires Admin approval)
              </Text>
            </View>
            <View style={[styles.newGroupBadge, { backgroundColor: '#25D366' }]}>
              <Icon name="plus" size={13} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#075E54" />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading groups...</Text>
            </View>
          ) : filteredGroups.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryLight }]}>
                <Icon name="chat" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {activeGroupTab === 'approved' ? 'No active groups yet' : 'No pending group requests'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                {activeGroupTab === 'approved'
                  ? 'Tap "New group" to choose colleagues and submit a group creation request for Admin approval.'
                  : 'Any groups awaiting Administrator approval will appear here with live review status.'}
              </Text>
              {activeGroupTab === 'approved' && (
                <TouchableOpacity
                  style={[styles.createFirstBtn, { backgroundColor: '#25D366' }]}
                  onPress={handleStartCreateGroup}
                  activeOpacity={0.8}
                >
                  <Icon name="plus" size={16} color="#ffffff" />
                  <Text style={styles.createFirstBtnText}>Create Group</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredGroups.map((group) => {
              const isPending = group.status === 'pending_approval';

              return (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupItemCard,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                    isPending && styles.groupItemCardPending,
                  ]}
                  onPress={() => handleOpenGroup(group)}
                  activeOpacity={0.75}
                >
                  {/* Group Avatar */}
                  <View style={[styles.groupAvatarCircle, { backgroundColor: group.iconBgColor || '#075E54' }]}>
                    <Text style={styles.groupAvatarEmoji}>{group.iconEmoji || '💬'}</Text>
                  </View>

                  {/* Group Info */}
                  <View style={styles.groupItemBody}>
                    <View style={styles.groupItemHeader}>
                      <Text style={[styles.groupSubject, { color: theme.textPrimary }]} numberOfLines={1}>
                        {group.subject}
                      </Text>
                      <Text style={[styles.groupTime, { color: theme.textMuted }]}>
                        {group.lastMessageTime || (group.createdAt ? new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                      </Text>
                    </View>

                    <View style={styles.groupItemFooter}>
                      <Text style={[styles.groupLastMsg, { color: theme.textMuted }]} numberOfLines={1}>
                        {isPending ? (
                          <Text style={styles.pendingText}>⏳ Waiting for Admin Approval</Text>
                        ) : (
                          <>
                            <Text style={styles.groupLastSender}>{group.lastMessageSender}: </Text>
                            {group.lastMessageText || 'No messages yet'}
                          </>
                        )}
                      </Text>
                      {group.unreadCount > 0 && !isPending && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{group.unreadCount}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.groupMetaRow}>
                      <Text style={[styles.groupMembersCount, { color: theme.primary }]}>
                        👥 {group.members?.length || 0} members
                      </Text>
                      {isPending && (
                        <View style={styles.pendingBadgePill}>
                          <Text style={styles.pendingBadgePillText}>Pending Admin Approval</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* WhatsApp Floating Action Button (FAB) */}
        <TouchableOpacity
          style={[styles.whatsappFab, { bottom: currentBottomMargin + 10 }]}
          onPress={handleStartCreateGroup}
          activeOpacity={0.85}
        >
          <Icon name="users" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // VIEW 2: WHATSAPP "NEW GROUP" - STEP 1 (ADD PARTICIPANTS)
  // SOURCED ONLY FROM REAL EMPLOYEES
  // ==========================================
  if (currentView === 'create_step1') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* WhatsApp Step 1 Header */}
        <View style={[styles.waHeader, { backgroundColor: '#075E54' }]}>
          <View style={styles.waHeaderTop}>
            <TouchableOpacity
              onPress={() => setCurrentView('list')}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.stepHeaderTitles}>
              <Text style={styles.waHeaderTitle}>New group</Text>
              <Text style={styles.stepHeaderSubtitle}>
                {selectedMemberIds.length > 0
                  ? `${selectedMemberIds.length} of ${availableEmployees.length} selected`
                  : 'Add participants'}
              </Text>
            </View>
          </View>

          {/* Participant Search Bar */}
          <View style={styles.waSearchContainer}>
            <View style={styles.waSearchInputBox}>
              <Icon name="search" size={16} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.waSearchInput}
                placeholder="Search colleagues by name, role, dept..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={participantSearch}
                onChangeText={setParticipantSearch}
              />
              {participantSearch ? (
                <TouchableOpacity onPress={() => setParticipantSearch('')}>
                  <Icon name="cross" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Selected Participants Horizontal Chips Tray */}
        {selectedMemberIds.length > 0 && (
          <View style={[styles.selectedChipsTray, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedChipsContent}>
              {selectedMembersList.map((emp: any) => (
                <View key={emp.id || emp.empCode} style={styles.selectedChip}>
                  <View style={styles.chipAvatarWrap}>
                    {emp.photoDataUrl ? (
                      <Image source={{ uri: emp.photoDataUrl }} style={styles.chipAvatarImg} />
                    ) : (
                      <View style={[styles.chipAvatarFallback, { backgroundColor: getParticipantColor(emp.name) }]}>
                        <Text style={styles.chipAvatarInitial}>{emp.name?.charAt(0) || 'U'}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.chipRemoveBtn}
                      onPress={() => handleToggleMember(emp.id || emp.empCode)}
                      activeOpacity={0.7}
                    >
                      <Icon name="cross" size={10} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.chipName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {emp.name?.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Real Colleagues Selection List */}
        <ScrollView
          style={styles.colleaguesScrollView}
          contentContainerStyle={[styles.colleaguesContent, { paddingBottom: currentBottomMargin + 80 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.contactsHeading, { color: theme.textMuted }]}>
            COMPANY COLLEAGUES ({availableEmployees.length})
          </Text>

          {availableEmployees.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                No colleagues matching "{participantSearch}"
              </Text>
            </View>
          ) : (
            availableEmployees.map((emp: any) => {
              const empId = emp.id || emp.empCode;
              const isSelected = selectedMemberIds.includes(empId);

              return (
                <TouchableOpacity
                  key={empId}
                  style={[
                    styles.contactRow,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                    isSelected && { backgroundColor: `${theme.primary}10` },
                  ]}
                  onPress={() => handleToggleMember(empId)}
                  activeOpacity={0.75}
                >
                  {/* Avatar */}
                  <View style={styles.contactAvatarWrap}>
                    {emp.photoDataUrl ? (
                      <Image source={{ uri: emp.photoDataUrl }} style={styles.contactAvatarImg} />
                    ) : (
                      <View style={[styles.contactAvatarFallback, { backgroundColor: getParticipantColor(emp.name) }]}>
                        <Text style={styles.contactAvatarInitial}>{emp.name?.charAt(0) || 'U'}</Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: theme.textPrimary }]}>{emp.name}</Text>
                    <Text style={[styles.contactRole, { color: theme.textMuted }]} numberOfLines={1}>
                      {emp.designation || emp.roleName || 'Employee'} • {emp.department || 'Operations'}
                    </Text>
                  </View>

                  {/* WhatsApp Green Checkbox */}
                  <View
                    style={[
                      styles.waCheckbox,
                      isSelected ? styles.waCheckboxChecked : [styles.waCheckboxUnchecked, { borderColor: theme.cardBorder }],
                    ]}
                  >
                    {isSelected && <Icon name="check" size={14} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* WhatsApp Floating Next Arrow Button */}
        {selectedMemberIds.length > 0 && (
          <TouchableOpacity
            style={[styles.whatsappFab, { bottom: currentBottomMargin + 10 }]}
            onPress={handleProceedToStep2}
            activeOpacity={0.85}
          >
            <Icon name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ==========================================
  // VIEW 3: WHATSAPP "NEW GROUP" - STEP 2 (SUBJECT & ICON)
  // ==========================================
  if (currentView === 'create_step2') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* WhatsApp Step 2 Header */}
        <View style={[styles.waHeader, { backgroundColor: '#075E54' }]}>
          <View style={styles.waHeaderTop}>
            <TouchableOpacity
              onPress={() => setCurrentView('create_step1')}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.stepHeaderTitles}>
              <Text style={styles.waHeaderTitle}>New group</Text>
              <Text style={styles.stepHeaderSubtitle}>Provide subject for Admin approval</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.step2ScrollView}
          contentContainerStyle={[styles.step2Content, { paddingBottom: currentBottomMargin + 90 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Approval Notice Banner */}
          <View style={styles.approvalNoticeCard}>
            <Text style={styles.approvalNoticeIcon}>🛡️</Text>
            <View style={styles.approvalNoticeTextWrap}>
              <Text style={styles.approvalNoticeTitle}>Admin Approval Required</Text>
              <Text style={styles.approvalNoticeSub}>
                To maintain workplace communication standards, new groups must be approved by the Administrator before activation.
              </Text>
            </View>
          </View>

          {/* Group Icon & Subject Input Card */}
          <View style={[styles.subjectCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.subjectRow}>
              {/* Group Avatar Chooser */}
              <TouchableOpacity
                style={[styles.subjectAvatarChooser, { backgroundColor: selectedColor }]}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                activeOpacity={0.8}
              >
                <Text style={styles.subjectAvatarEmoji}>{selectedEmoji}</Text>
                <View style={styles.cameraOverlayBadge}>
                  <Icon name="camera" size={12} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {/* Group Subject Input */}
              <View style={styles.subjectInputWrap}>
                <TextInput
                  style={[styles.subjectInput, { color: theme.textPrimary, borderBottomColor: '#25D366' }]}
                  placeholder="Type group subject here..."
                  placeholderTextColor={theme.textMuted}
                  value={groupSubject}
                  onChangeText={setGroupSubject}
                  maxLength={60}
                  autoFocus
                />
                <Text style={[styles.charCountText, { color: theme.textMuted }]}>
                  {groupSubject.length}/60
                </Text>
              </View>
            </View>

            {/* Emoji & Color Customizer Tray */}
            {showEmojiPicker && (
              <View style={styles.customizerTray}>
                <Text style={[styles.customizerLabel, { color: theme.textMuted }]}>Choose Group Emoji:</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiPickBtn,
                        selectedEmoji === emoji && { borderColor: '#25D366', backgroundColor: '#25D36620' },
                      ]}
                      onPress={() => setSelectedEmoji(emoji)}
                    >
                      <Text style={styles.emojiPickText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.customizerLabel, { color: theme.textMuted, marginTop: 12 }]}>
                  Choose Theme Color:
                </Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorPickBtn,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorPickBtnSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                    >
                      {selectedColor === c && <Icon name="check" size={12} color="#ffffff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Optional Group Description */}
            <View style={styles.descInputWrap}>
              <TextInput
                style={[styles.descInput, { color: theme.textPrimary, borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
                placeholder="Group purpose / description for admin review..."
                placeholderTextColor={theme.textMuted}
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
                numberOfLines={2}
                maxLength={200}
              />
            </View>
          </View>

          {/* Selected Participants Preview */}
          <View style={styles.participantsPreviewHeader}>
            <Text style={[styles.previewHeading, { color: theme.textMuted }]}>
              PARTICIPANTS ({selectedMemberIds.length + 1})
            </Text>
          </View>

          <View style={[styles.previewListCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Self (Creator) */}
            <View style={styles.previewMemberRow}>
              <View style={[styles.previewMemberAvatar, { backgroundColor: '#075E54' }]}>
                <Text style={styles.previewMemberInitial}>You</Text>
              </View>
              <View style={styles.previewMemberInfo}>
                <Text style={[styles.previewMemberName, { color: theme.textPrimary }]}>{currentUserName} (You)</Text>
                <Text style={[styles.previewMemberRole, { color: theme.textMuted }]}>Creator & Admin</Text>
              </View>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Creator</Text>
              </View>
            </View>

            {/* Selected Real Colleagues */}
            {selectedMembersList.map((emp: any) => (
              <View key={emp.id || emp.empCode} style={styles.previewMemberRow}>
                {emp.photoDataUrl ? (
                  <Image source={{ uri: emp.photoDataUrl }} style={styles.previewMemberAvatar} />
                ) : (
                  <View style={[styles.previewMemberAvatar, { backgroundColor: getParticipantColor(emp.name) }]}>
                    <Text style={styles.previewMemberInitial}>{emp.name?.charAt(0) || 'U'}</Text>
                  </View>
                )}
                <View style={styles.previewMemberInfo}>
                  <Text style={[styles.previewMemberName, { color: theme.textPrimary }]}>{emp.name}</Text>
                  <Text style={[styles.previewMemberRole, { color: theme.textMuted }]} numberOfLines={1}>
                    {emp.designation || emp.roleName || 'Member'} • {emp.department || 'Team'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* WhatsApp Floating Create Checkmark Button */}
        <TouchableOpacity
          style={[styles.whatsappFab, { bottom: currentBottomMargin + 10 }]}
          onPress={handleFinalizeCreateGroup}
          disabled={isSubmittingGroup}
          activeOpacity={0.85}
        >
          {isSubmittingGroup ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Icon name="check" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // VIEW 4: WHATSAPP GROUP CONVERSATION (REAL-TIME WEBSOCKET)
  // ==========================================
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: '#EFEAE2' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* WhatsApp Chat Top Bar */}
      <View style={[styles.chatHeaderBar, { backgroundColor: '#075E54' }]}>
        <TouchableOpacity
          style={styles.chatBackBtn}
          onPress={() => setCurrentView('list')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatHeaderProfile}
          onPress={() => setShowGroupInfo(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.chatHeaderAvatar, { backgroundColor: activeGroup?.iconBgColor || '#128C7E' }]}>
            <Text style={styles.chatHeaderEmoji}>{activeGroup?.iconEmoji || '💬'}</Text>
          </View>

          <View style={styles.chatHeaderTitleWrap}>
            <Text style={styles.chatHeaderSubject} numberOfLines={1}>
              {activeGroup?.subject || 'Team Group'}
            </Text>
            <Text style={styles.chatHeaderMembersSub} numberOfLines={1}>
              {activeGroup?.members?.map((m) => (m.id === currentUserId ? 'You' : m.name?.split(' ')[0])).join(', ') ||
                'Tap for group info'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatInfoBtn}
          onPress={() => setShowGroupInfo(true)}
          activeOpacity={0.7}
        >
          <Icon name="more-vertical" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Messages Scroll Area with WhatsApp style background */}
      <ScrollView
        ref={chatScrollRef}
        style={styles.chatScrollView}
        contentContainerStyle={styles.chatScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {groupMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <View key={msg.id} style={styles.systemMsgWrap}>
                <View style={styles.systemMsgBubble}>
                  <Text style={styles.systemMsgText}>{msg.text}</Text>
                </View>
              </View>
            );
          }

          const isMe = msg.senderId === currentUserId;

          return (
            <View
              key={msg.id}
              style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
            >
              <View
                style={[
                  styles.waBubble,
                  isMe ? styles.waBubbleMe : styles.waBubbleOther,
                ]}
              >
                {!isMe && (
                  <Text style={[styles.waSenderName, { color: getParticipantColor(msg.senderName) }]}>
                    {msg.senderName}
                  </Text>
                )}

                <Text style={styles.waMsgText}>{msg.text}</Text>

                <View style={styles.waTimeRow}>
                  <Text style={styles.waTimeText}>{msg.time}</Text>
                  {isMe && (
                    <View style={styles.checkAllWrap}>
                      <Icon name="check-all" size={13} color="#34B7F1" />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* WhatsApp Styled Input Bar */}
      <View style={[styles.waInputContainer, { marginBottom: currentBottomMargin }]}>
        <View style={styles.waInputCapsule}>
          <TouchableOpacity style={styles.waInputIconBtn} activeOpacity={0.7}>
            <Text style={styles.emojiFaceIcon}>😊</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.waTextInput}
            placeholder="Message..."
            placeholderTextColor="#888888"
            value={messageInput}
            onChangeText={setMessageInput}
            multiline
            maxLength={1000}
            onFocus={() => {
              setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
          />

          <TouchableOpacity style={styles.waInputIconBtn} activeOpacity={0.7}>
            <Icon name="document" size={17} color="#888888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.waInputIconBtn} activeOpacity={0.7}>
            <Icon name="camera" size={18} color="#888888" />
          </TouchableOpacity>
        </View>

        {/* Circular WhatsApp Send Button */}
        <TouchableOpacity
          style={[styles.waSendBtn, { backgroundColor: '#075E54' }]}
          onPress={handleSendMessage}
          disabled={!messageInput.trim()}
          activeOpacity={0.8}
        >
          <Icon name="send" size={17} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Group Info Modal */}
      <Modal visible={showGroupInfo} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Group Info</Text>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalAvatarCenter}>
                <View style={[styles.modalBigAvatar, { backgroundColor: activeGroup?.iconBgColor || '#075E54' }]}>
                  <Text style={styles.modalBigEmoji}>{activeGroup?.iconEmoji || '💬'}</Text>
                </View>
                <Text style={[styles.modalGroupSubject, { color: theme.textPrimary }]}>
                  {activeGroup?.subject}
                </Text>
                <Text style={[styles.modalGroupMeta, { color: theme.textMuted }]}>
                  Group • {activeGroup?.members?.length} participants
                </Text>
              </View>

              {activeGroup?.description ? (
                <View style={[styles.modalDescBox, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.modalDescLabel, { color: theme.textMuted }]}>Description:</Text>
                  <Text style={[styles.modalDescText, { color: theme.textPrimary }]}>
                    {activeGroup.description}
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.modalSectionHeading, { color: theme.textMuted }]}>
                PARTICIPANTS ({activeGroup?.members?.length || 0})
              </Text>

              {activeGroup?.members?.map((m) => (
                <View key={m.id} style={styles.modalMemberRow}>
                  <View style={[styles.modalMemberAvatar, { backgroundColor: getParticipantColor(m.name) }]}>
                    <Text style={styles.modalMemberInitial}>{m.name?.charAt(0) || 'U'}</Text>
                  </View>
                  <View style={styles.modalMemberInfo}>
                    <Text style={[styles.modalMemberName, { color: theme.textPrimary }]}>
                      {m.name} {m.id === currentUserId ? '(You)' : ''}
                    </Text>
                    <Text style={[styles.modalMemberRole, { color: theme.textMuted }]}>
                      {m.role || 'Member'} {m.department ? `• ${m.department}` : ''}
                    </Text>
                  </View>
                  {m.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowGroupInfo(false)}
              >
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // WhatsApp Header
  waHeader: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...SHADOWS.md,
  },
  waHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  waHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  wsStatusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  wsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wsStatusText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  waHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  waHeaderActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderTitles: {
    marginLeft: 8,
  },
  stepHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },

  // WhatsApp Search Bar
  waSearchContainer: {
    marginTop: 4,
  },
  waSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 38,
    gap: 8,
  },
  waSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    paddingVertical: 0,
  },

  // Tab Bar (Active vs Pending)
  tabBarRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(7, 94, 84, 0.04)',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#075E54',
    borderRadius: 1.5,
  },
  pendingTabLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingCountBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pendingCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Groups Scroll View
  groupsScrollView: {
    flex: 1,
  },
  groupsContent: {
    padding: 14,
    gap: 10,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },

  // Top New Group Banner
  newGroupTopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    ...SHADOWS.sm,
  },
  newGroupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupTextWrap: {
    flex: 1,
  },
  newGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  newGroupSub: {
    fontSize: 12,
    marginTop: 2,
  },
  newGroupBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Group Item Card
  groupItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    ...SHADOWS.sm,
  },
  groupItemCardPending: {
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
  },
  groupAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarEmoji: {
    fontSize: 24,
  },
  groupItemBody: {
    flex: 1,
  },
  groupItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupSubject: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  groupTime: {
    fontSize: 11,
  },
  groupItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  groupLastMsg: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  groupLastSender: {
    fontWeight: '600',
  },
  pendingText: {
    color: '#d97706',
    fontWeight: '600',
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  groupMembersCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadgePill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingBadgePillText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginTop: 8,
  },
  createFirstBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Floating Action Button (FAB)
  whatsappFab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  // Step 1: Selected Participant Chips Tray
  selectedChipsTray: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectedChipsContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  selectedChip: {
    alignItems: 'center',
    width: 54,
  },
  chipAvatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  chipAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chipAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  chipRemoveBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  chipName: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // Contacts List
  colleaguesScrollView: {
    flex: 1,
  },
  colleaguesContent: {
    padding: 14,
    gap: 8,
  },
  contactsHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  contactAvatarWrap: {
    width: 44,
    height: 44,
  },
  contactAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  contactAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactRole: {
    fontSize: 12,
    marginTop: 2,
  },
  waCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waCheckboxChecked: {
    backgroundColor: '#25D366',
  },
  waCheckboxUnchecked: {
    borderWidth: 2,
  },

  // Step 2 Styles
  step2ScrollView: {
    flex: 1,
  },
  step2Content: {
    padding: 14,
    gap: 14,
  },
  approvalNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  approvalNoticeIcon: {
    fontSize: 22,
  },
  approvalNoticeTextWrap: {
    flex: 1,
  },
  approvalNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  approvalNoticeSub: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  subjectCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  subjectAvatarChooser: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  subjectAvatarEmoji: {
    fontSize: 28,
  },
  cameraOverlayBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  subjectInputWrap: {
    flex: 1,
  },
  subjectInput: {
    fontSize: 15,
    fontWeight: '600',
    borderBottomWidth: 2,
    paddingVertical: 6,
  },
  charCountText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  customizerTray: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  customizerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiPickBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPickText: {
    fontSize: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorPickBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickBtnSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  descInputWrap: {
    marginTop: 14,
  },
  descInput: {
    fontSize: 13,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    textAlignVertical: 'top',
  },

  // Preview List
  participantsPreviewHeader: {
    paddingHorizontal: 4,
    marginTop: 4,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewListCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    ...SHADOWS.sm,
  },
  previewMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  previewMemberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMemberInitial: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  previewMemberInfo: {
    flex: 1,
  },
  previewMemberName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  previewMemberRole: {
    fontSize: 11.5,
    marginTop: 1,
  },
  adminBadge: {
    backgroundColor: '#25D36620',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: '#075E54',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // VIEW 4: Group Chat Screen Styles
  chatHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    gap: 10,
    ...SHADOWS.md,
  },
  chatBackBtn: {
    padding: 6,
  },
  chatHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  chatHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderEmoji: {
    fontSize: 20,
  },
  chatHeaderTitleWrap: {
    flex: 1,
  },
  chatHeaderSubject: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  chatHeaderMembersSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 1,
  },
  chatInfoBtn: {
    padding: 6,
  },

  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 14,
    paddingBottom: 24,
    gap: 10,
  },

  // WhatsApp Message Bubbles
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  systemMsgBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    maxWidth: '85%',
  },
  systemMsgText: {
    color: '#333333',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  waBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    ...SHADOWS.sm,
  },
  waBubbleMe: {
    backgroundColor: '#E7FFDB',
    borderTopRightRadius: 2,
  },
  waBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  waSenderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  waMsgText: {
    color: '#111827',
    fontSize: 13.5,
    lineHeight: 19,
  },
  waTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  },
  waTimeText: {
    fontSize: 10,
    color: '#6b7280',
  },
  checkAllWrap: {
    marginLeft: 2,
  },

  // WhatsApp Input Bar
  waInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  waInputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 46,
    gap: 6,
    ...SHADOWS.sm,
  },
  waInputIconBtn: {
    padding: 6,
  },
  emojiFaceIcon: {
    fontSize: 18,
  },
  waTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 0,
  },
  waSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: 18,
  },
  modalAvatarCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBigAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalBigEmoji: {
    fontSize: 36,
  },
  modalGroupSubject: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalGroupMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  modalDescBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalDescLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalDescText: {
    fontSize: 13,
  },
  modalSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  modalMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMemberInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalMemberInfo: {
    flex: 1,
  },
  modalMemberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalMemberRole: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeModalBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
