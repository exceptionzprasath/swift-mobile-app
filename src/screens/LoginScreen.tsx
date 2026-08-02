import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}>
            <Text style={[styles.logoText, { color: theme.accent }]}>S</Text>
          </View>
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>SWIFT HRMS</Text>
          <Text style={[styles.brandTagline, { color: theme.textMuted }]}>Employee Mobile Portal</Text>
        </View>

        {/* Card Form */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Employee Sign In</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
            Sign in with your Employee Code or Work Email and Password assigned in Company Admin Portal.
          </Text>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
              <Icon name="info" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Employee Code Input */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Employee Code or Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="user" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Enter Employee Code or Email"
              placeholderTextColor={theme.textMuted}
              value={empCode}
              onChangeText={setEmpCode}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="shield" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Enter password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Icon name={showPassword ? 'sun' : 'moon'} size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: theme.primary }]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
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

        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          Need help signing in? Contact your HR Administrator in Company Admin Portal.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 4,
  },
  signInBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    marginTop: 10,
    gap: 8,
    ...SHADOWS.sm,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 18,
  },
});
