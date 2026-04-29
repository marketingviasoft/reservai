export type CategoryAccessUser = {
  role?: string | null;
} | null | undefined;

export const CATEGORY_DELETE_ERROR_MESSAGE =
  "Não foi possível excluir esta categoria. Verifique se existem equipamentos vinculados a ela.";

export function isValidCategoryColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function canManageCategories(user: CategoryAccessUser) {
  return user?.role === "admin";
}

export function getCategoryDeleteErrorMessage() {
  return CATEGORY_DELETE_ERROR_MESSAGE;
}
