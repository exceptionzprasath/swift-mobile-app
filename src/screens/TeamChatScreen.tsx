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
  Dimensions,
  useWindowDimensions,
  LayoutChangeEvent,
  LayoutAnimation,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import {
  fetchTeamGroups,
  fetchGroupMessages,
  requestCreateGroup,
  updateTeamGroup,
  deleteTeamGroup,
  clearGroupMessages,
  askSwiftAIPrivately,
  uploadFile,
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
  avatarUrl?: string;
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
  isMuted?: boolean;
  mutedUntil?: string;
  disappearingDuration?: 'off' | '24h' | '7d' | '90d';
  chatTheme?: string;
}

const STORAGE_GROUPS_KEY = '@swift_team_groups_cache_v2';
const STORAGE_MSGS_PREFIX = '@swift_team_group_msgs_cache_';

export const PRESET_FAVICONS = [
  { id: 'fav-tech', name: 'Tech & Dev', icon: '💻', color: '#0284c7' },
  { id: 'fav-rocket', name: 'Launch & Growth', icon: '🚀', color: '#10b981' },
  { id: 'fav-briefcase', name: 'Executive', icon: '💼', color: '#075E54' },
  { id: 'fav-lightning', name: 'Ops & Sprint', icon: '⚡', color: '#f59e0b' },
  { id: 'fav-palette', name: 'Design & UI', icon: '🎨', color: '#ec4899' },
  { id: 'fav-shield', name: 'Security & QA', icon: '🛡️', color: '#6366f1' },
  { id: 'fav-chart', name: 'Finance & Sales', icon: '📊', color: '#059669' },
  { id: 'fav-megaphone', name: 'Announcements', icon: '📢', color: '#ef4444' },
  { id: 'fav-coffee', name: 'Watercooler', icon: '☕', color: '#8b5cf6' },
  { id: 'fav-target', name: 'Goals & Strategy', icon: '🎯', color: '#f43f5e' },
  { id: 'fav-handshake', name: 'HR & People', icon: '🤝', color: '#128C7E' },
  { id: 'fav-star', name: 'Leadership', icon: '⭐', color: '#eab308' },
];

const EMOJI_OPTIONS = ['🚀', '💼', '⚡', '🎨', '📢', '☕', '🌟', '🎯', '💡', '🛡️', '📊', '🤝', '🔥', '🏆', '💎', '🎉'];
const COLOR_OPTIONS = ['#075E54', '#128C7E', '#25D366', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#6366f1'];

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
  const insets = useSafeAreaInsets();
  const { currentUser, employees, companyConfig } = useAppContext();
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

  // Group Creation Step 2 State (Subject & Icon & Favicon)
  const [groupSubject, setGroupSubject] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [selectedColor, setSelectedColor] = useState('#128C7E');
  const [createdAvatarUrl, setCreatedAvatarUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<'favicon' | 'photo' | 'emoji'>('favicon');

  // Profile Picture Modal State (Change Profile Picture for groups)
  const [targetGroupForAvatar, setTargetGroupForAvatar] = useState<TeamGroup | null>(null);
  const [showChangeAvatarModal, setShowChangeAvatarModal] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [previewAvatarGroup, setPreviewAvatarGroup] = useState<TeamGroup | null>(null);

  // Group Conversation State
  const [messageInput, setMessageInput] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // WhatsApp 3-Dots Menu & Feature State
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [newSelectedMemberIds, setNewSelectedMemberIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [showGroupMediaModal, setShowGroupMediaModal] = useState(false);
  const [mediaTab, setMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showMoreSubmenu, setShowMoreSubmenu] = useState(false);
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const chatScrollRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeGroupIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Keep ref up to date for WS callbacks
  useEffect(() => {
    activeGroupIdRef.current = activeGroup?.id || null;
  }, [activeGroup]);

  const [containerHeight, setContainerHeight] = useState(0);
  const maxContainerHeightRef = useRef<number>(0);
  const isWindowShrunkRef = useRef(false);
  const [needsManualAvoidance, setNeedsManualAvoidance] = useState(false);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent?.layout?.height || 0;
    if (h > 0) {
      if (h > maxContainerHeightRef.current) {
        maxContainerHeightRef.current = h;
      }
      setContainerHeight(h);
      // If the container height shrank by more than 80px, Android OS has natively resized the window!
      if (maxContainerHeightRef.current > 0 && maxContainerHeightRef.current - h > 80) {
        isWindowShrunkRef.current = true;
      }
    }
  }, []);

  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    bottomInset = insets?.bottom || 0;
  } catch (e) {}

  const safeBottomMargin = Math.max(bottomInset, 8) + 6;
  const floatingBtnBottomMargin = Math.max(bottomInset, 16) + 14;

  // On standard Android (like WhatsApp), windowSoftInputMode="adjustResize" resizes the window natively.
  // We keep a constant 6px padding so the input bar stays perfectly glued above the keyboard without ANY jumping.
  // Only if Android OS fails to resize the window (e.g. edge-to-edge / PiP active), manual avoidance applies smoothly.
  const androidKeyboardMargin = needsManualAvoidance
    ? (keyboardHeight > 0 ? keyboardHeight + 6 : 6)
    : 6;

  const currentBottomMargin = isKeyboardVisible
    ? (Platform.OS === 'ios' ? 6 : androidKeyboardMargin)
    : (currentView === 'chat' ? safeBottomMargin : floatingBtnBottomMargin);

  // Keyboard listeners
  useEffect(() => {
    let checkTimeout: any;

    const handleShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      if (h > 0) {
        setKeyboardHeight(h);
      }
      setIsKeyboardVisible(true);

      // Keep bottom message locked with 0 animation delay/rubberbanding
      if (isNearBottomRef.current) {
        chatScrollRef.current?.scrollToEnd({ animated: false });
      }

      // On Android, check after layout settles (150ms) if the OS failed to resize the window
      if (Platform.OS === 'android') {
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(() => {
          if (!isWindowShrunkRef.current && h > 0) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setNeedsManualAvoidance(true);
          }
        }, 150);
      }
    };

    const handleHide = () => {
      clearTimeout(checkTimeout);
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      isWindowShrunkRef.current = false;
      setNeedsManualAvoidance(false);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleHide
    );

    let willShowSub: any;
    let willHideSub: any;
    if (Platform.OS === 'android') {
      try {
        willShowSub = Keyboard.addListener('keyboardWillShow', handleShow);
        willHideSub = Keyboard.addListener('keyboardWillHide', handleHide);
      } catch (err) {}
    }

    return () => {
      clearTimeout(checkTimeout);
      showSub.remove();
      hideSub.remove();
      if (willShowSub) willShowSub.remove();
      if (willHideSub) willHideSub.remove();
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
          } else if (data.type === 'group_updated') {
            const { groupId, group } = data;
            console.log(`[TeamChat WS] Group ${groupId} updated:`, group);
            if (group) {
              setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...group } : g)));
              setActiveGroup((prev) => (prev && prev.id === groupId ? { ...prev, ...group } : prev));
            }
          } else if (data.type === 'group_deleted') {
            const { groupId } = data;
            console.log(`[TeamChat WS] Group ${groupId} deleted`);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
            if (activeGroupIdRef.current === groupId) {
              setActiveGroup(null);
              setCurrentView('list');
              setShowGroupInfo(false);
              Alert.alert('Group Deleted', 'This team group has been deleted.');
            }
          } else if (data.type === 'chat_cleared') {
            const { groupId } = data;
            console.log(`[TeamChat WS] Chat cleared for group ${groupId}`);
            if (activeGroupIdRef.current === groupId) {
              setGroupMessages([]);
            }
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, lastMessageText: 'Chat cleared' } : g))
            );
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
    setCreatedAvatarUrl(null);
    setCustomizerTab('favicon');
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

  // Pick Photo for Group (Camera or Gallery)
  const handlePickGroupPhoto = async (source: 'camera' | 'gallery', isCreating = false) => {
    try {
      const options = {
        mediaType: 'photo' as const,
        includeBase64: true,
        quality: 0.8 as const,
        maxWidth: 600,
        maxHeight: 600,
      };

      const res = source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);

      if (res.didCancel || !res.assets || res.assets.length === 0) return;

      const asset = res.assets[0];
      if (!asset.base64 && !asset.uri) return;

      const dataUrl = asset.base64
        ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri || '';

      if (isCreating) {
        setCreatedAvatarUrl(dataUrl);
        setShowEmojiPicker(false);
      } else {
        const grp = targetGroupForAvatar || activeGroup;
        if (!grp) return;
        await handleSaveGroupAvatar(grp, dataUrl);
      }
    } catch (err: any) {
      Alert.alert('Image Pick Error', err?.message || 'Failed to select image.');
    }
  };

  // Save Group Profile Picture / Favicon / Emoji
  const handleSaveGroupAvatar = async (
    grp: TeamGroup,
    avatarUrl: string | null,
    emoji?: string,
    color?: string
  ) => {
    setIsUpdatingAvatar(true);
    try {
      let finalAvatarUrl = avatarUrl;
      // Upload file to S3 if base64 dataUrl
      if (avatarUrl && avatarUrl.startsWith('data:')) {
        const uploadRes = await uploadFile(effectiveTenantId, `groups/${grp.id}/avatar_${Date.now()}.jpg`, avatarUrl);
        if (uploadRes && uploadRes.url) {
          finalAvatarUrl = uploadRes.url;
        }
      }

      const updatePayload: any = {
        tenantId: effectiveTenantId,
        groupId: grp.id,
        avatarUrl: finalAvatarUrl === null ? '' : finalAvatarUrl,
      };
      if (emoji) updatePayload.iconEmoji = emoji;
      if (color) updatePayload.iconBgColor = color;

      const res = await updateTeamGroup(updatePayload);

      const updated = (res && res.success && res.group) ? res.group : {
        ...grp,
        avatarUrl: finalAvatarUrl || undefined,
        iconEmoji: emoji || grp.iconEmoji,
        iconBgColor: color || grp.iconBgColor,
      };

      setGroups((prev) => prev.map((g) => (g.id === grp.id ? { ...g, ...updated } : g)));
      if (activeGroup?.id === grp.id) {
        setActiveGroup((prev) => (prev ? { ...prev, ...updated } : prev));
      }
      setShowChangeAvatarModal(false);
      setPreviewAvatarGroup(null);
      Alert.alert('Success ✨', 'Group profile picture updated successfully!');
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Could not update profile picture.');
    } finally {
      setIsUpdatingAvatar(false);
    }
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
        avatarUrl: createdAvatarUrl || undefined,
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

  // Delete Team Group
  const handleDeleteGroup = (groupToDelete: TeamGroup | null) => {
    if (!groupToDelete) return;

    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${groupToDelete.subject}"? All messages and conversation history will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingGroup(true);
              const res = await deleteTeamGroup({
                tenantId: effectiveTenantId,
                groupId: groupToDelete.id,
                userId: currentUserId,
              });

              if (res && res.success) {
                // Update local state
                setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
                setShowGroupInfo(false);
                setActiveGroup(null);
                setCurrentView('list');
                Alert.alert('Group Deleted', `"${groupToDelete.subject}" has been deleted.`);
              } else {
                Alert.alert('Error', res?.error || 'Failed to delete group. Please try again.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Network error while deleting group.');
            } finally {
              setIsDeletingGroup(false);
            }
          },
        },
      ]
    );
  };

  // WhatsApp Feature Handlers
  const handleAddMembers = async () => {
    if (!activeGroup || newSelectedMemberIds.length === 0) return;
    try {
      setIsAddingMembers(true);
      const newMembers = (employees || [])
        .filter((e: any) => newSelectedMemberIds.includes(e.id || e.empCode))
        .map((e: any) => ({
          id: e.id || e.empCode,
          name: e.name,
          role: e.designation || e.roleName || 'Member',
          department: e.department || '',
          isAdmin: false,
        }));

      const existingIds = new Set((activeGroup.members || []).map((m) => m.id));
      const filteredNew = newMembers.filter((m) => !existingIds.has(m.id));
      const updatedMembers = [...(activeGroup.members || []), ...filteredNew];

      const res = await updateTeamGroup({
        tenantId: effectiveTenantId,
        groupId: activeGroup.id,
        members: updatedMembers,
      });

      if (res && res.success) {
        setActiveGroup((prev) => (prev ? { ...prev, members: updatedMembers } : null));
        setGroups((prev) => prev.map((g) => (g.id === activeGroup.id ? { ...g, members: updatedMembers } : g)));
        const addedNames = filteredNew.map((m) => m.name).join(', ');
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(
            JSON.stringify({
              type: 'send_message',
              tenantId: effectiveTenantId,
              groupId: activeGroup.id,
              senderId: 'system',
              senderName: 'System',
              text: `${currentUserName} added ${addedNames} to the group`,
            })
          );
        }
        setShowAddMembersModal(false);
        setNewSelectedMemberIds([]);
        Alert.alert('Members Added', `${filteredNew.length} member(s) added to ${activeGroup.subject}.`);
      } else {
        Alert.alert('Error', res?.error || 'Failed to add members.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleAskAI = async (queryText?: string) => {
    const q = queryText || aiPrompt;
    if (!q.trim() || !activeGroup) return;
    try {
      setIsAiLoading(true);
      setAiResponse('');
      const recentContext = groupMessages
        .slice(-10)
        .map((m) => `${m.senderName}: ${m.text}`)
        .join('\n');

      const res = await askSwiftAIPrivately({
        prompt: q.trim(),
        context: recentContext,
        groupSubject: activeGroup.subject,
        senderName: currentUserName,
      });

      if (res && res.response) {
        setAiResponse(res.response);
      } else {
        setAiResponse("I couldn't process your request right now. Please try again.");
      }
    } catch (err: any) {
      setAiResponse(`Error: ${err?.message || 'Unable to connect to Swift AI'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSetMute = async (duration: '8h' | '1w' | 'always' | 'unmute') => {
    if (!activeGroup) return;
    const isMuted = duration !== 'unmute';
    let mutedUntil = '';
    const now = Date.now();
    if (duration === '8h') mutedUntil = new Date(now + 8 * 3600 * 1000).toISOString();
    else if (duration === '1w') mutedUntil = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    else if (duration === 'always') mutedUntil = 'always';

    await updateTeamGroup({
      tenantId: effectiveTenantId,
      groupId: activeGroup.id,
      isMuted,
      mutedUntil,
    });
    setActiveGroup((prev) => (prev ? { ...prev, isMuted, mutedUntil } : null));
    setGroups((prev) => prev.map((g) => (g.id === activeGroup.id ? { ...g, isMuted, mutedUntil } : g)));
    setShowMuteModal(false);
    Alert.alert(isMuted ? 'Notifications Muted' : 'Notifications Unmuted', isMuted ? `Group notifications muted.` : 'You will receive notifications for this group.');
  };

  const handleSetDisappearing = async (duration: 'off' | '24h' | '7d' | '90d') => {
    if (!activeGroup) return;
    await updateTeamGroup({
      tenantId: effectiveTenantId,
      groupId: activeGroup.id,
      disappearingDuration: duration,
    });
    setActiveGroup((prev) => (prev ? { ...prev, disappearingDuration: duration } : null));
    setGroups((prev) => prev.map((g) => (g.id === activeGroup.id ? { ...g, disappearingDuration: duration } : g)));
    setShowDisappearingModal(false);

    if (duration !== 'off') {
      const durationLabel = duration === '24h' ? '24 hours' : duration === '7d' ? '7 days' : '90 days';
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({
            type: 'send_message',
            tenantId: effectiveTenantId,
            groupId: activeGroup.id,
            senderId: 'system',
            senderName: 'System',
            text: `⏱️ ${currentUserName} set disappearing messages to ${durationLabel}`,
          })
        );
      }
    }
  };


  const handleClearChat = () => {
    if (!activeGroup) return;
    Alert.alert(
      'Clear chat?',
      'Are you sure you want to clear all messages in this group? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: async () => {
            await clearGroupMessages({
              tenantId: effectiveTenantId,
              groupId: activeGroup.id,
              userId: currentUserId,
            });
            setGroupMessages([]);
            setShowMoreSubmenu(false);
          },
        },
      ]
    );
  };

  const handleExitGroup = () => {
    if (!activeGroup) return;
    Alert.alert(
      'Exit group?',
      `Are you sure you want to exit "${activeGroup.subject}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            const updatedMembers = (activeGroup.members || []).filter((m) => m.id !== currentUserId && m.id !== currentUser?.empCode);
            await updateTeamGroup({
              tenantId: effectiveTenantId,
              groupId: activeGroup.id,
              members: updatedMembers,
            });
            setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
            setShowMoreSubmenu(false);
            setActiveGroup(null);
            setCurrentView('list');
            Alert.alert('Exited Group', `You left "${activeGroup.subject}".`);
          },
        },
      ]
    );
  };

  const handleExportChat = () => {
    if (!activeGroup) return;
    const exportText = groupMessages
      .map((m) => `[${m.time || ''}] ${m.senderName}: ${m.text}`)
      .join('\n');
    setShowMoreSubmenu(false);
    Alert.alert('Export Chat', `Exported ${groupMessages.length} messages for "${activeGroup.subject}".\n\nPreview:\n${exportText.slice(0, 300)}...`);
  };

  const handleReportGroup = () => {
    setShowMoreSubmenu(false);
    Alert.alert(
      'Report Group',
      'This group has been flagged for review. A report with recent chat activity has been forwarded to the HR Compliance Administrator.',
      [{ text: 'OK' }]
    );
  };

  const getChatBgColor = () => '#ffffff';

  // Full Screen Avatar Preview dialog with "Change Profile Picture" & "Open Chat"
  const renderAvatarPreviewModal = () => {
    if (!previewAvatarGroup) return null;
    return (
      <Modal
        visible={!!previewAvatarGroup}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewAvatarGroup(null)}
      >
        <View style={[styles.fullScreenRoot, { backgroundColor: '#111b21', paddingTop: Math.max(insets.top, 12) }]}>
          {/* Header with Group Subject */}
          <View style={[styles.fullScreenHeader, { backgroundColor: '#111b21', borderBottomWidth: 0 }]}>
            <TouchableOpacity onPress={() => setPreviewAvatarGroup(null)} style={styles.fullScreenBackBtn}>
              <Icon name="arrow-left" size={22} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.fullScreenHeaderTitleCol}>
              <Text style={styles.fullScreenHeaderTitle} numberOfLines={1}>
                {previewAvatarGroup.subject}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPreviewAvatarGroup(null)} style={styles.fullScreenCloseBtn}>
              <Icon name="cross" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Enlarged Avatar / Favicon / Picture (Full Screen Center) */}
          <View style={[styles.avatarPreviewFullScreenCenter, { backgroundColor: previewAvatarGroup.iconBgColor || '#075E54' }]}>
            {previewAvatarGroup.avatarUrl ? (
              <Image source={{ uri: previewAvatarGroup.avatarUrl }} style={styles.avatarPreviewFullScreenImage} resizeMode="contain" />
            ) : (
              <Text style={styles.avatarPreviewFullScreenEmoji}>{previewAvatarGroup.iconEmoji || '💬'}</Text>
            )}
          </View>

          {/* Action Bar with WhatsApp-style quick options */}
          <View style={[styles.avatarPreviewFullScreenFooter, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <TouchableOpacity
              style={styles.avatarPreviewFullScreenActionBtn}
              onPress={() => {
                const grp = previewAvatarGroup;
                setPreviewAvatarGroup(null);
                setTargetGroupForAvatar(grp);
                setShowChangeAvatarModal(true);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.previewActionIconWrap, { backgroundColor: '#25D36625' }]}>
                <Icon name="camera" size={20} color="#25D366" />
              </View>
              <Text style={[styles.previewActionLabel, { color: '#ffffff' }]}>Change Profile Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarPreviewFullScreenActionBtn}
              onPress={() => {
                const grp = previewAvatarGroup;
                setPreviewAvatarGroup(null);
                handleOpenGroup(grp);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.previewActionIconWrap, { backgroundColor: '#3b82f625' }]}>
                <Icon name="chat" size={20} color="#60a5fa" />
              </View>
              <Text style={[styles.previewActionLabel, { color: '#ffffff' }]}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Change Profile Picture & Favicon Selection Modal (Full Screen)
  const renderChangeProfilePicModal = () => (
    <Modal
      visible={showChangeAvatarModal}
      transparent={false}
      animationType="slide"
      onRequestClose={() => setShowChangeAvatarModal(false)}
    >
      <View style={[styles.fullScreenRoot, { backgroundColor: theme.bg }]}>
        {/* Full Screen Header */}
        <View style={[styles.fullScreenHeader, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={() => setShowChangeAvatarModal(false)}
            style={styles.fullScreenBackBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-left" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.fullScreenHeaderTitleCol}>
            <Text style={styles.fullScreenHeaderTitle}>
              Change Profile Picture
            </Text>
            <Text style={styles.fullScreenHeaderSub} numberOfLines={1}>
              {targetGroupForAvatar?.subject || 'Team Group'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                const grp = targetGroupForAvatar;
                setShowChangeAvatarModal(false);
                if (grp) handleOpenGroup(grp);
              }}
              style={styles.fullScreenChatPillBtn}
              activeOpacity={0.75}
            >
              <Icon name="chat" size={14} color="#ffffff" />
              <Text style={styles.fullScreenChatPillText}>Open Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowChangeAvatarModal(false)}
              style={styles.fullScreenCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon name="cross" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {isUpdatingAvatar ? (
          <View style={styles.fullScreenUpdatingBox}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={[styles.updatingAvatarText, { color: theme.textPrimary, marginTop: 14 }]}>
              Updating group profile picture...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.fullScreenBody}
            contentContainerStyle={[styles.fullScreenContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Avatar Center Preview */}
            <View style={styles.currentAvatarHeroWrap}>
              <View style={[styles.modalBigAvatar, { backgroundColor: targetGroupForAvatar?.iconBgColor || '#075E54' }]}>
                {targetGroupForAvatar?.avatarUrl ? (
                  <Image source={{ uri: targetGroupForAvatar.avatarUrl }} style={styles.modalBigAvatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.modalBigEmoji}>{targetGroupForAvatar?.iconEmoji || '💬'}</Text>
                )}
              </View>
              <Text style={[styles.heroGroupSubjectText, { color: theme.textPrimary }]}>
                {targetGroupForAvatar?.subject}
              </Text>
              <Text style={[styles.heroGroupSubtext, { color: theme.textMuted }]}>
                Choose a camera photo, gallery upload, or team favicon below
              </Text>
            </View>

            {/* Primary Upload Options */}
            <Text style={[styles.sectionHeadingTitle, { color: theme.textMuted }]}>
              UPLOAD OR CAPTURE PHOTO
            </Text>
            <View style={styles.changePicOptionsRow}>
              <TouchableOpacity
                style={[styles.picOptionTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => handlePickGroupPhoto('camera')}
                activeOpacity={0.75}
              >
                <View style={[styles.picOptionIconCircle, { backgroundColor: '#10b98120' }]}>
                  <Icon name="camera" size={22} color="#10b981" />
                </View>
                <Text style={[styles.picOptionTileText, { color: theme.textPrimary }]}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.picOptionTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => handlePickGroupPhoto('gallery')}
                activeOpacity={0.75}
              >
                <View style={[styles.picOptionIconCircle, { backgroundColor: '#3b82f620' }]}>
                  <Icon name="document" size={22} color="#3b82f6" />
                </View>
                <Text style={[styles.picOptionTileText, { color: theme.textPrimary }]}>Gallery</Text>
              </TouchableOpacity>

              {targetGroupForAvatar?.avatarUrl && (
                <TouchableOpacity
                  style={[styles.picOptionTile, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]}
                  onPress={() => {
                    if (targetGroupForAvatar) {
                      handleSaveGroupAvatar(targetGroupForAvatar, null);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.picOptionIconCircle, { backgroundColor: '#ef444420' }]}>
                    <Icon name="cross" size={22} color="#ef4444" />
                  </View>
                  <Text style={[styles.picOptionTileText, { color: '#ef4444' }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Preset Favicons Section */}
            <Text style={[styles.sectionHeadingTitle, { color: theme.textMuted }]}>
              OR SELECT A TEAM FAVICON
            </Text>

            {companyConfig?.faviconDataUrl && (
              <TouchableOpacity
                style={[styles.companyFaviconBtn, { backgroundColor: theme.card, borderColor: '#075E54' }]}
                onPress={() => {
                  if (targetGroupForAvatar) {
                    handleSaveGroupAvatar(targetGroupForAvatar, companyConfig.faviconDataUrl);
                  }
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: companyConfig.faviconDataUrl }} style={styles.companyFaviconImg} resizeMode="contain" />
                <View style={styles.companyFaviconTextCol}>
                  <Text style={[styles.companyFaviconName, { color: theme.textPrimary }]}>Company Favicon</Text>
                  <Text style={[styles.companyFaviconSub, { color: theme.textMuted }]}>Use official company brand icon</Text>
                </View>
                <Icon name="check" size={16} color="#075E54" />
              </TouchableOpacity>
            )}

            <View style={styles.faviconsGrid}>
              {PRESET_FAVICONS.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={[styles.faviconTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => {
                    if (targetGroupForAvatar) {
                      handleSaveGroupAvatar(targetGroupForAvatar, null, fav.icon, fav.color);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.faviconTileCircle, { backgroundColor: fav.color }]}>
                    <Text style={styles.faviconTileEmoji}>{fav.icon}</Text>
                  </View>
                  <Text style={[styles.faviconTileLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                    {fav.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Emojis & Colors */}
            <Text style={[styles.sectionHeadingTitle, { color: theme.textMuted, marginTop: 20 }]}>
              OR CHOOSE EMOJI & COLOR
            </Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiPickBtn,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                    targetGroupForAvatar?.iconEmoji === emoji && !targetGroupForAvatar?.avatarUrl && {
                      borderColor: '#25D366',
                      backgroundColor: '#25D36620',
                    },
                  ]}
                  onPress={() => {
                    if (targetGroupForAvatar) {
                      handleSaveGroupAvatar(targetGroupForAvatar, null, emoji, targetGroupForAvatar.iconBgColor);
                    }
                  }}
                >
                  <Text style={styles.emojiPickText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.colorGrid, { marginTop: 12, marginBottom: 20 }]}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorPickBtn,
                    { backgroundColor: c },
                    targetGroupForAvatar?.iconBgColor === c && styles.colorPickBtnSelected,
                  ]}
                  onPress={() => {
                    if (targetGroupForAvatar) {
                      handleSaveGroupAvatar(targetGroupForAvatar, targetGroupForAvatar.avatarUrl || null, targetGroupForAvatar.iconEmoji, c);
                    }
                  }}
                >
                  {targetGroupForAvatar?.iconBgColor === c && <Icon name="check" size={12} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  // ==========================================
  // WHATSAPP GROUP 3-DOTS DROPDOWN MENU & FEATURE MODALS
  // ==========================================

  const renderWhatsAppDropdownMenu = () => {
    if (!showDropdownMenu) return null;
    return (
      <Modal
        transparent
        visible={showDropdownMenu}
        animationType="fade"
        onRequestClose={() => setShowDropdownMenu(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowDropdownMenu(false)}
        >
          <View style={[styles.waDropdownMenu, { top: Platform.OS === 'ios' ? 62 : 48 }]}>
            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowAskAIModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Ask Swift AI privately</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setNewSelectedMemberIds([]);
                setAddMemberSearch('');
                setShowAddMembersModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Add members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowGroupInfo(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Group info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowGroupMediaModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Group media</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setIsSearchActive(true);
                setInChatSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowMuteModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Mute notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waDropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowDisappearingModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>Disappearing messages</Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[styles.waDropdownItem, styles.waDropdownItemMore]}
              onPress={() => {
                setShowDropdownMenu(false);
                setShowMoreSubmenu(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.waDropdownItemText}>More</Text>
              <Text style={styles.waDropdownArrow}>▶</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderAddMembersModal = () => {
    if (!activeGroup) return null;
    const existingMemberIds = new Set((activeGroup.members || []).map((m) => m.id));
    const eligibleEmployees = (employees || []).filter((e: any) => {
      const eid = e.id || e.empCode;
      if (existingMemberIds.has(eid)) return false;
      if (addMemberSearch.trim()) {
        const q = addMemberSearch.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q) ||
          e.designation?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <Modal
        visible={showAddMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetContainer, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: theme.textPrimary }]}>Add Members</Text>
                <Text style={[styles.modalSheetSubtitle, { color: theme.textMuted }]}>
                  {newSelectedMemberIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddMembersModal(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Colleagues */}
            <View style={[styles.modalSearchBar, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Icon name="search" size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: theme.textPrimary }]}
                placeholder="Search colleagues to add..."
                placeholderTextColor={theme.textMuted}
                value={addMemberSearch}
                onChangeText={setAddMemberSearch}
              />
            </View>

            <ScrollView style={{ flex: 1, maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {eligibleEmployees.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 14 }}>
                    {existingMemberIds.size === (employees?.length || 0)
                      ? 'All colleagues are already in this group.'
                      : 'No colleagues found matching search.'}
                  </Text>
                </View>
              ) : (
                eligibleEmployees.map((emp: any) => {
                  const eid = emp.id || emp.empCode;
                  const isSelected = newSelectedMemberIds.includes(eid);
                  return (
                    <TouchableOpacity
                      key={eid}
                      style={[styles.modalSelectMemberRow, isSelected && { backgroundColor: '#25D36612' }]}
                      onPress={() => {
                        setNewSelectedMemberIds((prev) =>
                          isSelected ? prev.filter((id) => id !== eid) : [...prev, eid]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      {emp.photoDataUrl ? (
                        <Image source={{ uri: emp.photoDataUrl }} style={styles.modalMemberAvatar} />
                      ) : (
                        <View style={[styles.modalMemberAvatar, { backgroundColor: getParticipantColor(emp.name) }]}>
                          <Text style={styles.modalMemberInitial}>{emp.name?.charAt(0) || 'U'}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.modalMemberName, { color: theme.textPrimary }]}>{emp.name}</Text>
                        <Text style={[styles.modalMemberRole, { color: theme.textMuted }]}>
                          {emp.designation || emp.roleName || 'Member'} • {emp.department || 'Team'}
                        </Text>
                      </View>
                      <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxChecked]}>
                        {isSelected && <Icon name="check" size={14} color="#ffffff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalSheetFooter}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  { backgroundColor: '#075E54', opacity: newSelectedMemberIds.length === 0 ? 0.6 : 1 },
                ]}
                onPress={handleAddMembers}
                disabled={newSelectedMemberIds.length === 0 || isAddingMembers}
                activeOpacity={0.8}
              >
                {isAddingMembers ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionButtonText}>
                    Add to Group ({newSelectedMemberIds.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAskAIModal = () => {
    return (
      <Modal
        visible={showAskAIModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAskAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetContainer, { backgroundColor: '#111b21', maxHeight: '90%' }]}>
            <View style={[styles.modalHeaderRow, { borderBottomColor: '#233138' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.aiHeaderIconCircle}>
                  <Icon name="sparkles" size={18} color="#25D366" />
                </View>
                <View>
                  <Text style={[styles.modalSheetTitle, { color: '#ffffff' }]}>Swift AI Copilot</Text>
                  <Text style={[styles.modalSheetSubtitle, { color: '#8696a0' }]}>
                    Private to you • Scoped to {activeGroup?.subject}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAskAIModal(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={20} color="#8696a0" />
              </TouchableOpacity>
            </View>

            {/* Suggestions Chips */}
            <View style={styles.aiChipsScrollWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiChipsRow}>
                {[
                  'Summarize discussion',
                  'Action items & decisions',
                  'Draft a polite update',
                  'Key highlights today',
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.aiChip}
                    onPress={() => {
                      setAiPrompt(chip);
                      handleAskAI(chip);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="sparkles" size={12} color="#25D366" />
                    <Text style={styles.aiChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AI Response Display */}
            <ScrollView style={styles.aiResponseScroll} contentContainerStyle={{ padding: 14 }}>
              {isAiLoading ? (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="small" color="#25D366" />
                  <Text style={styles.aiLoadingText}>Swift AI is reading recent group chat context...</Text>
                </View>
              ) : aiResponse ? (
                <View style={styles.aiResponseCard}>
                  <View style={styles.aiResponseHeader}>
                    <Text style={styles.aiResponseBadge}>Private Answer</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setMessageInput(aiResponse);
                        setShowAskAIModal(false);
                      }}
                      style={styles.aiInsertChatBtn}
                      activeOpacity={0.75}
                    >
                      <Icon name="chat" size={13} color="#25D366" />
                      <Text style={styles.aiInsertChatText}>Insert to Chat</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.aiResponseContent}>{aiResponse}</Text>
                </View>
              ) : (
                <View style={styles.aiEmptyBox}>
                  <Text style={styles.aiEmptyText}>
                    Ask any question about this group's conversation or request a drafted reply. Your conversation with Swift AI is completely private.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* AI Input Box */}
            <View style={styles.aiInputBoxRow}>
              <TextInput
                style={styles.aiTextInput}
                placeholder="Ask Swift AI anything privately..."
                placeholderTextColor="#8696a0"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                onSubmitEditing={() => handleAskAI()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.aiSendBtn, { opacity: !aiPrompt.trim() || isAiLoading ? 0.5 : 1 }]}
                onPress={() => handleAskAI()}
                disabled={!aiPrompt.trim() || isAiLoading}
                activeOpacity={0.7}
              >
                <Icon name="send" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderGroupMediaModal = () => {
    const imageMsgs = groupMessages.filter((m) => m.text?.match(/\.(jpeg|jpg|gif|png|webp)/i) || m.text?.startsWith('data:image'));
    const docMsgs = groupMessages.filter((m) => m.text?.match(/\.(pdf|xlsx|xls|docx|doc|csv|txt)/i));
    const linkMsgs = groupMessages.filter((m) => m.text?.match(/https?:\/\/[^\s]+/i) || m.text?.includes('docs.google.com'));

    return (
      <Modal
        visible={showGroupMediaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupMediaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetContainer, { backgroundColor: '#111b21', maxHeight: '85%' }]}>
            <View style={[styles.modalHeaderRow, { borderBottomColor: '#233138' }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: '#ffffff' }]}>Group Media</Text>
                <Text style={[styles.modalSheetSubtitle, { color: '#8696a0' }]}>{activeGroup?.subject}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGroupMediaModal(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={20} color="#8696a0" />
              </TouchableOpacity>
            </View>

            <View style={styles.mediaTabsRow}>
              {(['media', 'docs', 'links'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.mediaTabBtn, mediaTab === tab && styles.mediaTabBtnActive]}
                  onPress={() => setMediaTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mediaTabText, mediaTab === tab && styles.mediaTabTextActive]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              {mediaTab === 'media' && (
                imageMsgs.length === 0 ? (
                  <View style={styles.mediaEmptyWrap}>
                    <Icon name="camera" size={36} color="#8696a0" />
                    <Text style={styles.mediaEmptyText}>No media shared yet</Text>
                  </View>
                ) : (
                  <View style={styles.mediaGrid}>
                    {imageMsgs.map((m) => (
                      <View key={m.id} style={styles.mediaGridItem}>
                        <Image source={{ uri: m.text }} style={styles.mediaGridImg} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                )
              )}

              {mediaTab === 'docs' && (
                docMsgs.length === 0 ? (
                  <View style={styles.mediaEmptyWrap}>
                    <Icon name="document" size={36} color="#8696a0" />
                    <Text style={styles.mediaEmptyText}>No documents shared yet</Text>
                  </View>
                ) : (
                  docMsgs.map((m) => (
                    <View key={m.id} style={styles.docItemRow}>
                      <Icon name="document" size={20} color="#25D366" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: '#ffffff', fontSize: 14 }}>{m.text}</Text>
                        <Text style={{ color: '#8696a0', fontSize: 11 }}>{m.senderName} • {m.time}</Text>
                      </View>
                    </View>
                  ))
                )
              )}

              {mediaTab === 'links' && (
                linkMsgs.length === 0 ? (
                  <View style={styles.mediaEmptyWrap}>
                    <Icon name="info" size={36} color="#8696a0" />
                    <Text style={styles.mediaEmptyText}>No links shared yet</Text>
                  </View>
                ) : (
                  linkMsgs.map((m) => (
                    <View key={m.id} style={styles.docItemRow}>
                      <Icon name="chat" size={18} color="#38bdf8" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: '#38bdf8', fontSize: 14 }} numberOfLines={1}>{m.text}</Text>
                        <Text style={{ color: '#8696a0', fontSize: 11 }}>Shared by {m.senderName} at {m.time}</Text>
                      </View>
                    </View>
                  ))
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMuteModal = () => {
    return (
      <Modal
        visible={showMuteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMuteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMuteModal(false)}
        >
          <View style={[styles.waDialogCard, { backgroundColor: '#233138' }]}>
            <Text style={styles.waDialogTitle}>Mute notifications for...</Text>
            <Text style={styles.waDialogDesc}>
              Other participants will not see that you muted this chat.
            </Text>

            <TouchableOpacity style={styles.waRadioRow} onPress={() => handleSetMute('8h')} activeOpacity={0.7}>
              <View style={styles.waRadioOuter}>
                {activeGroup?.isMuted && activeGroup?.mutedUntil !== 'always' ? <View style={styles.waRadioInner} /> : null}
              </View>
              <Text style={styles.waRadioLabel}>8 hours</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waRadioRow} onPress={() => handleSetMute('1w')} activeOpacity={0.7}>
              <View style={styles.waRadioOuter}>
                <View />
              </View>
              <Text style={styles.waRadioLabel}>1 week</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waRadioRow} onPress={() => handleSetMute('always')} activeOpacity={0.7}>
              <View style={styles.waRadioOuter}>
                {activeGroup?.mutedUntil === 'always' ? <View style={styles.waRadioInner} /> : null}
              </View>
              <Text style={styles.waRadioLabel}>Always</Text>
            </TouchableOpacity>

            {activeGroup?.isMuted && (
              <TouchableOpacity
                style={[styles.waRadioRow, { marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#374151', paddingTop: 8 }]}
                onPress={() => handleSetMute('unmute')}
                activeOpacity={0.7}
              >
                <Icon name="bell" size={18} color="#25D366" />
                <Text style={[styles.waRadioLabel, { color: '#25D366', marginLeft: 12 }]}>Unmute notifications</Text>
              </TouchableOpacity>
            )}

            <View style={styles.waDialogButtonsRow}>
              <TouchableOpacity onPress={() => setShowMuteModal(false)} style={styles.waDialogBtn}>
                <Text style={styles.waDialogBtnCancel}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderDisappearingModal = () => {
    const currentDuration = activeGroup?.disappearingDuration || 'off';
    const durations: Array<{ id: '24h' | '7d' | '90d' | 'off'; label: string }> = [
      { id: '24h', label: '24 hours' },
      { id: '7d', label: '7 days' },
      { id: '90d', label: '90 days' },
      { id: 'off', label: 'Off' },
    ];

    return (
      <Modal
        visible={showDisappearingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisappearingModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDisappearingModal(false)}
        >
          <View style={[styles.waDialogCard, { backgroundColor: '#233138' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="clock" size={20} color="#25D366" />
              <Text style={styles.waDialogTitle}>Disappearing messages</Text>
            </View>
            <Text style={styles.waDialogDesc}>
              When turned on, new messages in this chat will disappear after the selected duration.
            </Text>

            {durations.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.waRadioRow}
                onPress={() => handleSetDisappearing(d.id)}
                activeOpacity={0.7}
              >
                <View style={styles.waRadioOuter}>
                  {currentDuration === d.id && <View style={styles.waRadioInner} />}
                </View>
                <Text style={styles.waRadioLabel}>{d.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.waDialogButtonsRow}>
              <TouchableOpacity onPress={() => setShowDisappearingModal(false)} style={styles.waDialogBtn}>
                <Text style={styles.waDialogBtnCancel}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };


  const renderMoreSubmenu = () => {
    return (
      <Modal
        visible={showMoreSubmenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreSubmenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreSubmenu(false)}
        >
          <View style={[styles.waDropdownMenu, { width: 220, top: Platform.OS === 'ios' ? 70 : 60, right: 16 }]}>
            <TouchableOpacity style={styles.waDropdownItem} onPress={handleReportGroup} activeOpacity={0.7}>
              <Text style={styles.waDropdownItemText}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waDropdownItem} onPress={handleExitGroup} activeOpacity={0.7}>
              <Text style={styles.waDropdownItemText}>Exit group</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waDropdownItem} onPress={handleClearChat} activeOpacity={0.7}>
              <Text style={styles.waDropdownItemText}>Clear chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waDropdownItem} onPress={handleExportChat} activeOpacity={0.7}>
              <Text style={styles.waDropdownItemText}>Export chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ==========================================
  // VIEW 1: MAIN WHATSAPP GROUP LIST
  // ==========================================
  if (currentView === 'list') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]} onLayout={handleContainerLayout}>
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
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setTargetGroupForAvatar(group);
                      setShowChangeAvatarModal(true);
                    }}
                    style={styles.groupAvatarTouchable}
                  >
                    <View style={[styles.groupAvatarCircle, { backgroundColor: group.iconBgColor || '#075E54' }]}>
                      {group.avatarUrl ? (
                        <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatarImg} resizeMode="cover" />
                      ) : (
                        <Text style={styles.groupAvatarEmoji}>{group.iconEmoji || '💬'}</Text>
                      )}
                      <View style={styles.avatarCameraSmallBadge}>
                        <Icon name="camera" size={8} color="#ffffff" />
                      </View>
                    </View>
                  </TouchableOpacity>

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

        {/* Group Avatar Quick Preview Modal */}
        {renderAvatarPreviewModal()}

        {/* Change Profile Picture Modal */}
        {renderChangeProfilePicModal()}
      </View>
    );
  }

  // ==========================================
  // VIEW 2: WHATSAPP "NEW GROUP" - STEP 1 (ADD PARTICIPANTS)
  // SOURCED ONLY FROM REAL EMPLOYEES
  // ==========================================
  if (currentView === 'create_step1') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]} onLayout={handleContainerLayout}>
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
      <View style={[styles.container, { backgroundColor: theme.bg }]} onLayout={handleContainerLayout}>
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
                {createdAvatarUrl ? (
                  <Image source={{ uri: createdAvatarUrl }} style={styles.subjectAvatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.subjectAvatarEmoji}>{selectedEmoji}</Text>
                )}
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

            {/* Quick Option called "Change Profile Picture / Favicon" */}
            <TouchableOpacity
              style={styles.changePicStep2OptionRow}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              activeOpacity={0.8}
            >
              <Icon name="camera" size={14} color="#075E54" />
              <Text style={styles.changePicStep2OptionText}>
                {createdAvatarUrl ? 'Change Profile Picture' : 'Add Profile Picture or Favicon'}
              </Text>
            </TouchableOpacity>

            {/* Multi-Tab Favicon, Camera/Gallery, Emoji & Color Customizer Tray */}
            {showEmojiPicker && (
              <View style={styles.customizerTray}>
                {/* Tabs */}
                <View style={styles.customizerTabRow}>
                  <TouchableOpacity
                    style={[styles.customizerTabBtn, customizerTab === 'favicon' && styles.customizerTabBtnActive]}
                    onPress={() => setCustomizerTab('favicon')}
                  >
                    <Text style={[styles.customizerTabBtnText, customizerTab === 'favicon' && { color: '#075E54', fontWeight: '700' }]}>
                      ⭐ Favicons
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.customizerTabBtn, customizerTab === 'photo' && styles.customizerTabBtnActive]}
                    onPress={() => setCustomizerTab('photo')}
                  >
                    <Text style={[styles.customizerTabBtnText, customizerTab === 'photo' && { color: '#075E54', fontWeight: '700' }]}>
                      📷 Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.customizerTabBtn, customizerTab === 'emoji' && styles.customizerTabBtnActive]}
                    onPress={() => setCustomizerTab('emoji')}
                  >
                    <Text style={[styles.customizerTabBtnText, customizerTab === 'emoji' && { color: '#075E54', fontWeight: '700' }]}>
                      😊 Emojis
                    </Text>
                  </TouchableOpacity>
                </View>

                {customizerTab === 'favicon' && (
                  <View style={{ marginTop: 8 }}>
                    {companyConfig?.faviconDataUrl && (
                      <TouchableOpacity
                        style={[styles.companyFaviconBtn, { backgroundColor: '#075E5415', borderColor: '#075E54', marginBottom: 10 }]}
                        onPress={() => {
                          setCreatedAvatarUrl(companyConfig.faviconDataUrl);
                          setShowEmojiPicker(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: companyConfig.faviconDataUrl }} style={styles.companyFaviconImg} resizeMode="contain" />
                        <View style={styles.companyFaviconTextCol}>
                          <Text style={[styles.companyFaviconName, { color: theme.textPrimary }]}>Company Favicon</Text>
                          <Text style={[styles.companyFaviconSub, { color: theme.textMuted }]}>Use official company brand icon</Text>
                        </View>
                        <Icon name="check" size={16} color="#075E54" />
                      </TouchableOpacity>
                    )}

                    <View style={styles.faviconsGrid}>
                      {PRESET_FAVICONS.map((fav) => (
                        <TouchableOpacity
                          key={fav.id}
                          style={[styles.faviconTile, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                          onPress={() => {
                            setCreatedAvatarUrl(null);
                            setSelectedEmoji(fav.icon);
                            setSelectedColor(fav.color);
                            setShowEmojiPicker(false);
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.faviconTileCircle, { backgroundColor: fav.color }]}>
                            <Text style={styles.faviconTileEmoji}>{fav.icon}</Text>
                          </View>
                          <Text style={[styles.faviconTileLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                            {fav.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {customizerTab === 'photo' && (
                  <View style={styles.step2PhotoTabWrap}>
                    <View style={styles.changePicOptionsRow}>
                      <TouchableOpacity
                        style={[styles.picOptionTile, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                        onPress={() => handlePickGroupPhoto('camera', true)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.picOptionIconCircle, { backgroundColor: '#10b98120' }]}>
                          <Icon name="camera" size={20} color="#10b981" />
                        </View>
                        <Text style={[styles.picOptionTileText, { color: theme.textPrimary }]}>Camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.picOptionTile, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                        onPress={() => handlePickGroupPhoto('gallery', true)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.picOptionIconCircle, { backgroundColor: '#3b82f620' }]}>
                          <Icon name="document" size={20} color="#3b82f6" />
                        </View>
                        <Text style={[styles.picOptionTileText, { color: theme.textPrimary }]}>Gallery</Text>
                      </TouchableOpacity>

                      {createdAvatarUrl && (
                        <TouchableOpacity
                          style={[styles.picOptionTile, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]}
                          onPress={() => setCreatedAvatarUrl(null)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.picOptionIconCircle, { backgroundColor: '#ef444420' }]}>
                            <Icon name="cross" size={20} color="#ef4444" />
                          </View>
                          <Text style={[styles.picOptionTileText, { color: '#ef4444' }]}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {customizerTab === 'emoji' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.customizerLabel, { color: theme.textMuted }]}>Choose Group Emoji:</Text>
                    <View style={styles.emojiGrid}>
                      {EMOJI_OPTIONS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.emojiPickBtn,
                            selectedEmoji === emoji && !createdAvatarUrl && { borderColor: '#25D366', backgroundColor: '#25D36620' },
                          ]}
                          onPress={() => {
                            setCreatedAvatarUrl(null);
                            setSelectedEmoji(emoji);
                          }}
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
      style={[styles.container, { backgroundColor: '#ffffff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      onLayout={handleContainerLayout}
    >
      {/* WhatsApp Chat Top Bar */}
      {isSearchActive ? (
        <View style={[styles.chatHeaderBar, { backgroundColor: '#075E54' }]}>
          <TouchableOpacity
            style={styles.chatBackBtn}
            onPress={() => {
              setIsSearchActive(false);
              setInChatSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.inChatSearchInputWrap}>
            <TextInput
              style={styles.inChatSearchInput}
              placeholder="Search in chat..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={inChatSearchQuery}
              onChangeText={setInChatSearchQuery}
              autoFocus
            />
            {inChatSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setInChatSearchQuery('')}
                style={styles.inChatSearchClearBtn}
              >
                <Icon name="cross" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {inChatSearchQuery.trim().length > 0 && (
            <View style={styles.inChatSearchCountBadge}>
              <Text style={styles.inChatSearchCountText}>
                {groupMessages.filter((m) => m.text?.toLowerCase().includes(inChatSearchQuery.toLowerCase())).length} found
              </Text>
            </View>
          )}
        </View>
      ) : (
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
              {activeGroup?.avatarUrl ? (
                <Image source={{ uri: activeGroup.avatarUrl }} style={styles.chatHeaderAvatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.chatHeaderEmoji}>{activeGroup?.iconEmoji || '💬'}</Text>
              )}
            </View>

            <View style={styles.chatHeaderTitleWrap}>
              <View style={styles.chatHeaderTitleRow}>
                <Text style={styles.chatHeaderSubject} numberOfLines={1}>
                  {activeGroup?.subject || 'Team Group'}
                </Text>
                {activeGroup?.isMuted && (
                  <View style={styles.chatHeaderMuteBadge}>
                    <Icon name="bell" size={12} color="rgba(255,255,255,0.8)" />
                  </View>
                )}
              </View>
              <Text style={styles.chatHeaderMembersSub} numberOfLines={1}>
                {activeGroup?.members?.map((m) => (m.id === currentUserId ? 'You' : m.name?.split(' ')[0])).join(', ') ||
                  'Tap for group info'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* WhatsApp 3-dots Menu Button */}
          <TouchableOpacity
            style={styles.chatInfoBtn}
            onPress={() => setShowDropdownMenu((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Icon name="more-vertical" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages Scroll Area with WhatsApp style background & theme */}
      <ScrollView
        ref={chatScrollRef}
        style={[styles.chatScrollView, { backgroundColor: '#ffffff' }]}
        contentContainerStyle={[styles.chatScrollContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onLayout={() => {
          if (isNearBottomRef.current) {
            chatScrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onContentSizeChange={() => {
          if (isNearBottomRef.current) {
            chatScrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          isNearBottomRef.current =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
        }}
        scrollEventThrottle={16}
      >
        {inChatSearchQuery.trim().length > 0 &&
          groupMessages.filter((m) => m.text?.toLowerCase().includes(inChatSearchQuery.toLowerCase())).length === 0 && (
            <View style={styles.searchNoMatchesWrap}>
              <Icon name="search" size={22} color="#8696a0" />
              <Text style={styles.searchNoMatchesText}>
                No messages matching "{inChatSearchQuery}"
              </Text>
            </View>
          )}

        {(inChatSearchQuery.trim()
          ? groupMessages.filter((m) => m.text?.toLowerCase().includes(inChatSearchQuery.toLowerCase()))
          : groupMessages
        ).map((msg) => {
          if (msg.isSystem) {
            return (
              <View key={msg.id} style={styles.systemMsgWrap}>
                <View style={[styles.systemMsgBubble, { backgroundColor: 'rgba(0, 0, 0, 0.06)' }]}>
                  <Text style={[styles.systemMsgText, { color: '#4b5563' }]}>
                    {msg.text}
                  </Text>
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
              isNearBottomRef.current = true;
              setTimeout(() => {
                chatScrollRef.current?.scrollToEnd({ animated: false });
              }, 60);
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
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setTargetGroupForAvatar(activeGroup);
                    setShowChangeAvatarModal(true);
                  }}
                >
                  <View style={[styles.modalBigAvatar, { backgroundColor: activeGroup?.iconBgColor || '#075E54' }]}>
                    {activeGroup?.avatarUrl ? (
                      <Image source={{ uri: activeGroup.avatarUrl }} style={styles.modalBigAvatarImg} resizeMode="cover" />
                    ) : (
                      <Text style={styles.modalBigEmoji}>{activeGroup?.iconEmoji || '💬'}</Text>
                    )}
                    <View style={styles.modalBigAvatarCameraBadge}>
                      <Icon name="camera" size={14} color="#ffffff" />
                    </View>
                  </View>
                </TouchableOpacity>

                <Text style={[styles.modalGroupSubject, { color: theme.textPrimary }]}>
                  {activeGroup?.subject}
                </Text>
                <Text style={[styles.modalGroupMeta, { color: theme.textMuted }]}>
                  Group • {activeGroup?.members?.length} participants
                </Text>

                {/* Explicit Option called "Change Profile Picture" */}
                <TouchableOpacity
                  style={[styles.changePicActionButton, { borderColor: '#25D366', backgroundColor: '#25D36615' }]}
                  onPress={() => {
                    setTargetGroupForAvatar(activeGroup);
                    setShowChangeAvatarModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name="camera" size={16} color="#075E54" />
                  <Text style={styles.changePicActionButtonText}>Change Profile Picture</Text>
                </TouchableOpacity>
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

              {/* Delete Group Button */}
              <TouchableOpacity
                style={[styles.deleteGroupBtn, { borderColor: '#ef444450', backgroundColor: '#ef444414' }]}
                onPress={() => handleDeleteGroup(activeGroup)}
                disabled={isDeletingGroup}
                activeOpacity={0.75}
              >
                {isDeletingGroup ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Icon name="cross" size={16} color="#dc2626" />
                    <Text style={styles.deleteGroupBtnText}>Delete Group</Text>
                  </>
                )}
              </TouchableOpacity>

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

      {/* Change Profile Picture Modal */}
      {renderChangeProfilePicModal()}

      {/* WhatsApp Dropdown Menu & Feature Modals */}
      {renderWhatsAppDropdownMenu()}
      {renderAddMembersModal()}
      {renderAskAIModal()}
      {renderGroupMediaModal()}
      {renderMuteModal()}
      {renderDisappearingModal()}
      {renderMoreSubmenu()}
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
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  waBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    marginTop: 10,
    marginBottom: 20,
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    marginTop: 20,
  },
  deleteGroupBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },

  // Group Avatar in List
  groupAvatarTouchable: {
    position: 'relative',
  },
  groupAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarCameraSmallBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#075E54',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar Quick Preview Dialog
  avatarPreviewDialog: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  avatarPreviewFullScreenCenter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewFullScreenImage: {
    width: '100%',
    height: '80%',
  },
  avatarPreviewFullScreenEmoji: {
    fontSize: 120,
  },
  avatarPreviewFullScreenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarPreviewFullScreenActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  fullScreenChatPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fullScreenChatPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  previewActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Full Screen Change Profile Picture Modal Styles
  fullScreenRoot: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingBottom: 14,
    ...SHADOWS.md,
  },
  fullScreenBackBtn: {
    padding: 6,
  },
  fullScreenCloseBtn: {
    padding: 6,
  },
  fullScreenHeaderTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  fullScreenHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  fullScreenHeaderSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  fullScreenUpdatingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreenBody: {
    flex: 1,
  },
  fullScreenContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  currentAvatarHeroWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  modalHeroAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    ...SHADOWS.md,
  },
  modalHeroAvatarImg: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  modalHeroEmoji: {
    fontSize: 52,
  },
  heroGroupSubjectText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  heroGroupSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeadingTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  updatingAvatarBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  updatingAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentAvatarPreviewCenter: {
    alignItems: 'center',
    marginVertical: 12,
  },
  modalBigAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalBigAvatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#075E54',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePicActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  changePicActionButtonText: {
    color: '#075E54',
    fontSize: 13,
    fontWeight: '700',
  },

  // Upload Options Row
  changePicOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  picOptionTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  picOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picOptionTileText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Favicons Grid
  faviconsHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  companyFaviconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    gap: 12,
    marginBottom: 8,
  },
  companyFaviconImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  companyFaviconTextCol: {
    flex: 1,
  },
  companyFaviconName: {
    fontSize: 13,
    fontWeight: '700',
  },
  companyFaviconSub: {
    fontSize: 11,
    marginTop: 1,
  },
  faviconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  faviconTile: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  faviconTileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconTileEmoji: {
    fontSize: 20,
  },
  faviconTileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Chat Top Bar Avatar Image
  chatHeaderAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  // Create Step 2 Styles
  subjectAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  changePicStep2OptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  changePicStep2OptionText: {
    color: '#075E54',
    fontSize: 12.5,
    fontWeight: '700',
  },
  customizerTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 8,
  },
  customizerTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  customizerTabBtnActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: '#075E54',
  },
  customizerTabBtnText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
  },
  step2PhotoTabWrap: {
    paddingVertical: 8,
  },

  // WhatsApp Header & In-Chat Search
  chatHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatHeaderMuteBadge: {
    opacity: 0.85,
  },
  inChatSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    marginHorizontal: 8,
  },
  inChatSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14.5,
    paddingVertical: 0,
  },
  inChatSearchClearBtn: {
    padding: 4,
  },
  inChatSearchCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  inChatSearchCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  searchNoMatchesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  searchNoMatchesText: {
    color: '#8696a0',
    fontSize: 14,
  },

  // WhatsApp 3-Dots Dropdown Menu
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  waDropdownMenu: {
    position: 'absolute',
    right: 12,
    width: 235,
    backgroundColor: '#233138',
    borderRadius: 14,
    paddingVertical: 6,
    ...SHADOWS.md,
    elevation: 12,
    zIndex: 9999,
  },
  waDropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  waDropdownItemMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waDropdownItemText: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: '400',
  },
  waDropdownArrow: {
    color: '#8696a0',
    fontSize: 10,
  },

  // Modals & Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  modalSelectMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#8696a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCheckboxChecked: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  modalSheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  primaryActionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Swift AI Modal
  aiHeaderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D36620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiChipsScrollWrap: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#233138',
  },
  aiChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#233138',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  aiChipText: {
    color: '#e9edef',
    fontSize: 12,
    fontWeight: '500',
  },
  aiResponseScroll: {
    flex: 1,
    maxHeight: 320,
  },
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#233138',
    borderRadius: 12,
  },
  aiLoadingText: {
    color: '#8696a0',
    fontSize: 13,
    flex: 1,
  },
  aiResponseCard: {
    backgroundColor: '#233138',
    borderRadius: 14,
    padding: 16,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiResponseBadge: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiInsertChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D36620',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  aiInsertChatText: {
    color: '#25D366',
    fontSize: 12,
    fontWeight: '600',
  },
  aiResponseContent: {
    color: '#e9edef',
    fontSize: 14.5,
    lineHeight: 22,
  },
  aiEmptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  aiEmptyText: {
    color: '#8696a0',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  aiInputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#233138',
    gap: 10,
  },
  aiTextInput: {
    flex: 1,
    backgroundColor: '#233138',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  aiSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Group Media Modal
  mediaTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#233138',
  },
  mediaTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mediaTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#25D366',
  },
  mediaTabText: {
    color: '#8696a0',
    fontSize: 13,
    fontWeight: '600',
  },
  mediaTabTextActive: {
    color: '#25D366',
  },
  mediaEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  mediaEmptyText: {
    color: '#8696a0',
    fontSize: 14,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaGridImg: {
    width: '100%',
    height: '100%',
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#233138',
  },

  // WhatsApp Dialog Cards (Mute & Disappearing)
  waDialogCard: {
    marginHorizontal: 28,
    borderRadius: 16,
    padding: 22,
    ...SHADOWS.md,
    elevation: 12,
    alignSelf: 'center',
    width: '85%',
  },
  waDialogTitle: {
    color: '#e9edef',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  waDialogDesc: {
    color: '#8696a0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  waRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  waRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#25D366',
  },
  waRadioLabel: {
    color: '#e9edef',
    fontSize: 15,
  },
  waDialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  waDialogBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  waDialogBtnCancel: {
    color: '#25D366',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});


