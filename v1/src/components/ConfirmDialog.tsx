import { Component, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * ConfirmDialog - Modal confirmation dialog matching ChatGPT/Claude patterns
 *
 * Features:
 * - Center-screen modal with backdrop
 * - Keyboard navigation (Escape to cancel, Tab between buttons)
 * - Accessibility support (ARIA labels, focus management)
 * - Danger mode for destructive actions (red button)
 * - Loading state for async operations
 *
 * @example
 * <ConfirmDialog
 *   isOpen={showDialog()}
 *   title="Delete conversation?"
 *   message="This action cannot be undone."
 *   confirmLabel="Delete"
 *   isDangerous={true}
 *   onConfirm={() => handleDelete()}
 *   onCancel={() => setShowDialog(false)}
 * />
 */
export const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  let dialogRef: HTMLDivElement | undefined;
  let confirmButtonRef: HTMLButtonElement | undefined;

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      props.onCancel();
    }
  };

  // Lock body scroll when dialog is open
  createEffect(() => {
    if (props.isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Focus the dialog on next tick
      setTimeout(() => {
        confirmButtonRef?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeyDown);
  });

  const handleConfirm = async () => {
    await props.onConfirm();
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onCancel();
    }
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="presentation"
        >
          {/* Dialog */}
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
            class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2
              id="dialog-title"
              class="text-lg font-semibold text-gray-900 mb-2"
            >
              {props.title}
            </h2>

            {/* Message */}
            <p
              id="dialog-description"
              class="text-sm text-gray-700 mb-1"
            >
              {props.message}
            </p>

            {/* Description (optional) */}
            <Show when={props.description}>
              <p class="text-sm text-gray-500 mb-6">
                {props.description}
              </p>
            </Show>

            <Show when={!props.description}>
              <div class="mb-6" />
            </Show>

            {/* Buttons */}
            <div class="flex gap-3 justify-end">
              {/* Cancel Button */}
              <button
                onClick={props.onCancel}
                disabled={props.isLoading}
                class="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {props.cancelLabel || 'Cancel'}
              </button>

              {/* Confirm Button */}
              <button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                disabled={props.isLoading}
                class={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  props.isDangerous
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                type="button"
              >
                <Show when={props.isLoading}>
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </Show>
                {props.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default ConfirmDialog;
