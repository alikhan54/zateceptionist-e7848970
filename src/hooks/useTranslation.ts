// useTranslation.ts — Provides bilingual labels for RE pages
// Returns English by default, Arabic when region is RTL
// Non-RE pages never import this

import { useCallback } from 'react';
import { useRTL } from '@/hooks/useRTL';
import arTranslations from '@/locales/ar.json';

export function useTranslation() {
  const { isRTL, lang } = useRTL();

  const t = useCallback((key: string, fallback?: string): string => {
    if (!isRTL || lang !== 'ar') {
      return fallback || key.split('.').pop() || key;
    }

    // Navigate the nested translation object
    const keys = key.split('.');
    let value: any = arTranslations;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return fallback || key.split('.').pop() || key;
    }
    return typeof value === 'string' ? value : fallback || key;
  }, [isRTL, lang]);

  // Bilingual helper — returns both EN and AR labels
  const bilingual = useCallback((enLabel: string, arKey: string): { en: string; ar: string } => {
    return {
      en: enLabel,
      ar: isRTL ? t(arKey, enLabel) : enLabel
    };
  }, [isRTL, t]);

  return { t, bilingual, isRTL, lang };
}
