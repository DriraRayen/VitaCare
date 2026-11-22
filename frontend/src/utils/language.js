import { createContext, useContext } from "react";

export const LanguageContext = createContext("fr");
export const languages = [
   { value: "fr", label: "Français" },
   { value: "en", label: "English" },
   { value: "ar", label: "العربية" },
];

export function useLanguage() {
   const language = useContext(LanguageContext);
   return { language, t: (fr, en, ar) => ({ fr, en, ar }[language] || fr) };
}
