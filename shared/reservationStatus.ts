export const RESERVATION_BLOCKING_STATUSES = ["pendente", "ativa"] as const;

export function isReservationBlockingAvailability(status: string) {
  return RESERVATION_BLOCKING_STATUSES.includes(
    status as (typeof RESERVATION_BLOCKING_STATUSES)[number]
  );
}
