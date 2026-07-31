export type Locale = "en" | "fr";

export const messages = {
  en: {
    title: "Rental application",
    subtitle: "Please select a building and fill in the required fields.",
    stepBuilding: "Building",
    stepUnit: "Unit",
    stepPersonal: "Personal",
    stepAddresses: "Address",
    stepHousing: "Housing",
    stepReferences: "Income",
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
    leaseInNameHint:
      "We use this when contacting your current landlord for a reference.",
    housingStatus: "Current housing",
    housingRenting: "I am renting",
    housingOwnHome: "I own my home",
    housingOwnHomeHint:
      "You can skip landlord and lease details if you own your current home.",
    addressLivedHere: "Lived here",
    addressLivedFrom: "From",
    addressLivedTo: "To",
    stillAtCurrentAddress: "I still live at this address",
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
    guarantorRecommendedTitle: "Guarantor recommended (Quebec)",
    guarantorName: "Guarantor name",
    guarantorPhone: "Guarantor phone",
    includeGuarantor: "Add a guarantor",
    references: "Income",
    landlordPhone: "Current landlord phone",
    landlordName: "Current landlord name",
    previousLandlordPhone: "Previous landlord phone",
    previousLandlordName: "Previous landlord name",
    hrPhone: "HR / employer phone",
    hrName: "HR / employer contact name",
    referencesNote:
      "Tell us about your employment and upload proof of income. We may also call the references below.",
    incomeDocumentsTitle: "Proof of income",
    incomeDocumentsHint:
      "Upload a clear photo or PDF. Employed: three pay slips from the last 6 months. Self-employed: your most recent CRA notice of assessment.",
    employmentType: "Employment status",
    employmentEmployed: "Employed",
    employmentSelfEmployed: "Self-employed",
    employmentOther: "Other",
    monthlyNetIncome: "Monthly net income (after tax)",
    monthlyNetIncomeCad: "Canadian dollars (CAD)",
    incomePaySlip: "Pay slip (last 6 months)",
    incomePaySlip1: "Pay slip 1 (most recent)",
    incomePaySlip2: "Pay slip 2",
    incomePaySlip3: "Pay slip 3",
    incomeNoa: "CRA notice of assessment",
    incomeProof: "Proof of income",
    incomeUploadComplete: "Income document saved.",
    incomeUploadRequired: "Please upload your proof of income before continuing.",
    incomeReferencesHeading: "Employer reference",
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
    previousStep: "Previous step",
    back: "Back",
    submit: "Submit application",
    successTitle: "Application submitted",
    successBody:
      "Thank you. A confirmation email has been sent to you. We will contact you about next steps.",
    applicationId: "Reference",
    uploadDocumentsTitle: "Upload your ID",
    uploadDocumentsHint:
      "Take a clear photo of your ID. You can retake or remove a photo before continuing.",
    idDocumentType: "ID document type",
    idPassport: "Passport",
    idMedicare: "Canadian health insurance card",
    idDriverLicence: "Canadian driver's licence",
    idDriverLicenceHint:
      "Provincial driver's licence issued in Canada (e.g. Quebec SAAQ). Foreign licences are not accepted here — use passport instead.",
    idDriverLicenceFront: "Front of Canadian licence",
    idDriverLicenceBack: "Back of Canadian licence",
    uploadChooseFile: "Choose file",
    uploadReplaceFile: "Replace file",
    uploadRemoveFile: "Remove",
    uploadSuccess: "File uploaded successfully.",
    uploadSaved: "Uploaded",
    uploadFailed: "Upload failed. Please try again.",
    uploadedFiles: "Files on file",
    idUploadComplete: "Both sides of your licence are saved.",
    idUploadRequired: "Please upload your ID before submitting.",
    idUploadLaterHint:
      "Don't have your ID with you? Continue for now — come back on this phone/browser to take a photo before you submit.",
    idUploadCameraHint:
      "Use your phone camera to photograph your ID. Photos are compressed before upload.",
    idUploadImageOnly: "Please take a photo of your ID (images only).",
    idTakePhoto: "Take photo",
    idRetakePhoto: "Retake photo",
    idCropTitle: "Adjust your photo",
    idCropHint: "Drag to centre your ID in the square frame.",
    idCropUsePhoto: "Use this photo",
    idCropRetake: "Retake",
    idBlurryWarning:
      "This photo looks blurry. You can still continue, but a clearer photo helps verification.",
    draftRestoredBanner:
      "We restored your saved draft on this device. You can continue where you left off.",
    draftStartOver: "Start over",
    cancel: "Cancel",
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    langToggle: "Français",
    addressManualHint: "Start typing to search, or enter your address manually.",
    addressNotInCanada: "My current address is not in Canada",
    addressApartment: "Apartment / unit # (if applicable)",
    addressApartmentHint:
      "If you live in an apartment or condo, enter the unit number. Leave blank for a house.",
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
    validationInvalidPhone: "Please enter a valid phone number (Canada or international, e.g. +1…).",
    validationAddressDateRequired: "Please enter the dates you lived at this address.",
    validationInvalidAddressDateRange: "The end date must be on or after the start date.",
    validationAddressDateInFuture: "Address dates cannot be in the future.",
    validationAddressDatesChain:
      "Your previous address must end on or before you started living at your current address.",
    validationDateOfBirthInvalid: "Please enter a valid date of birth.",
    validationDateOfBirthUnderage: "Applicants must be at least 18 years old.",
    dateOfBirthHint: "You must be at least 18 years old.",
    validationGuarantorRequiredAbroad:
      "Because your address is outside Canada, a Quebec guarantor is recommended (not required). You can still submit without one for review.",
    guarantorQcAddressRecommended:
      "A Quebec address is recommended for guarantors (easier to enforce), but you can still submit if your guarantor lives elsewhere.",
    guarantorQcAddressNudge:
      "This address is outside Quebec. You can still submit — our team will review whether the guarantor is acceptable.",
    validationGuarantorAddressQuebec:
      "A Quebec guarantor address is recommended (not required). You can still submit for review.",
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
      "Veuillez s'il vous plaît choisir l'immeuble et le numéro d'appartement pour lequel vous appliquez et remplissez les champs requis.",
    stepBuilding: "Immeuble",
    stepUnit: "Logement",
    stepPersonal: "Personnel",
    stepAddresses: "Adresse",
    stepHousing: "Logement",
    stepReferences: "Revenu",
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
    leaseInNameHint:
      "Cela nous aide à joindre le bon locateur pour votre référence.",
    housingStatus: "Situation de logement actuelle",
    housingRenting: "Je suis locataire",
    housingOwnHome: "Je suis propriétaire",
    housingOwnHomeHint:
      "Vous pouvez omettre les renseignements sur le locateur et le bail si vous êtes propriétaire de votre domicile actuel.",
    addressLivedHere: "Habité ici",
    addressLivedFrom: "Du",
    addressLivedTo: "Au",
    stillAtCurrentAddress: "J'habite encore à cette adresse",
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
    guarantorRecommendedTitle: "Garant recommandé (Québec)",
    guarantorName: "Nom du garant",
    guarantorPhone: "Téléphone du garant",
    includeGuarantor: "Ajouter un garant",
    references: "Revenu",
    landlordPhone: "Téléphone du locateur actuel",
    landlordName: "Nom du locateur actuel",
    previousLandlordPhone: "Téléphone du locateur précédent",
    previousLandlordName: "Nom du locateur précédent",
    hrPhone: "Téléphone RH / employeur",
    hrName: "Nom du contact RH / employeur",
    referencesNote:
      "Indiquez votre situation d'emploi et téléversez une preuve de revenu. Nous pourrions aussi appeler les références ci-dessous.",
    incomeDocumentsTitle: "Preuve de revenu",
    incomeDocumentsHint:
      "Téléversez une photo ou un PDF lisible. Salarié : trois fiches de paie des 6 derniers mois. Travailleur autonome : votre avis de cotisation de l'ARC le plus récent.",
    employmentType: "Statut d'emploi",
    employmentEmployed: "Salarié",
    employmentSelfEmployed: "Travailleur autonome",
    employmentOther: "Autre",
    monthlyNetIncome: "Revenu net mensuel (après impôts)",
    monthlyNetIncomeCad: "Dollars canadiens (CAD)",
    incomePaySlip: "Fiche de paie (6 derniers mois)",
    incomePaySlip1: "Talon de paie 1 (le plus récent)",
    incomePaySlip2: "Talon de paie 2",
    incomePaySlip3: "Talon de paie 3",
    incomeNoa: "Avis de cotisation de l'ARC",
    incomeProof: "Preuve de revenu",
    incomeUploadComplete: "Document de revenu enregistré.",
    incomeUploadRequired: "Veuillez téléverser votre preuve de revenu avant de continuer.",
    incomeReferencesHeading: "Référence employeur",
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
    previousStep: "Étape précédente",
    back: "Retour",
    submit: "Soumettre la demande",
    successTitle: "Demande soumise",
    successBody:
      "Merci. Un courriel de confirmation vous a été envoyé. Nous vous contacterons pour la suite.",
    applicationId: "Référence",
    uploadDocumentsTitle: "Téléverser votre pièce d'identité",
    uploadDocumentsHint:
      "Prenez une photo lisible de votre pièce d'identité. Vous pouvez reprendre ou retirer une photo avant de continuer.",
    idDocumentType: "Type de pièce d'identité",
    idPassport: "Passeport",
    idMedicare: "Carte d'assurance-maladie canadienne",
    idDriverLicence: "Permis de conduire canadien",
    idDriverLicenceHint:
      "Permis de conduire provincial délivré au Canada (p. ex. permis SAAQ du Québec). Les permis étrangers ne sont pas acceptés ici — choisissez passeport.",
    idDriverLicenceFront: "Recto du permis canadien",
    idDriverLicenceBack: "Verso du permis canadien",
    uploadChooseFile: "Choisir un fichier",
    uploadReplaceFile: "Remplacer le fichier",
    uploadRemoveFile: "Retirer",
    uploadSuccess: "Fichier téléversé avec succès.",
    uploadSaved: "Téléversé",
    uploadFailed: "Échec du téléversement. Veuillez réessayer.",
    uploadedFiles: "Fichiers enregistrés",
    idUploadComplete: "Les deux côtés de votre permis sont enregistrés.",
    idUploadRequired:
      "Veuillez téléverser votre pièce d'identité avant d'envoyer la demande.",
    idUploadLaterHint:
      "Pas de pièce d'identité sous la main? Continuez — revenez sur ce téléphone/navigateur pour prendre une photo avant d'envoyer.",
    idUploadCameraHint:
      "Utilisez l'appareil photo pour photographier votre pièce d'identité. Les photos sont compressées avant l'envoi.",
    idUploadImageOnly:
      "Veuillez prendre une photo de votre pièce d'identité (images seulement).",
    idTakePhoto: "Prendre une photo",
    idRetakePhoto: "Reprendre la photo",
    idCropTitle: "Ajustez votre photo",
    idCropHint: "Faites glisser pour centrer votre pièce d'identité dans le cadre carré.",
    idCropUsePhoto: "Utiliser cette photo",
    idCropRetake: "Reprendre",
    idBlurryWarning:
      "Cette photo semble floue. Vous pouvez continuer, mais une photo plus nette facilite la vérification.",
    draftRestoredBanner:
      "Nous avons restauré votre brouillon enregistré sur cet appareil. Vous pouvez reprendre où vous étiez.",
    draftStartOver: "Recommencer",
    cancel: "Annuler",
    loading: "Chargement…",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    langToggle: "English",
    addressManualHint:
      "Commencez à taper pour rechercher, ou entrez l'adresse manuellement.",
    addressNotInCanada: "Mon adresse actuelle n'est pas au Canada",
    addressApartment: "Appartement / no d'unité (si applicable)",
    addressApartmentHint:
      "Si vous habitez un appartement ou un condo, inscrivez le numéro d'unité. Laissez vide pour une maison.",
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
      "Veuillez entrer un numéro de téléphone valide (Canada ou international, ex. +1…).",
    validationAddressDateRequired:
      "Veuillez indiquer les dates auxquelles vous avez habité à cette adresse.",
    validationInvalidAddressDateRange:
      "La date de fin doit être égale ou postérieure à la date de début.",
    validationAddressDateInFuture:
      "Les dates d'adresse ne peuvent pas être dans le futur.",
    validationAddressDatesChain:
      "Votre adresse précédente doit se terminer au plus tard à la date de début de votre adresse actuelle.",
    validationDateOfBirthInvalid: "Veuillez entrer une date de naissance valide.",
    validationDateOfBirthUnderage: "Les demandeurs doivent avoir au moins 18 ans.",
    dateOfBirthHint: "Vous devez avoir au moins 18 ans.",
    validationGuarantorRequiredAbroad:
      "Comme votre adresse est hors du Canada, un garant au Québec est recommandé (pas obligatoire). Vous pouvez quand même envoyer la demande pour révision.",
    guarantorQcAddressRecommended:
      "Une adresse au Québec est recommandée pour les garants (poursuites plus simples), mais vous pouvez soumettre si le garant habite ailleurs.",
    guarantorQcAddressNudge:
      "Cette adresse est hors du Québec. Vous pouvez quand même soumettre — notre équipe évaluera si le garant est acceptable.",
    validationGuarantorAddressQuebec:
      "Une adresse de garant au Québec est recommandée (pas obligatoire). Vous pouvez soumettre pour révision.",
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
