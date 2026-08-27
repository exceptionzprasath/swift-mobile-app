import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type IconName =
  | 'home'
  | 'clock'
  | 'payroll'
  | 'leaves'
  | 'apps'
  | 'bell'
  | 'user'
  | 'camera'
  | 'check'
  | 'cross'
  | 'info'
  | 'document'
  | 'upload'
  | 'download'
  | 'task'
  | 'chat'
  | 'bot'
  | 'holiday'
  | 'location'
  | 'sun'
  | 'moon'
  | 'chevron-right'
  | 'chevron-left'
  | 'send'
  | 'sparkles'
  | 'shield'
  | 'calendar'
  | 'filter'
  | 'menu'
  | 'loan'
  | 'wallet'
  | 'history'
  | 'help'
  | 'logout'
  | 'coffee'
  | 'alert-circle'
  | 'lock';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = '#0f766e' }: IconProps) {
  // Pure vector shape representations for all UI components
  switch (name) {
    case 'home':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size / 2.2, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
          <View style={{ width: size * 0.7, height: size * 0.5, backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
        </View>
      );

    case 'clock':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: size * 0.2, width: 2, height: size * 0.35, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', left: size * 0.45, width: size * 0.3, height: 2, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'payroll':
      return (
        <View style={{ width: size * 1.1, height: size * 0.75, borderRadius: 4, borderWidth: 2, borderColor: color, padding: 2, justifyContent: 'space-between' }}>
          <View style={{ height: 3, backgroundColor: color, width: '100%' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'leaves':
    case 'calendar':
      return (
        <View style={{ width: size, height: size, borderRadius: 3, borderWidth: 2, borderColor: color, overflow: 'hidden' }}>
          <View style={{ height: 4, backgroundColor: color }} />
          <View style={{ flex: 1, padding: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'apps':
      return (
        <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: 2, backgroundColor: color }} />
        </View>
      );

    case 'bell':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.65, height: size * 0.65, borderTopLeftRadius: size * 0.35, borderTopRightRadius: size * 0.35, borderWidth: 2, borderColor: color, borderBottomWidth: 0 }} />
          <View style={{ width: size * 0.85, height: 2, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 4, height: 3, backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, marginTop: 1 }} />
        </View>
      );

    case 'user':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, borderWidth: 2, borderColor: color }} />
          <View style={{ width: size * 0.75, height: size * 0.35, borderTopLeftRadius: size * 0.4, borderTopRightRadius: size * 0.4, borderWidth: 2, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
        </View>
      );

    case 'camera':
      return (
        <View style={{ width: size * 1.1, height: size * 0.8, borderRadius: 4, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, borderWidth: 1.5, borderColor: color }} />
        </View>
      );

    case 'check':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: size * 0.85, fontWeight: '900', marginTop: -2 }}>✓</Text>
        </View>
      );

    case 'cross':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: size * 0.8, fontWeight: '900' }}>✕</Text>
        </View>
      );

    case 'info':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color, fontSize: size * 0.65, fontWeight: '900' }}>i</Text>
        </View>
      );

    case 'document':
      return (
        <View style={{ width: size * 0.75, height: size, borderRadius: 3, borderWidth: 2, borderColor: color, padding: 2, justifyContent: 'space-around' }}>
          <View style={{ height: 2, backgroundColor: color, width: '70%' }} />
          <View style={{ height: 2, backgroundColor: color, width: '90%' }} />
          <View style={{ height: 2, backgroundColor: color, width: '50%' }} />
        </View>
      );

    case 'upload':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
          <View style={{ width: 2, height: size * 0.4, backgroundColor: color }} />
          <View style={{ width: size * 0.7, height: 2, backgroundColor: color, marginTop: 2 }} />
        </View>
      );

    case 'download':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.7, height: 2, backgroundColor: color, marginBottom: 2 }} />
          <View style={{ width: 2, height: size * 0.4, backgroundColor: color }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
        </View>
      );

    case 'task':
      return (
        <View style={{ width: size * 0.8, height: size, borderRadius: 3, borderWidth: 2, borderColor: color, padding: 2, justifyContent: 'space-around' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: color, flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ height: 2, backgroundColor: color, flex: 1 }} />
          </View>
        </View>
      );

    case 'chat':
      return (
        <View style={{ width: size * 1.1, height: size * 0.8, borderRadius: size * 0.3, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'bot':
      return (
        <View style={{ width: size * 1.1, height: size * 0.9, borderRadius: 6, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 2 }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
          </View>
          <View style={{ width: size * 0.5, height: 2, backgroundColor: color }} />
        </View>
      );

    case 'holiday':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: size * 0.9, fontWeight: '900' }}>★</Text>
        </View>
      );

    case 'location':
      return (
        <View style={{ width: size, height: size, alignItems: 'center' }}>
          <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, borderWidth: 2, borderColor: color }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.25, borderRightWidth: size * 0.25, borderTopWidth: size * 0.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, marginTop: -2 }} />
        </View>
      );

    case 'sun':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: color }} />
        </View>
      );

    case 'moon':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, overflow: 'hidden' }}>
          <View style={{ width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, backgroundColor: '#ffffff', position: 'absolute', top: -1, right: -1 }} />
        </View>
      );

    case 'chevron-right':
      return (
        <Text style={{ color, fontSize: size, fontWeight: '800' }}>›</Text>
      );

    case 'chevron-left':
      return (
        <Text style={{ color, fontSize: size, fontWeight: '800' }}>‹</Text>
      );

    case 'send':
      return (
        <Text style={{ color, fontSize: size * 0.8, fontWeight: '900' }}>➔</Text>
      );

    case 'menu':
      return (
        <View style={{ width: size, height: size, justifyContent: 'space-around', paddingVertical: 2 }}>
          <View style={{ width: size, height: 2.2, backgroundColor: color, borderRadius: 1.5 }} />
          <View style={{ width: size * 0.75, height: 2.2, backgroundColor: color, borderRadius: 1.5 }} />
          <View style={{ width: size, height: 2.2, backgroundColor: color, borderRadius: 1.5 }} />
        </View>
      );

    case 'loan':
    case 'wallet':
      return (
        <View style={{ width: size * 1.1, height: size * 0.8, borderRadius: 4, borderWidth: 1.8, borderColor: color, justifyContent: 'center', paddingHorizontal: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, alignSelf: 'flex-end', marginRight: 2 }} />
        </View>
      );

    case 'history':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.8, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 1.8, height: size * 0.35, backgroundColor: color, position: 'absolute', top: size * 0.2 }} />
          <View style={{ width: size * 0.28, height: 1.8, backgroundColor: color, position: 'absolute', right: size * 0.25 }} />
        </View>
      );

    case 'help':
    case 'alert-circle':
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.8, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color, fontSize: size * 0.7, fontWeight: '900', marginTop: -2 }}>!</Text>
        </View>
      );

    case 'coffee':
      return (
        <View style={{ width: size, height: size * 0.8, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, borderWidth: 1.8, borderColor: color, marginTop: size * 0.1 }}>
          <View style={{ width: 4, height: 6, borderTopRightRadius: 3, borderBottomRightRadius: 3, borderWidth: 1.5, borderColor: color, position: 'absolute', right: -6, top: 1 }} />
        </View>
      );

    case 'logout':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color, fontSize: size * 0.85, fontWeight: '800' }}>⎋</Text>
        </View>
      );

    case 'lock':
      return (
        <View style={{ width: size * 0.8, height: size * 0.9, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: size * 0.5, height: size * 0.45, borderTopLeftRadius: size * 0.25, borderTopRightRadius: size * 0.25, borderWidth: 1.8, borderColor: color, borderBottomWidth: 0, marginBottom: -1 }} />
          <View style={{ width: size * 0.75, height: size * 0.5, backgroundColor: color, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 2, height: 4, backgroundColor: '#fff', borderRadius: 1 }} />
          </View>
        </View>
      );

    default:
      return (
        <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 2 }} />
      );
  }
}
