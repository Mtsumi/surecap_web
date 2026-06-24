export type Locale = "en" | "fr";

export const messages = {
  en: {
    title: "Rental application",
    subtitle: "Pick a building, then complete your application for Montreal Living.",
    stepBuilding: "Building",
    stepUnit: "Unit",
    stepPersonal: "Personal",
    stepAddresses: "Address",
    stepHousing: "Housing",
    stepReferences: "References",
    stepOther: "Other",
    stepReview: "Review",
    noBuildings: "No apartments are available right now. Please check back soon.",
    selectBuilding: "Choose a building",
    selectUnit: "Choose an apartment",
    personalInfo: "Personal information",
    givenName: "Given name",
    familyName: "Family name",
    dateOfBirth: "Date of birth",
    email: "Email",
    phone: "Phone",
    addresses: "Address history",
    currentAddress: "Current address",
    previousAddress: "Previous address (optional)",
    housing: "Housing details",
    leaseInName: "Is the lease in your name?",
    yes: "Yes",
    no: "No",
    moveInDate: "Desired move-in date",
    rentingWithOthers: "Renting with someone else?",
    coTenantNames: "Co-tenant name(s) — same spelling as on their application",
    roommateName: "Roommate name",
    roommateEmail: "Roommate email",
    addRoommate: "Add another roommate",
    removeRoommate: "Remove",
    guarantorOptional: "Guarantor (optional)",
    guarantorName: "Guarantor name",
    guarantorPhone: "Guarantor phone",
    includeGuarantor: "Add a guarantor",
    references: "References",
    landlordPhone: "Current landlord phone",
    landlordName: "Current landlord name",
    hrPhone: "HR / employer phone",
    hrName: "HR / employer contact name",
    referencesNote: "We may call these references.",
    otherInfo: "Additional information",
    referralSource:
      "How did you learn about Montreal Living and this apartment?",
    facebookUrl: "Facebook profile (optional)",
    linkedinUrl: "LinkedIn profile (optional)",
    review: "Review and submit",
    yourSelection: "Your selection",
    reviewNote:
      "We may call your landlord and employer for references. A confirmation email will be sent to you.",
    building: "Building",
    unit: "Apartment",
    rent: "Rent",
    available: "Available",
    perMonth: "/mo",
    continue: "Continue",
    back: "Back",
    submit: "Submit application",
    successTitle: "Application submitted",
    successBody:
      "Thank you. A confirmation email has been sent to you. We will contact you about next steps.",
    applicationId: "Reference",
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    langToggle: "Français",
    addressManualHint: "Start typing to search, or enter your address manually.",
    validationMoveInTooSoon: "Move-in date must be tomorrow or later.",
    validationMoveInBeforeAvailable:
      "Move-in date cannot be before the unit is available.",
    moveInHintImmediate:
      "Available immediately. Earliest move-in date is tomorrow.",
    moveInHintAvailableFrom:
      "Available from {date}. Move-in cannot be earlier than that date.",
    validationInvalidEmail: "Please enter a valid email address.",
    validationDuplicateEmail: "Each person must have a different email address.",
    validationLandlordHrSamePhone:
      "Landlord and employer phone numbers must be different.",
    validationInvalidPhone: "Please enter a valid phone number (digits only).",
    inviteTitleRoommate: "Co-tenant application",
    inviteTitleGuarantor: "Guarantor section",
    inviteSubtitle:
      "{primary} applied for {building}, unit {unit}. Complete your section below.",
    inviteExpired: "This invite link is invalid or has expired.",
    inviteAlreadySubmitted: "You have already submitted this section.",
    inviteSuccessTitle: "Section submitted",
    inviteSuccessBody:
      "Thank you. A confirmation email has been sent to you.",
    validationInviteEmailMismatch:
      "Email must match the address that received the invitation.",
    fieldRequired: "This field is required.",
  },
  fr: {
    title: "Demande de location",
    subtitle:
      "Choisissez un immeuble, puis complétez votre demande pour Montreal Living.",
    stepBuilding: "Immeuble",
    stepUnit: "Logement",
    stepPersonal: "Personnel",
    stepAddresses: "Adresse",
    stepHousing: "Logement",
    stepReferences: "Références",
    stepOther: "Autre",
    stepReview: "Révision",
    noBuildings:
      "Aucun logement disponible pour le moment. Revenez un peu plus tard.",
    selectBuilding: "Choisir un immeuble",
    selectUnit: "Choisir un appartement",
    personalInfo: "Renseignements personnels",
    givenName: "Prénom",
    familyName: "Nom de famille",
    dateOfBirth: "Date de naissance",
    email: "Courriel",
    phone: "Téléphone",
    addresses: "Historique d'adresses",
    currentAddress: "Adresse actuelle",
    previousAddress: "Adresse précédente (facultatif)",
    housing: "Détails du logement",
    leaseInName: "Le bail est-il à votre nom?",
    yes: "Oui",
    no: "Non",
    moveInDate: "Date d'emménagement souhaitée",
    rentingWithOthers: "Louez-vous avec une autre personne?",
    coTenantNames:
      "Nom(s) du colocataire — même orthographe que sur sa demande",
    roommateName: "Nom du colocataire",
    roommateEmail: "Courriel du colocataire",
    addRoommate: "Ajouter un colocataire",
    removeRoommate: "Retirer",
    guarantorOptional: "Garant (facultatif)",
    guarantorName: "Nom du garant",
    guarantorPhone: "Téléphone du garant",
    includeGuarantor: "Ajouter un garant",
    references: "Références",
    landlordPhone: "Téléphone du locateur actuel",
    landlordName: "Nom du locateur actuel",
    hrPhone: "Téléphone RH / employeur",
    hrName: "Nom du contact RH / employeur",
    referencesNote: "Nous pourrions appeler ces références.",
    otherInfo: "Informations supplémentaires",
    referralSource:
      "Comment avez-vous entendu parler de Montreal Living et de cet appartement?",
    facebookUrl: "Profil Facebook (facultatif)",
    linkedinUrl: "Profil LinkedIn (facultatif)",
    review: "Révision et soumission",
    yourSelection: "Votre sélection",
    reviewNote:
      "Nous pourrions appeler votre locateur et votre employeur. Un courriel de confirmation vous sera envoyé.",
    building: "Immeuble",
    unit: "Appartement",
    rent: "Loyer",
    available: "Disponible",
    perMonth: "/mois",
    continue: "Continuer",
    back: "Retour",
    submit: "Soumettre la demande",
    successTitle: "Demande soumise",
    successBody:
      "Merci. Un courriel de confirmation vous a été envoyé. Nous vous contacterons pour la suite.",
    applicationId: "Référence",
    loading: "Chargement…",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    langToggle: "English",
    addressManualHint:
      "Commencez à taper pour rechercher, ou entrez l'adresse manuellement.",
    validationMoveInTooSoon:
      "La date d'emménagement doit être demain ou plus tard.",
    validationMoveInBeforeAvailable:
      "La date d'emménagement ne peut pas précéder la disponibilité du logement.",
    moveInHintImmediate:
      "Disponible immédiatement. La première date d'emménagement possible est demain.",
    moveInHintAvailableFrom:
      "Disponible à partir du {date}. L'emménagement ne peut pas être plus tôt.",
    validationInvalidEmail: "Veuillez entrer une adresse courriel valide.",
    validationDuplicateEmail:
      "Chaque personne doit avoir une adresse courriel différente.",
    validationLandlordHrSamePhone:
      "Les numéros du locateur et de l'employeur doivent être différents.",
    validationInvalidPhone:
      "Veuillez entrer un numéro de téléphone valide (chiffres seulement).",
    inviteTitleRoommate: "Demande de colocation",
    inviteTitleGuarantor: "Section garant",
    inviteSubtitle:
      "{primary} a fait une demande pour {building}, logement {unit}. Complétez votre section ci-dessous.",
    inviteExpired: "Ce lien d'invitation est invalide ou expiré.",
    inviteAlreadySubmitted: "Vous avez déjà soumis cette section.",
    inviteSuccessTitle: "Section soumise",
    inviteSuccessBody:
      "Merci. Un courriel de confirmation vous a été envoyé.",
    validationInviteEmailMismatch:
      "Le courriel doit correspondre à celui qui a reçu l'invitation.",
    fieldRequired: "Ce champ est obligatoire.",
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
