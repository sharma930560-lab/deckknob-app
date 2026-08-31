import React from 'react';
import { Home, Search, PlusSquare, Play, User } from 'lucide-react-native';

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  search: Search,
  'plus-square': PlusSquare,
  play: Play,
  user: User,
};

interface TabBarIconProps {
  name: string;
  color: string;
  size: number;
}

export default function TabBarIcon({ name, color, size }: TabBarIconProps) {
  const Icon = ICON_MAP[name] || User;
  return <Icon color={color} size={size} strokeWidth={1.5} />;
}
