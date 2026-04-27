import { TRPCError } from "@trpc/server";

type ReservationActor = {
  id: number;
  role: "admin" | "user" | string | null;
};

type ReservationOwner = {
  userId: number | null;
};

export function assertReservationOwnerOrAdmin(actor: ReservationActor, reservation: ReservationOwner) {
  if (actor.role === "admin") return;

  if (reservation.userId !== actor.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Voce so pode alterar reservas vinculadas ao seu usuario.",
    });
  }
}

export function assertAdminReservationOperator(actor: ReservationActor) {
  if (actor.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem operar check-in e check-out.",
    });
  }
}
