export type ReservationVisibilityUser = {
  id: number;
  role: "user" | "admin";
};

export type ReservationVisibilityRecord = {
  userId: number;
};

export function canViewReservationInOperationalViews(
  user: ReservationVisibilityUser,
  reservation: ReservationVisibilityRecord
) {
  return user.role === "admin" || reservation.userId === user.id;
}

export function isCheckoutEligibleStatus(status: string) {
  return status === "pendente";
}

export function isCheckinEligibleStatus(status: string) {
  return status === "ativa";
}

export function isOperationalHistoryStatus(status: string) {
  return status === "concluida";
}

export function emptyDashboardStats() {
  return {
    totalItems: 0,
    availableItems: 0,
    lentItems: 0,
    maintenanceItems: 0,
    lostItems: 0,
    totalKits: 0,
    totalUsers: 0,
    activeReservations: 0,
    pendingReservations: 0,
    completedReservations: 0,
    canceledReservations: 0,
    overdueReservations: 0,
  };
}

export function buildDashboardStatsFromCounts(input: Partial<ReturnType<typeof emptyDashboardStats>>) {
  return {
    ...emptyDashboardStats(),
    ...input,
  };
}
