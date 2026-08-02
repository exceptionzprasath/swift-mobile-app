import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { LIGHT_THEME, DARK_THEME, ThemeColors } from './src/theme/colors';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { SplashView } from './src/components/SplashView';
import { Header } from './src/components/Header';
import { TabBar, TabType } from './src/components/TabBar';

import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { PayrollScreen } from './src/screens/PayrollScreen';
import { LeavesScreen } from './src/screens/LeavesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { HolidaysScreen } from './src/screens/HolidaysScreen';
import { DocumentsScreen } from './src/screens/DocumentsScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

export type AppNavTab = TabType | 'notifications' | 'holidays' | 'documents' | 'tasks' | 'chat' | 'profile';

function MainAppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); // Light theme default
  const [activeTab, setActiveTab] = useState<AppNavTab>('home');

  const { isLoggedIn, currentUser, companyConfig, login, logout } = useAppContext();
  const theme: ThemeColors = isDarkMode ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  if (showSplash) {
    return <SplashView theme={theme} onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen theme={theme} onLogin={login} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            theme={theme}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'attendance':
        return (
          <AttendanceScreen
            theme={theme}
          />
        );
      case 'payroll':
        return <PayrollScreen theme={theme} />;
      case 'leaves':
        return <LeavesScreen theme={theme} />;
      case 'notifications':
        return <NotificationsScreen theme={theme} />;
      case 'holidays':
        return <HolidaysScreen theme={theme} />;
      case 'documents':
        return <DocumentsScreen theme={theme} />;
      case 'tasks':
        return <TasksScreen theme={theme} />;
      case 'chat':
        return <ChatScreen theme={theme} />;
      case 'profile':
        return (
          <ProfileScreen
            theme={theme}
            onToggleTheme={toggleTheme}
            onLogout={logout}
          />
        );
      case 'more':
      default:
        return (
          <HomeScreen
            theme={theme}
            onNavigate={(tab) => setActiveTab(tab)}
            isClockedIn={isClockedIn}
            onClockToggle={handleClockToggle}
          />
        );
    }
  };

  const getBottomTab = (): TabType => {
    if (activeTab === 'home' || activeTab === 'attendance' || activeTab === 'payroll' || activeTab === 'leaves') {
      return activeTab;
    }
    return 'more';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
      />

      {/* App Header */}
      <Header
        theme={theme}
        employeeName={currentUser?.name || 'Alex Mercer'}
        profilePhoto={currentUser?.photoDataUrl}
        companyName={currentUser?.companyName || companyConfig?.companyName || 'SWIFT HRMS'}
        unreadCount={3}
        onNotificationPress={() => setActiveTab('notifications')}
        onProfilePress={() => setActiveTab('profile')}
      />

      {/* Main Body */}
      <View style={styles.body}>{renderActiveScreen()}</View>

      {/* Bottom Navigation */}
      <TabBar
        theme={theme}
        activeTab={getBottomTab()}
        onTabChange={(tab) => {
          if (tab === 'more') {
            setActiveTab('profile');
          } else {
            setActiveTab(tab);
          }
        }}
        leavePendingCount={1}
      />
    </SafeAreaView>
  );
}

export function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});

export default App;
