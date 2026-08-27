import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface FaceRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
  onSuccess?: () => void;
}

export function FaceRegistrationModal({
  visible,
  onClose,
  theme,
  onSuccess,
}: FaceRegistrationModalProps) {
  const { currentUser, registerEmployeeFace } = useAppContext();

  const [stage, setStage] = useState<'intro' | 'preview' | 'registering' | 'success' | 'error'>('intro');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resetModal = () => {
    setStage('intro');
    setPhotoUri(null);
    setPhotoDataUrl(null);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleCapturePhoto = async () => {
    try {
      setErrorMessage('');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri || null;
      const dataUrl = asset.base64
        ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri || '';

      setPhotoUri(uri);
      setPhotoDataUrl(dataUrl);
      setStage('preview');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to open camera. Please ensure camera permissions are granted.');
      setStage('error');
    }
  };

  const handleConfirmRegistration = async () => {
    if (!photoDataUrl) {
      setErrorMessage('No photo captured. Please take a photo first.');
      setStage('error');
      return;
    }

    try {
      setStage('registering');
      const res = await registerEmployeeFace(photoDataUrl);

      if (res && res.success) {
        setStage('success');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage(res?.error || 'Facial registration could not be completed. Please try again with clear lighting.');
        setStage('error');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error occurred during face registration.');
      setStage('error');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.iconPill, { backgroundColor: theme.primary + '15' }]}>
                <Icon name="camera" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  Biometric Face Enrollment
                </Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  {currentUser?.name || 'Employee'} • {currentUser?.empCode || 'SW001'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}
              disabled={stage === 'registering'}
            >
              <Icon name="cross" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body based on Stage */}
          {stage === 'intro' && (
            <View style={styles.stageWrap}>
              <View style={[styles.guideBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <View style={[styles.guideOval, { borderColor: theme.primary }]}>
                  <Icon name="user" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.guideTitle, { color: theme.textPrimary }]}>
                  Register Your Face Profile
                </Text>
                <Text style={[styles.guideDesc, { color: theme.textMuted }]}>
                  Capture a clear selfie to enable automatic One-Tap AI Facial Attendance punch-in & punch-out.
                </Text>
              </View>

              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>💡</Text>
                  <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                    Ensure good front lighting with no shadows on your face.
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>🕶️</Text>
                  <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                    Remove sunglasses, masks, or caps covering your face.
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>🛡️</Text>
                  <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                    Encrypted and securely synchronized to the Admin HR Portal.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={handleCapturePhoto}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Open Camera & Take Selfie</Text>
              </TouchableOpacity>
            </View>
          )}

          {stage === 'preview' && (
            <View style={styles.stageWrap}>
              <View style={[styles.previewFrame, { borderColor: theme.primary, backgroundColor: theme.inputBg }]}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.previewImage} />
                ) : (
                  <ActivityIndicator size="large" color={theme.primary} />
                )}
              </View>

              <Text style={[styles.previewConfirmTitle, { color: theme.textPrimary }]}>
                Is your face clearly visible?
              </Text>
              <Text style={[styles.previewConfirmSub, { color: theme.textMuted }]}>
                Tap &quot;Confirm &amp; Register&quot; to securely index your face biometrics for check-in.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.8}
                >
                  <Icon name="camera" size={16} color={theme.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtnFlex, { backgroundColor: theme.primary }]}
                  onPress={handleConfirmRegistration}
                  activeOpacity={0.85}
                >
                  <Icon name="check" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Confirm &amp; Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {stage === 'registering' && (
            <View style={[styles.stageWrap, { paddingVertical: 36, alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>
                Registering Facial Biometrics...
              </Text>
              <Text style={[styles.loadingSub, { color: theme.textMuted }]}>
                Uploading profile photo to AWS S3 and indexing in AWS Rekognition collection.
              </Text>
            </View>
          )}

          {stage === 'success' && (
            <View style={[styles.stageWrap, { alignItems: 'center' }]}>
              <View style={[styles.successBadge, { backgroundColor: theme.success + '20' }]}>
                <Icon name="check" size={38} color={theme.success} />
              </View>

              <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
                Face Enrolled Successfully! 🎉
              </Text>
              <Text style={[styles.successSub, { color: theme.textMuted }]}>
                Your facial biometric profile has been registered and verified. It is now active on the Mobile App and synced to the Admin HR Portal.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.success, width: '100%' }]}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Done &amp; Return to App</Text>
              </TouchableOpacity>
            </View>
          )}

          {stage === 'error' && (
            <View style={[styles.stageWrap, { alignItems: 'center' }]}>
              <View style={[styles.errorBadge, { backgroundColor: theme.danger + '20' }]}>
                <Icon name="cross" size={32} color={theme.danger} />
              </View>

              <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>
                Registration Unsuccessful
              </Text>
              <Text style={[styles.errorSub, { color: theme.danger }]}>
                {errorMessage || 'Unable to register face. Please ensure camera permissions are active and retry in good lighting.'}
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtnFlex, { backgroundColor: theme.primary }]}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.85}
                >
                  <Icon name="camera" size={16} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: Math.min(width - 32, 400),
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...SHADOWS.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageWrap: {
    marginTop: 4,
  },
  guideBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  guideOval: {
    width: 100,
    height: 120,
    borderRadius: 50,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  guideDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  tipsList: {
    marginBottom: 18,
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipBullet: {
    fontSize: 13,
  },
  tipText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  primaryBtnFlex: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewFrame: {
    width: 140,
    height: 170,
    borderRadius: 70,
    borderWidth: 3,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewConfirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewConfirmSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  loadingSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  errorBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});
