export type ReservationSelectionInput = {
  directItemIds: number[];
  comboItemIds: number[];
  unavailableItemIds: number[];
};

export function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

export function buildReservationItemSelection({
  directItemIds,
  comboItemIds,
  unavailableItemIds,
}: ReservationSelectionInput) {
  const unavailable = new Set(unavailableItemIds);
  const conflictingDirectItemIds = directItemIds.filter((id) => unavailable.has(id));
  const availableComboItemIds = comboItemIds.filter((id) => !unavailable.has(id));
  const skippedComboItemIds = comboItemIds.filter((id) => unavailable.has(id));
  const itemIds = uniqueNumbers([...directItemIds, ...availableComboItemIds]);

  return {
    itemIds,
    conflictingDirectItemIds: uniqueNumbers(conflictingDirectItemIds),
    skippedComboItemIds: uniqueNumbers(skippedComboItemIds),
  };
}

export type ComboCartUpdateInput = {
  currentItemIds: number[];
  comboItemIds: number[];
  unavailableItemIds: number[];
};

export function buildComboCartUpdate({
  currentItemIds,
  comboItemIds,
  unavailableItemIds,
}: ComboCartUpdateInput) {
  const current = new Set(currentItemIds);
  const unavailable = new Set(unavailableItemIds);
  const uniqueComboItemIds = uniqueNumbers(comboItemIds);
  const skippedItemIds = uniqueComboItemIds.filter((id) => unavailable.has(id));
  const duplicateItemIds = uniqueComboItemIds.filter((id) => !unavailable.has(id) && current.has(id));
  const addedItemIds = uniqueComboItemIds.filter((id) => !unavailable.has(id) && !current.has(id));

  return {
    itemIds: uniqueNumbers([...currentItemIds, ...addedItemIds]),
    addedItemIds,
    skippedItemIds,
    duplicateItemIds,
    allUnavailable: addedItemIds.length === 0,
  };
}
