import { EmptyState } from './EmptyState';
import buttons from './Button.module.css';

export type ErrorStateProps = {
  onRetry: () => void;
};

/** Feed failed to load. Plain language, no error details, and a retry. */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div role="status">
      <EmptyState
        title="We couldn't load comparisons"
        body="Something went wrong on our end. Check your connection and try again."
      >
        <button
          type="button"
          className={`body ${buttons.button} ${buttons.dark}`}
          onClick={onRetry}
        >
          Try again
        </button>
      </EmptyState>
    </div>
  );
}
