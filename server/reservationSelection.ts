type ReservationSelectionInput = {
  directItemIds: number[];
  comboItemIds: number[];
  unavailableItemIds: number[];
};

export function buildReservationItemSelection({
  directItemIds,
  comboItemIds,
  unavailableItemIds,
}: ReservationSelectionInput) {
  const unavailable = new Set(unavailableItemIds);
  const conflictingDirectItemIds = directItemIds.filter((id) => unavailable.has(id));
  const availableComboItemIds = comboItemIds.filter((id) => !unavailable.has(id));
  const skippedComboItemIds = comboItemIds.filter((id) => unavailable.has(id));
  const itemIds = Array.from(new Set([...directItemIds, ...availableComboItemIds]));

  return {
    itemIds,
    conflictingDirectItemIds: Array.from(new Set(conflictingDirectItemIds)),
    skippedComboItemIds: Array.from(new Set(skippedComboItemIds)),
  };
}
