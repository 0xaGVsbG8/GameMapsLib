"use client";

import { useEffect, useRef, useState } from "react";
import "./add-game.css";

type EditNameWidgetProps = {
  title: string;
  label?: string;
  currentName: string;
  ariaLabel: string;
  showIconInput?: boolean;
  onSave: (
    newName: string,
    iconFile: File | null,
    clearIcon?: boolean,
  ) => Promise<string | null>;
  onRenamed: (newName: string) => void;
};

export function EditNameWidget({
  title,
  label = "Name",
  currentName,
  ariaLabel,
  showIconInput = false,
  onSave,
  onRenamed,
}: EditNameWidgetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [clearIcon, setClearIcon] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const fieldId = `rename-${currentName}`;

  useEffect(() => {
    if (!open) return;

    if (nameRef.current) nameRef.current.value = currentName;
    setClearIcon(false);
    nameRef.current?.focus();
    nameRef.current?.select();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, currentName]);

  const close = () => {
    setOpen(false);
    setError("");
    setClearIcon(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newName = nameRef.current?.value.trim();
    const iconFile = iconFileRef.current?.files?.[0] ?? null;
    if (!newName) return;

    if (newName === currentName && !iconFile && !clearIcon) {
      close();
      return;
    }

    setError("");
    const message = await onSave(newName, clearIcon ? null : iconFile, clearIcon);
    if (message) {
      setError(message);
      return;
    }

    close();
    onRenamed(newName);
  };

  return (
    <>
      <button
        className="ide-row-edit"
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          />
        </svg>
      </button>

      {open && (
        <div className="add-game-overlay" onClick={close}>
          <form
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>{title}</h2>

            <div className="add-game-field">
              <label htmlFor={fieldId}>{label}</label>
              <input
                ref={nameRef}
                id={fieldId}
                name="name"
                type="text"
                maxLength={100}
                placeholder={label}
              />
              {showIconInput && (
                <>
                  <input
                    ref={iconFileRef}
                    name="icon"
                    type="file"
                    accept="image/*"
                    disabled={clearIcon}
                  />
                  <label className="add-game-check">
                    <input
                      type="checkbox"
                      checked={clearIcon}
                      onChange={(event) => setClearIcon(event.target.checked)}
                    />
                    Clear icon
                  </label>
                </>
              )}
            </div>

            <div className="add-game-error">{error}</div>

            <div className="add-game-actions">
              <button className="add-game-cancel" type="button" onClick={close}>
                Cancel
              </button>
              <button className="add-game-submit" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
