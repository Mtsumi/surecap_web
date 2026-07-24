/** French labels for application / member statuses in admin UI. */

export function applicationStatusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Acceptée";
    case "rejected":
      return "Refusée";
    case "submitted":
      return "Soumise";
    case "collecting":
      return "En collecte";
    case "draft":
      return "Brouillon";
    default:
      return status;
  }
}

export function memberStatusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Soumis";
    case "invited":
      return "Invité (en attente)";
    case "draft":
      return "Brouillon";
    default:
      return status;
  }
}
