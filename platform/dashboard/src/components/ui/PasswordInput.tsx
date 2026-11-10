import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "../../icons";
import { FloatingLabelInput, type FloatingLabelInputProps } from "./FloatingLabelInput";

interface PasswordInputProps extends Omit<FloatingLabelInputProps, "icon" | "trailing" | "type"> {
  readonly showLabel: string;
  readonly hideLabel: string;
}

export function PasswordInput({ showLabel, hideLabel, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <FloatingLabelInput
      {...props}
      type={visible ? "text" : "password"}
      icon={<LockIcon />}
      trailing={
        <button
          type="button"
          className="field__toggle"
          aria-pressed={visible}
          aria-label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
