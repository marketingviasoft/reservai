import { TRPCError } from "@trpc/server";

type ReservationActor = {
  id: number;
  role: "admin" | "user" | string | null;
};

type ReservationOwner = {
  userId: number | null;
};

type ReservationStatus = "pendente" | "ativa" | "concluida" | "cancelada" | string;

type ReservationState = ReservationOwner & {
  status: ReservationStatus;
};

function isAdmin(actor: ReservationActor) {
  return actor.role === "admin";
}

export function assertReservationOwnerOrAdmin(actor: ReservationActor, reservation: ReservationOwner) {
  if (isAdmin(actor)) return;

  if (reservation.userId !== actor.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Voce so pode acessar reservas vinculadas ao seu usuario.",
    });
  }
}

export function assertAdminReservationOperator(actor: ReservationActor) {
  if (!isAdmin(actor)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem operar check-in e check-out.",
    });
  }
}

export function canCancelReservation(actor: ReservationActor, reservation: ReservationState) {
  return (isAdmin(actor) || reservation.userId === actor.id) && reservation.status === "pendente";
}

export function assertCanCancelReservation(actor: ReservationActor, reservation: ReservationState) {
  assertReservationOwnerOrAdmin(actor, reservation);

  if (canCancelReservation(actor, reservation)) return;

  const message = reservation.status === "ativa"
    ? "Reservas ativas devem ser encerradas via check-in."
    : "Apenas reservas pendentes podem ser canceladas.";

  throw new TRPCError({
    code: "FORBIDDEN",
    message,
  });
}

export function assertCanUpdateReservation(actor: ReservationActor, reservation: ReservationState) {
  assertReservationOwnerOrAdmin(actor, reservation);

  if (isAdmin(actor)) return;

  if (reservation.status !== "pendente") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Voce so pode editar reservas proprias que ainda estejam pendentes.",
    });
  }
}
