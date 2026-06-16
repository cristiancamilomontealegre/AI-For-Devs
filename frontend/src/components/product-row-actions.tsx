import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProductWithStock } from '../types/product';
import { productsService } from '../services/products.service';
import {
  getConfirmDialogCopy,
  type ProductConfirmAction,
} from '../utils/product-actions';
import { ConfirmDialog } from './confirm-dialog';
import './product-row-actions.css';

interface ProductRowActionsProps {
  product: ProductWithStock;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function ProductRowActions({
  product,
  busy,
  onBusyChange,
  onEdit,
  onChanged,
  onError,
}: ProductRowActionsProps) {
  const [pendingAction, setPendingAction] = useState<ProductConfirmAction | null>(
    null,
  );

  const closeDialog = () => {
    if (!busy) {
      setPendingAction(null);
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction || pendingAction === 'delete-blocked') {
      return;
    }

    try {
      onBusyChange(true);

      if (pendingAction === 'delete') {
        await productsService.remove(product.id);
      } else {
        const nextStatus =
          pendingAction === 'deactivate' ? 'inactive' : 'active';
        await productsService.updateState(product.id, nextStatus);
      }

      setPendingAction(null);
      onChanged();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'Failed to update product',
      );
    } finally {
      onBusyChange(false);
    }
  };

  const dialogCopy = pendingAction
    ? getConfirmDialogCopy(pendingAction, product)
    : null;

  return (
    <>
      <div className="product-row-actions">
        <button
          type="button"
          className="product-row-actions__button"
          disabled={busy}
          onClick={onEdit}
        >
          Edit
        </button>
        {product.status === 'active' && (
          <Link
            to={`/movements/new?productId=${product.id}`}
            className="product-row-actions__button product-row-actions__button--link"
          >
            Register movement
          </Link>
        )}
        <button
          type="button"
          className="product-row-actions__button"
          disabled={busy}
          onClick={() =>
            setPendingAction(
              product.status === 'active' ? 'deactivate' : 'activate',
            )
          }
        >
          {product.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        {product.hasMovements ? (
          <button
            type="button"
            className="product-row-actions__button product-row-actions__button--protected"
            disabled={busy}
            title="This product has movement history and can only be deactivated"
            onClick={() => setPendingAction('delete-blocked')}
          >
            Protected
          </button>
        ) : (
          <button
            type="button"
            className="product-row-actions__button product-row-actions__button--danger"
            disabled={busy}
            onClick={() => setPendingAction('delete')}
          >
            Delete permanently
          </button>
        )}
        {product.hasMovements && (
          <p className="product-row-actions__hint">
            Has movement history — use Deactivate instead of delete.
          </p>
        )}
      </div>

      {dialogCopy && (
        <ConfirmDialog
          title={dialogCopy.title}
          message={dialogCopy.message}
          confirmLabel={'confirmLabel' in dialogCopy ? dialogCopy.confirmLabel : undefined}
          variant={'variant' in dialogCopy ? dialogCopy.variant : undefined}
          mode={dialogCopy.mode}
          busy={busy}
          onConfirm={
            dialogCopy.mode === 'confirm'
              ? () => void executePendingAction()
              : undefined
          }
          onCancel={closeDialog}
        />
      )}
    </>
  );
}
