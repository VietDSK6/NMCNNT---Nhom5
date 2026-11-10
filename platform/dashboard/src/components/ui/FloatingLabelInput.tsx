import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { CheckIcon } from "../../icons";

export interface FloatingLabelInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  readonly label: string;
  readonly icon: ReactNode;
  readonly error?: string | null;
  readonly valid?: boolean;
  readonly trailing?: ReactNode;
}

export function FloatingLabelInput({ label, icon, error, valid, trailing, id, ...inputProps }: FloatingLabelInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="field" data-invalid={error ? "" : undefined}>
      <div className="field__control">
        <span className="field__icon" aria-hidden="true">{icon}</span>
        <input
          {...inputProps}
          id={inputId}
          className="field__input"
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
        <label className="field__label" htmlFor={inputId}>{label}</label>
        {valid && !error && <CheckIcon className="field__valid" />}
        {trailing}
      </div>
      <p className="field__error" id={errorId} aria-live="polite">{error}</p>
    </div>
  );
}
