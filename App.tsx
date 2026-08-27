import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView, Keyboard, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LIGHT_THEME, DARK_THEME, ThemeColors } from './src/theme/colors';
import { AppProvider, useAppContext, canRoleApproveDocInApp } from './src/context/AppContext';
import { SplashView } from './src/components/SplashView';
import { Header } from './src/components/Header';
import { TabBar, TabType } from './src/components/TabBar';
import { SideDrawer } from './src/components/SideDrawer';

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
import { GrievanceScreen } from './src/screens/GrievanceScreen';

export type AppNavTab = TabType | 'notifications' | 'holidays' | 'documents' | 'tasks' | 'chat' | 'profile' | 'grievance';

function MainAppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); // Light theme default
  const [activeTab, setActiveTab] = useState<AppNavTab>('home');
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { isLoggedIn, currentUser, companyConfig, login, logout, docRequests, userRole } = useAppContext();
  const theme: ThemeColors = isDarkMode ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const pendingApprovalsCount = (docRequests || []).filter(
    (d) => d.status === 'pending' && canRoleApproveDocInApp(userRole, d.letterKey)
  ).length;

  const pendingSignatureCount = (docRequests || []).filter(
    (d) =>
      (d.employeeId === currentUser?.id || d.employeeId === currentUser?.empCode) &&
      d.status === 'approved' &&
      !d.employeeAccepted
  ).length;

  const totalUnreadNotifications = pendingApprovalsCount + pendingSignatureCount + 1;

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
        return <NotificationsScreen theme={theme} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'holidays':
        return <HolidaysScreen theme={theme} />;
      case 'documents':
        return <DocumentsScreen theme={theme} />;
      case 'tasks':
        return <TasksScreen theme={theme} />;
      case 'chat':
        return <ChatScreen theme={theme} />;
      case 'grievance':
        return <GrievanceScreen theme={theme} />;
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
        unreadCount={totalUnreadNotifications}
        onNotificationPress={() => setActiveTab('notifications')}
        onProfilePress={() => setActiveTab('profile')}
        onMenuPress={() => setIsSideDrawerOpen(true)}
      />

      {/* Main Body */}
      <View style={styles.body}>{renderActiveScreen()}</View>

      {/* Bottom Navigation */}
      {(!isKeyboardVisible || activeTab !== 'chat') && (
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
      )}

      {/* Side Panel Drawer */}
      <SideDrawer
        visible={isSideDrawerOpen}
        theme={theme}
        onClose={() => setIsSideDrawerOpen(false)}
        onNavigate={(tab) => {
          setIsSideDrawerOpen(false);
          setActiveTab(tab);
        }}
        onToggleTheme={toggleTheme}
        onLogout={logout}
      />
    </SafeAreaView>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </SafeAreaProvider>
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
