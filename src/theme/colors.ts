import React, { createContext, useContext, useState } from 'react';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  card: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentSoft: string;
  cyan: string;
  cyanSoft: string;
  tealSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
}

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  bg: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  inputBg: '#f1f5f9',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',

  primary: '#0f766e',
  primaryDark: '#115e59',
  primaryLight: '#0d9488',
  accent: '#ea580c',
  accentSoft: '#ffedd5',
  cyan: '#0284c7',
  cyanSoft: '#e0f2fe',
  tealSoft: '#ccfbf1',

  success: '#10b981',
  successSoft: '#d1fae5',
  warning: '#f59e0b',
  warningSoft: '#fef3c7',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
  info: '#3b82f6',
  infoSoft: '#dbeafe',
};

export const DARK_THEME: ThemeColors = {
  isDark: true,
  bg: '#0f172a',
  card: '#1e293b',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  headerBg: '#0f172a',
  tabBarBg: '#0f172a',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',

  primary: '#0f766e',
  primaryDark: '#115e59',
  primaryLight: '#0d9488',
  accent: '#f97316',
  accentSoft: 'rgba(249, 115, 22, 0.2)',
  cyan: '#0284c7',
  cyanSoft: 'rgba(2, 132, 199, 0.2)',
  tealSoft: 'rgba(15, 118, 110, 0.2)',

  success: '#10b981',
  successSoft: 'rgba(16, 185, 129, 0.2)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.2)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.2)',
  info: '#3b82f6',
  infoSoft: 'rgba(59, 130, 246, 0.2)',
};

export const COLORS = LIGHT_THEME;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
