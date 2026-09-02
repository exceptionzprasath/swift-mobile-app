import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ThemeColors, COLOR_PALETTES, PaletteDefinition, getPaletteById } from '../theme/colors';
import { Icon } from './Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThemePaletteModalProps {
  visible: boolean;
  theme: ThemeColors;
  selectedPaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  onClose: () => void;
}

export function ThemePaletteModal({
  visible,
  theme,
  selectedPaletteId,
  onSelectPalette,
  onClose,
}: ThemePaletteModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All (20)' },
    { id: 'nature', label: '🌿 Nature' },
    { id: 'earthy', label: '🍂 Earthy' },
    { id: 'vibrant', label: '⚡ Vibrant' },
    { id: 'modern', label: '✨ Modern' },
    { id: 'dark', label: '🌙 Dark' },
  ];

  const filteredPalettes = COLOR_PALETTES.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                <Icon name="sparkles" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Choose Color Theme</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Select from 20 curated 5-color palettes
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
              style={styles.categoryScroll}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? theme.primary : theme.inputBg,
                        borderColor: isActive ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setActiveCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isActive ? '#ffffff' : theme.textPrimary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Palettes List */}
          <ScrollView
            style={styles.paletteList}
            contentContainerStyle={styles.paletteListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredPalettes.map((palette, index) => {
              const isSelected = selectedPaletteId === palette.id;
              return (
                <TouchableOpacity
                  key={palette.id}
                  style={[
                    styles.paletteCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: isSelected ? theme.primary : theme.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    onSelectPalette(palette.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.titleInfo}>
                      <View style={styles.indexBadge}>
                        <Text style={[styles.indexText, { color: theme.textMuted }]}>
                          #{index + 1}
                        </Text>
                      </View>
                      <Text style={[styles.paletteName, { color: theme.textPrimary }]}>
                        {palette.name}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={[styles.activeBadge, { backgroundColor: theme.primary }]}>
                        <Icon name="check" size={12} color="#ffffff" />
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>

                  {/* 5-Color Swatch Strip */}
                  <View style={styles.swatchBar}>
                    {palette.hexes.map((hex, i) => (
                      <View
                        key={i}
                        style={[
                          styles.swatchSegment,
                          {
                            backgroundColor: hex,
                            borderTopLeftRadius: i === 0 ? 8 : 0,
                            borderBottomLeftRadius: i === 0 ? 8 : 0,
                            borderTopRightRadius: i === 4 ? 8 : 0,
                            borderBottomRightRadius: i === 4 ? 8 : 0,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.hexCodeText,
                            {
                              color: isColorDark(hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {hex}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Vibe Description */}
                  <Text style={[styles.vibeText, { color: theme.textMuted }]} numberOfLines={2}>
                    {palette.vibe}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function isColorDark(hexColor: string): boolean {
  const c = hexColor.replace('#', '');
  if (c.length !== 6) return true;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    marginTop: 4,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paletteList: {
    paddingHorizontal: 18,
  },
  paletteListContent: {
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  paletteCard: {
    borderRadius: 16,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indexBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  indexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paletteName: {
    fontSize: 15,
    fontWeight: '800',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  swatchBar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  swatchSegment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexCodeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  vibeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  applyBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
