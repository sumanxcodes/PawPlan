import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  const { theme } = useTheme();
  
  return (
    <Ionicons 
      name={name} 
      size={size} 
      color={color || theme.text} 
      style={style}
    />
  );
}

// Tab bar icons with filled/outline variants
export const TabIcons = {
  today: { active: 'today', inactive: 'today-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  pets: { active: 'paw', inactive: 'paw-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
} as const;

// Common icons used throughout the app
export const AppIcons = {
  // Navigation
  back: 'chevron-back',
  forward: 'chevron-forward',
  close: 'close',
  menu: 'menu',
  
  // Actions
  add: 'add',
  edit: 'create-outline',
  delete: 'trash-outline',
  save: 'checkmark',
  share: 'share-outline',
  copy: 'copy-outline',
  
  // Status
  check: 'checkmark-circle',
  checkOutline: 'checkmark-circle-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  info: 'information-circle-outline',
  
  // Pets & Tasks
  paw: 'paw',
  food: 'restaurant-outline',
  medicine: 'medical-outline',
  walk: 'walk-outline',
  groom: 'cut-outline',
  
  // User & Settings
  user: 'person-outline',
  users: 'people-outline',
  settings: 'settings-outline',
  notification: 'notifications-outline',
  theme: 'contrast-outline',
  logout: 'log-out-outline',
  
  // Misc
  home: 'home-outline',
  time: 'time-outline',
  refresh: 'refresh',
  search: 'search',
  filter: 'filter',
  sort: 'swap-vertical-outline',
} as const;
