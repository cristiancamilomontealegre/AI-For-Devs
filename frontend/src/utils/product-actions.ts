import type { ProductWithStock } from '../types/product';

export function getDeactivateConfirmMessage(product: ProductWithStock): string {
  const stockNote =
    product.currentStock > 0
      ? `It currently has ${product.currentStock} unit${
          product.currentStock === 1 ? '' : 's'
        } in stock. Stock will remain visible, but new movements will be blocked.`
      : 'New movements will be blocked while it stays in the inventory list.';

  if (product.hasMovements) {
    return `Deactivate "${product.name}"? This product has movement history and cannot be permanently deleted. ${stockNote} Use Deactivate instead of Delete to preserve inventory records.`;
  }

  return `Deactivate "${product.name}"? ${stockNote}`;
}

export function getActivateConfirmMessage(product: ProductWithStock): string {
  return `Activate "${product.name}"? It will be available again for new inbound and outbound movements.`;
}

export function getDeleteConfirmMessage(product: ProductWithStock): string {
  return `Permanently delete "${product.name}"? This removes the product record completely and cannot be undone. Only products without movement history can be deleted. If the product already has movements, use Deactivate instead.`;
}

export function getDeleteBlockedMessage(product: ProductWithStock): string {
  return `"${product.name}" has registered movements and cannot be permanently deleted. Use Deactivate to mark it inactive while keeping movement history and current stock (${product.currentStock} units) visible in the inventory list.`;
}

export type ProductConfirmAction =
  | 'deactivate'
  | 'activate'
  | 'delete'
  | 'delete-blocked';

export function getConfirmDialogCopy(
  action: ProductConfirmAction,
  product: ProductWithStock,
):
  | {
      title: string;
      message: string;
      confirmLabel: string;
      variant: 'default' | 'danger';
      mode: 'confirm';
    }
  | {
      title: string;
      message: string;
      mode: 'info';
    } {
  switch (action) {
    case 'deactivate':
      return {
        title: 'Deactivate product',
        message: getDeactivateConfirmMessage(product),
        confirmLabel: 'Deactivate',
        variant: 'default',
        mode: 'confirm',
      };
    case 'activate':
      return {
        title: 'Activate product',
        message: getActivateConfirmMessage(product),
        confirmLabel: 'Activate',
        variant: 'default',
        mode: 'confirm',
      };
    case 'delete':
      return {
        title: 'Permanently delete product',
        message: getDeleteConfirmMessage(product),
        confirmLabel: 'Delete permanently',
        variant: 'danger',
        mode: 'confirm',
      };
    case 'delete-blocked':
      return {
        title: 'Delete not available',
        message: getDeleteBlockedMessage(product),
        mode: 'info',
      };
  }
}
