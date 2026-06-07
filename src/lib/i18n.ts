export type Locale = "en" | "fr";

export const messages = {
  en: {
    title: "Rental application",
    subtitle: "Select the building and apartment you are applying for.",
    selectBuilding: "Choose a building",
    selectUnit: "Choose an apartment",
    confirm: "Confirm your selection",
    building: "Building",
    unit: "Apartment",
    rent: "Rent",
    available: "Available",
    perMonth: "/mo",
    continue: "Continue",
    back: "Back",
    submit: "Start application",
    successTitle: "Application started",
    successBody:
      "Your draft application has been saved. We will contact you with the next steps.",
    applicationId: "Reference",
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    langToggle: "Français",
  },
  fr: {
    title: "Demande de location",
    subtitle: "Sélectionnez l'immeuble et le logement pour votre demande.",
    selectBuilding: "Choisir un immeuble",
    selectUnit: "Choisir un appartement",
    confirm: "Confirmer votre sélection",
    building: "Immeuble",
    unit: "Appartement",
    rent: "Loyer",
    available: "Disponible",
    perMonth: "/mois",
    continue: "Continuer",
    back: "Retour",
    submit: "Commencer la demande",
    successTitle: "Demande enregistrée",
    successBody:
      "Votre demande préliminaire a été enregistrée. Nous vous contacterons pour la suite.",
    applicationId: "Référence",
    loading: "Chargement…",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    langToggle: "English",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("fr")) return "fr";
  return "fr";
}

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
