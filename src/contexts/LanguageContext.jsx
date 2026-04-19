import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n, { loadDynamicTranslations } from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { getDynamicTranslations } from '../utils/database';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const { t } = useTranslation();
    const [currentLanguage, setCurrentLanguageState] = useState(i18n.language || 'en');

    const interpolate = (text, params = {}) =>
        String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => params?.[key] ?? '');

    const tt = (key, fallbackOrParams, maybeParams) => {
        const hasFallback = typeof fallbackOrParams === 'string';
        const fallback = hasFallback ? fallbackOrParams : null;
        const params = hasFallback ? maybeParams : fallbackOrParams;

        const value = t(key, params);

        if (value && value !== key) return value;
        if (fallback) return interpolate(fallback, params);
        return value;
    };

    useEffect(() => {
        const initDynamicTranslations = async () => {
            await loadDynamicTranslations(getDynamicTranslations);
            // Trigger a re-render or state update if needed, 
            // though i18n.addResourceBundle usually handles it.
            // setCurrentLanguageState(i18n.language);
        };
        // initDynamicTranslations();
    }, []);

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        setCurrentLanguageState(langCode);
        localStorage.setItem('appLanguage', langCode);
    };

    const value = {
        currentLanguage,
        changeLanguage,
        t, // Expose t directly to support method overloading (e.g., returnObjects: true)
        tt
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
