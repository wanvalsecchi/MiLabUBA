import { useEffect } from 'react';
import { safeStorage } from '../storage';

export default function ThemeToggle() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    safeStorage.setItem('milabuba_theme', 'light');
  }, []);

  return null;
}
