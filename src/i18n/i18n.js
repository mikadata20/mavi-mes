import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

// Initialize i18next with static translations
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: translations.en },
            id: { translation: translations.id },
            ja: { translation: translations.ja }
        },
        lng: localStorage.getItem('appLanguage') || 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

// Function to load and merge dynamic translations
export const loadDynamicTranslations = async (getDynamicTranslations) => {
    try {
        const dynamicData = await getDynamicTranslations();
        if (dynamicData && dynamicData.length > 0) {
            const resources = { en: {}, id: {}, ja: {} };

            dynamicData.forEach(item => {
                if (item.en) resources.en[item.key] = item.en;
                if (item.id) resources.id[item.key] = item.id;
                if (item.ja) resources.ja[item.key] = item.ja;
            });

            // Deep merge or add to i18n
            Object.keys(resources).forEach(lang => {
                i18n.addResourceBundle(lang, 'translation', resources[lang], true, true);
            });
        }
    } catch (error) {
        console.error('Failed to load dynamic translations:', error);
    }
};

export default i18n;
