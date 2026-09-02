import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { askSwiftAIChat } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatScreenProps {
  theme: ThemeColors;
}

interface ChatMessage {
  id: string | number;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  isError?: boolean;
}

export function ChatScreen({ theme }: ChatScreenProps) {
  const { currentUser, leaves, holidays, companyConfig, userRole } = useAppContext();
  const [activeChannel, setActiveChannel] = useState<'ai' | 'team'>('ai');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    bottomInset = insets?.bottom || 0;
  } catch (e) {}

  const safeBottomMargin = Math.max(bottomInset, 12) + 14;
  const tabTabBarHeight = 68;
  const gapAboveTabBar = 14;
  const bottomOffsetWhenTabBarVisible = safeBottomMargin + tabTabBarHeight + gapAboveTabBar;

  const currentBottomMargin = isKeyboardVisible
    ? Platform.OS === 'ios'
      ? 30
      : (keyboardHeight > 0 ? keyboardHeight + 30 : 32)
    : bottomOffsetWhenTabBarVisible;

  const userName = currentUser?.name?.split(' ')[0] || 'Employee';

  // Compute live contextual data to inject into SWIFT AI
  const approvedLeaves = (leaves || []).filter(
    (l: any) =>
      (l.employeeId === currentUser?.id || l.employeeName === currentUser?.name || l.employeeId === currentUser?.empCode) &&
      l.status === 'Approved'
  );
  const usedCL = approvedLeaves
    .filter((l: any) => l.type?.toLowerCase().includes('casual'))
    .reduce((s: number, l: any) => s + (parseFloat(l.days) || 1), 0);
  const usedSL = approvedLeaves
    .filter((l: any) => l.type?.toLowerCase().includes('sick'))
    .reduce((s: number, l: any) => s + (parseFloat(l.days) || 1), 0);
  const usedPL = approvedLeaves
    .filter((l: any) => l.type?.toLowerCase().includes('paid') || l.type?.toLowerCase().includes('annual') || l.type?.toLowerCase().includes('earned'))
    .reduce((s: number, l: any) => s + (parseFloat(l.days) || 1), 0);

  const totalCL = companyConfig?.leaveQuota?.casual || 12;
  const totalSL = companyConfig?.leaveQuota?.sick || 8;
  const totalPL = companyConfig?.leaveQuota?.paid || 18;

  const remainingCL = Math.max(0, totalCL - usedCL);
  const remainingSL = Math.max(0, totalSL - usedSL);
  const remainingPL = Math.max(0, totalPL - usedPL);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHols = (holidays || []).filter((h: any) => h.date >= todayStr);

  const initialBotGreeting = `Hello ${userName}! 👋 I am **SWIFT AI**, your intelligent HR & Operations Assistant powered by InkPen.\n\nI can help you with:\n• Checking leave balances & policies\n• Drafting leave & regularization requests\n• Upcoming holidays & payroll schedules\n• General company HR questions\n\nHow can I assist you today?`;

  const chatStorageKey = `@swift_ai_chat_${currentUser?.id || currentUser?.empCode || 'default'}`;

  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: initialBotGreeting,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [teamMessages, setTeamMessages] = useState<ChatMessage[]>([
    {
      id: 'team-1',
      sender: 'bot',
      text: `Welcome to the Team Engineering channel! Post updates or coordinate with your teammates here.`,
      time: '09:00 AM',
    },
  ]);

  // Load chat history from AsyncStorage on mount
  useEffect(() => {
    async function loadChatHistory() {
      try {
        const saved = await AsyncStorage.getItem(chatStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAiMessages(parsed);
          }
        }
      } catch (err) {
        console.warn('[SWIFT AI] Failed to load chat history from storage:', err);
      }
    }
    loadChatHistory();
  }, [chatStorageKey]);

  // Save AI messages to AsyncStorage whenever updated
  const saveAiMessagesToStorage = async (msgs: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(chatStorageKey, JSON.stringify(msgs));
    } catch (err) {
      console.warn('[SWIFT AI] Failed to save chat history to storage:', err);
    }
  };

  // Auto scroll to bottom when messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [aiMessages, teamMessages, isLoading]);

  // Auto scroll and track keyboard visibility & exact height
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const query = inputText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, sender: 'user', text: query, time: timeStr };

    setInputText('');

    if (activeChannel === 'team') {
      setTeamMessages((prev) => [...prev, userMsg]);
      return;
    }

    // AI Channel
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    saveAiMessagesToStorage(updatedMessages);
    setIsLoading(true);

    try {
      const contextData = {
        companyName: currentUser?.companyName || companyConfig?.companyName || 'Swift HRMS',
        employeeName: currentUser?.name || 'Employee',
        empCode: currentUser?.empCode || currentUser?.id || 'EMP001',
        designation: currentUser?.designation || currentUser?.roleName || 'Software Engineer',
        department: currentUser?.department || 'Engineering',
        role: userRole || currentUser?.roleName || 'employee',
        remainingCL,
        remainingSL,
        remainingPL,
        totalCL,
        totalSL,
        totalPL,
        upcomingHolidays: upcomingHols.slice(0, 5),
        fixedSalary: currentUser?.fixedSalary || currentUser?.basic || 45000,
        bankAccount: currentUser?.bankAccount || currentUser?.bankAcc || 'Registered Salary Account',
      };

      const result = await askSwiftAIChat(updatedMessages, contextData);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: result.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: !result.success,
      };

      const finalMessages = [...updatedMessages, botMsg];
      setAiMessages(finalMessages);
      saveAiMessagesToStorage(finalMessages);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Sorry, I had trouble reaching the AI server. Please check your internet connection or try again shortly.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setAiMessages(finalMessages);
      saveAiMessagesToStorage(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const handleClearChat = async () => {
    const defaultMsg: ChatMessage[] = [
      {
        id: `init-${Date.now()}`,
        sender: 'bot',
        text: initialBotGreeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setAiMessages(defaultMsg);
    try {
      await AsyncStorage.removeItem(chatStorageKey);
    } catch (err) {
      console.warn('[SWIFT AI] Failed to clear chat history from storage:', err);
    }
  };

  const currentMessages = activeChannel === 'ai' ? aiMessages : teamMessages;

  const quickPrompts = [
    'How many leaves do I have left?',
    'What is my CL and SL leave balance?',
    'Draft a formal 2-day leave application',
    'Write a sick leave email for today',
    'Draft an attendance regularization note',
    'Write a Work From Home (WFH) request email',
    'When is the next company holiday?',
    'Show upcoming public holidays',
    'What are standard office hours and lunch break?',
    'What is the grace period for late check-in?',
    'When is monthly salary credited?',
    'How is PF and salary deduction calculated?',
    'Where can I download my payslip in the app?',
    'What is the probation period policy?',
    'How do I submit a workplace grievance?',
    'Draft a professional resignation letter',
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Channel Switcher & AI Status Header */}
      <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.channelRow, { backgroundColor: theme.inputBg }]}>
          <TouchableOpacity
            style={[styles.channelTab, activeChannel === 'ai' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveChannel('ai')}
          >
            <View style={styles.tabContentRow}>
              <Icon name="bot" size={15} color={activeChannel === 'ai' ? '#ffffff' : theme.textMuted} />
              <Text style={[styles.channelText, { color: theme.textMuted }, activeChannel === 'ai' && { color: '#ffffff' }]}>
                SWIFT AI
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.channelTab, activeChannel === 'team' && { backgroundColor: theme.primary }]}
            onPress={() => setActiveChannel('team')}
          >
            <View style={styles.tabContentRow}>
              <Icon name="chat" size={15} color={activeChannel === 'team' ? '#ffffff' : theme.textMuted} />
              <Text style={[styles.channelText, { color: theme.textMuted }, activeChannel === 'team' && { color: '#ffffff' }]}>
                Team Chat
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {activeChannel === 'ai' && (
          <View style={styles.aiStatusRow}>
            <View style={styles.aiBadge}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.aiBadgeText, { color: theme.textMuted }]}>
                Ink AI • Live HR Context Connected
              </Text>
            </View>

            <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat}>
              <Text style={[styles.clearBtnText, { color: theme.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {currentMessages.map((m) => (
          <View
            key={m.id}
            style={[styles.msgWrapper, m.sender === 'user' ? styles.userWrapper : styles.botWrapper]}
          >
            {m.sender === 'bot' && (
              <View style={[styles.botAvatar, { backgroundColor: theme.primaryLight }]}>
                <Icon name="bot" size={14} color={theme.primary} />
              </View>
            )}

            <View
              style={[
                styles.msgBubble,
                m.sender === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [
                    styles.botBubble,
                    {
                      backgroundColor: theme.card,
                      borderColor: m.isError ? '#f87171' : theme.cardBorder,
                    },
                  ],
              ]}
            >
              <Text
                style={[
                  styles.msgText,
                  { color: m.sender === 'user' ? '#ffffff' : theme.textPrimary },
                ]}
                selectable
              >
                {m.text}
              </Text>
              <Text
                style={[
                  styles.msgTime,
                  { color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : theme.textMuted },
                ]}
              >
                {m.time}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing Loading Indicator */}
        {isLoading && (
          <View style={[styles.msgWrapper, styles.botWrapper]}>
            <View style={[styles.botAvatar, { backgroundColor: theme.primaryLight }]}>
              <Icon name="bot" size={14} color={theme.primary} />
            </View>
            <View
              style={[
                styles.msgBubble,
                styles.botBubble,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.typingText, { color: theme.textMuted }]}>SWIFT AI is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts Carousel */}
      {activeChannel === 'ai' && (
        <View style={styles.promptContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptContent}
          >
            {quickPrompts.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.promptChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => handleQuickPrompt(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.promptText, { color: theme.primary }]}>✨ {p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            marginBottom: currentBottomMargin,
          },
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: theme.textPrimary }]}
          placeholder={activeChannel === 'ai' ? 'Ask SWIFT AI about leaves, policy, payroll...' : 'Type a message to the team...'}
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
          }}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() && !isLoading ? theme.primary : theme.textMuted },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Icon name="send" size={16} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  channelRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  channelTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  clearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 14,
  },
  chatContent: {
    paddingVertical: 14,
    gap: 12,
  },
  msgWrapper: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  botWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  promptContainer: {
    paddingVertical: 6,
    maxHeight: 44,
  },
  promptContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 6,
    maxHeight: 90,
    fontSize: 13.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
