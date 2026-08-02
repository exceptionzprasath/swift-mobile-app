import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';

interface ChatScreenProps {
  theme: ThemeColors;
}

export function ChatScreen({ theme }: ChatScreenProps) {
  const [activeChannel, setActiveChannel] = useState<'team' | 'ai'>('ai');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello Alex! I am SWIFT AI Assistant. How can I help you with your HR, leave, or payroll questions today?', time: '10:00 AM' },
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user', text: inputText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    const textToReply = inputText.toLowerCase();
    setInputText('');

    setTimeout(() => {
      let botReply = "I've logged your query with HR. You can also check the Documents section for full company policies!";
      if (textToReply.includes('leave')) {
        botReply = 'You have 6 Casual Leaves (CL) and 5 Sick Leaves (SL) remaining for this year. You can apply directly in the Leaves tab!';
      } else if (textToReply.includes('payroll') || textToReply.includes('salary')) {
        botReply = 'Your July 2026 salary of ₹84,500.00 was credited to HDFC Bank on Aug 01. You can download the PDF payslip from the Payroll tab!';
      } else if (textToReply.includes('holiday')) {
        botReply = 'The next company holiday is Independence Day on Friday, August 15, 2026!';
      }

      const replyMsg = { id: Date.now() + 1, sender: 'bot', text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages((prev) => [...prev, replyMsg]);
    }, 600);
  };

  const handleQuickQuery = (query: string) => {
    setInputText(query);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Channel Switcher */}
      <View style={[styles.channelRow, { backgroundColor: theme.inputBg }]}>
        <TouchableOpacity
          style={[styles.channelTab, activeChannel === 'ai' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveChannel('ai')}
        >
          <Text style={[styles.channelText, { color: theme.textMuted }, activeChannel === 'ai' && { color: '#ffffff' }]}>
            SWIFT AI Assistant
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.channelTab, activeChannel === 'team' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveChannel('team')}
        >
          <Text style={[styles.channelText, { color: theme.textMuted }, activeChannel === 'team' && { color: '#ffffff' }]}>
            Team Engineering
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((m) => (
          <View key={m.id} style={[styles.msgWrapper, m.sender === 'user' ? styles.userWrapper : styles.botWrapper]}>
            <View style={[styles.msgBubble, m.sender === 'user' ? { backgroundColor: theme.primary } : { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}>
              <Text style={[styles.msgText, { color: m.sender === 'user' ? '#ffffff' : theme.textPrimary }]}>
                {m.text}
              </Text>
              <Text style={[styles.msgTime, { color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>{m.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Quick Prompts */}
      {activeChannel === 'ai' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptRow}>
          {['How much leave do I have?', 'Download July Payslip', 'When is the next holiday?'].map((p, idx) => (
            <TouchableOpacity key={idx} style={[styles.promptChip, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]} onPress={() => handleQuickQuery(p)}>
              <Text style={[styles.promptText, { color: theme.primary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.cardBorder }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
          placeholder="Ask SWIFT AI or chat with team..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary }]} onPress={handleSend}>
          <Icon name="send" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  channelRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 4,
  },
  channelTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
    gap: 12,
  },
  msgWrapper: {
    marginBottom: 6,
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  botWrapper: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  promptRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 38,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
