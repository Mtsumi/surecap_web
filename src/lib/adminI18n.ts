import type { Locale } from "./i18n";

/** Admin UI copy — French is the default product language; English for dev/ops toggle. */
export const adminMessages = {
  fr: {
    brand: "SureCap Admin",
    loading: "Chargement…",
    logout: "Déconnexion",
    langToggle: "English",
    navApplications: "Demandes",
    navBuildings: "Immeubles",
    navTeam: "Équipe",
    navAccount: "Mon compte",
    loginTitle: "SureCap Admin",
    loginSubtitle: "Connexion administrateur",
    loginEmail: "Courriel",
    loginPassword: "Mot de passe",
    loginSubmit: "Se connecter",
    loginSubmitting: "Connexion…",
    loginError: "Erreur de connexion",
    accountTitle: "Mon compte",
    accountSubtitle: "Modifier votre mot de passe",
    accountRequiredBanner:
      "Vous devez changer votre mot de passe avant de continuer.",
    accountCurrentPassword: "Mot de passe actuel",
    accountNewPassword: "Nouveau mot de passe",
    accountConfirmPassword: "Confirmer le nouveau mot de passe",
    accountSubmit: "Enregistrer le mot de passe",
    accountSubmitting: "Enregistrement…",
    accountSuccess: "Mot de passe mis à jour.",
    accountMismatch: "Les nouveaux mots de passe ne correspondent pas.",
    accountTooShort: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    accountGenericError: "Impossible de mettre à jour le mot de passe.",
  },
  en: {
    brand: "SureCap Admin",
    loading: "Loading…",
    logout: "Log out",
    langToggle: "Français",
    navApplications: "Applications",
    navBuildings: "Buildings",
    navTeam: "Team",
    navAccount: "My account",
    loginTitle: "SureCap Admin",
    loginSubtitle: "Administrator sign-in",
    loginEmail: "Email",
    loginPassword: "Password",
    loginSubmit: "Sign in",
    loginSubmitting: "Signing in…",
    loginError: "Sign-in failed",
    accountTitle: "My account",
    accountSubtitle: "Change your password",
    accountRequiredBanner: "You must change your password before continuing.",
    accountCurrentPassword: "Current password",
    accountNewPassword: "New password",
    accountConfirmPassword: "Confirm new password",
    accountSubmit: "Save password",
    accountSubmitting: "Saving…",
    accountSuccess: "Password updated.",
    accountMismatch: "New passwords do not match.",
    accountTooShort: "New password must be at least 8 characters.",
    accountGenericError: "Could not update password.",
  },
} as const;

export type AdminMessageKey = keyof (typeof adminMessages)["en"];

export function adminT(locale: Locale, key: AdminMessageKey): string {
  return adminMessages[locale][key];
}
