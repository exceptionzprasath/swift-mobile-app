import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
  | 'chevron-down'
  | 'chevron-up'
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
  | 'lock'
  | 'hourglass-split'
  | 'receipt-cutoff'
  | 'receipt';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = '#0f766e' }: IconProps) {
  // Pure vector shape representations for all UI components
  switch (name) {
    case 'receipt-cutoff':
    case 'receipt':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M3 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5M11.5 4a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z" />
          <Path d="M2.354.646a.5.5 0 0 0-.801.13l-.5 1A.5.5 0 0 0 1 2v13H.5a.5.5 0 0 0 0 1h15a.5.5 0 0 0 0-1H15V2a.5.5 0 0 0-.053-.224l-.5-1a.5.5 0 0 0-.8-.13L13 1.293l-.646-.647a.5.5 0 0 0-.708 0L11 1.293l-.646-.647a.5.5 0 0 0-.708 0L9 1.293 8.354.646a.5.5 0 0 0-.708 0L7 1.293 6.354.646a.5.5 0 0 0-.708 0L5 1.293 4.354.646a.5.5 0 0 0-.708 0L3 1.293zm-.217 1.198.51.51a.5.5 0 0 0 .707 0L4 1.707l.646.647a.5.5 0 0 0 .708 0L6 1.707l.646.647a.5.5 0 0 0 .708 0L8 1.707l.646.647a.5.5 0 0 0 .708 0L10 1.707l.646.647a.5.5 0 0 0 .708 0L12 1.707l.646.647a.5.5 0 0 0 .708 0l.509-.51.137.274V15H2V2.118z" />
        </Svg>
      );

    case 'hourglass-split':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z" />
        </Svg>
      );

    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z" />
          <Path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z" />
        </Svg>
      );

    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z" />
        </Svg>
      );

    case 'payroll':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z" />
          <Path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
        </Svg>
      );

    case 'leaves':
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 448 512" fill={color}>
          <Path d="M12 192h424c6.6 0 12 5.4 12 12v260c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V204c0-6.6 5.4-12 12-12zm436-44v-20c0-26.5-21.5-48-48-48h-48V32c0-17.7-14.3-32-32-32s-32 14.3-32 32v48H160V32c0-17.7-14.3-32-32-32S96 14.3 96 32v48H48C21.5 80 0 101.5 0 128v20c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12z" />
        </Svg>
      );

    case 'apps':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" fill={color}>
          <Path d="M64 384h384v-64H64v64zm0-128h384v-64H64v64zm0-192v64h384V64H64z" />
        </Svg>
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
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5" />
          <Path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
        </Svg>
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
        <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
          <Path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
          <Path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z" />
        </Svg>
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

    case 'chevron-down':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -size * 0.15,
            }}
          />
        </View>
      );

    case 'chevron-up':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: size * 0.15,
            }}
          />
        </View>
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
