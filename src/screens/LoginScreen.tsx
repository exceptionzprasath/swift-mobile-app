import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';

interface LoginScreenProps {
  theme: ThemeColors;
  onLogin: (empCode: string, pass: string) => Promise<boolean>;
}

export function LoginScreen({ theme, onLogin }: LoginScreenProps) {
  const [empCode, setEmpCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async () => {
    if (!empCode.trim() || !password.trim()) {
      setErrorMsg('Please enter your Employee Code / Work Email and Password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const success = await onLogin(empCode.trim(), password.trim());
      if (!success) {
        setErrorMsg('Invalid Employee Code or Password. Please check credentials created in Company Admin Portal.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/swift.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Dark Glassmorphic Ambient Overlay */}
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Glassmorphism Frosted Container */}
            <View style={styles.glassCard}>

              {/* Brand Logo Header */}
              <View style={styles.brandHeader}>
                <Image
                  source={require('../assets/logo-swift.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.brandTagline}>ENTERPRISE HR & MOBILE PORTAL</Text>
              </View>

              {/* Card Title & Subtitle */}
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>
                Sign in with your Employee Code or Work Email
              </Text>

              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Icon name="info" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Employee Code Input */}
              <Text style={styles.inputLabel}>Employee Code or Work Email</Text>
              <View style={styles.inputWrapper}>
                <Icon name="user" size={18} color="rgba(255, 255, 255, 0.65)" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SW009 or employee@company.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={empCode}
                  onChangeText={setEmpCode}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input */}
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Icon name="shield" size={18} color="rgba(255, 255, 255, 0.65)" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Icon name={showPassword ? 'sun' : 'moon'} size={16} color="rgba(255, 255, 255, 0.65)" />
                </TouchableOpacity>
              </View>

              {/* Submit Action Button */}
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In to Portal</Text>
                    <Icon name="chevron-right" size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Text */}
            <Text style={styles.footerText}>
              SWIFT HRMS • Secure Biometric & Geofenced Access
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 7, 18, 0.55)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoImage: {
    width: 200,
    height: 65,
    marginBottom: 6,
  },
  brandTagline: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  signInBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    marginTop: 10,
    gap: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 20,
    fontWeight: '500',
  },
});
