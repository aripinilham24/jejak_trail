import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import { en } from "./locales/en"
import { id } from "./locales/id"

export const defaultNS = "translation"

export const resources = {
  id: { translation: id },
  en: { translation: en },
} as const

export type AppLanguage = keyof typeof resources

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "id",
    supportedLngs: ["id", "en"],
    defaultNS,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "jejak-trail-language",
      caches: ["localStorage"],
    },
  })

export default i18n
