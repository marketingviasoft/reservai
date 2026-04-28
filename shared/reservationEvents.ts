export const RESERVATION_EVENT_TYPE_LABELS: Record<string, string> = {
  reservation_created: "Reserva criada",
  reservation_updated: "Reserva atualizada",
  reservation_cancelled: "Reserva cancelada",
  reservation_checked_out: "Check-out realizado",
  reservation_checked_in: "Check-in realizado",
};

export function hasReservationEvents(events: readonly unknown[] | null | undefined) {
  return (events?.length ?? 0) > 0;
}

export function buildReservationEventDescription(input: {
  eventType: string;
  actor: string;
  formattedDate: string;
}) {
  const { eventType, actor, formattedDate } = input;
  switch (eventType) {
    case "reservation_created":
      return `Reserva criada por ${actor} em ${formattedDate}.`;
    case "reservation_updated":
      return `Reserva atualizada por ${actor} em ${formattedDate}.`;
    case "reservation_cancelled":
      return `Reserva cancelada por ${actor} em ${formattedDate}.`;
    case "reservation_checked_out":
      return `Check-out realizado por ${actor} em ${formattedDate}.`;
    case "reservation_checked_in":
      return `Check-in realizado por ${actor} em ${formattedDate}.`;
    default:
      return `${RESERVATION_EVENT_TYPE_LABELS[eventType] || "Evento registrado"} por ${actor} em ${formattedDate}.`;
  }
}
