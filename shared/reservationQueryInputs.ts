export type AvailabilityDates = {
  startDate: number;
  endDate: number;
} | null;

export function buildAvailabilityQueryInput(availabilityDates: AvailabilityDates) {
  return availabilityDates ?? { startDate: 0, endDate: 0 };
}

export function shouldEnableAvailabilityQuery(
  availabilityDates: AvailabilityDates,
  dialogOpen: boolean
) {
  return Boolean(availabilityDates && dialogOpen);
}

export function buildReservationDetailQueryInput(detailId: number | null) {
  return { id: detailId ?? 0 };
}

export function buildReservationEventsQueryInput(detailId: number | null) {
  return { reservationId: detailId ?? 0 };
}
