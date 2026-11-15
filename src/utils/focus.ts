type SelectableField = Pick<HTMLInputElement, 'focus' | 'setSelectionRange' | 'value'>;

/**
 * Focuses a text field and selects all of its text, so typing replaces it. Selects directly rather
 * than from a focus event: when the document doesn't have focus (DevTools or another window in
 * front, a background or headless tab) focus() still moves focus but fires no event, so a select()
 * in an onFocus handler never runs and the caret is left at the end of the value.
 */
export function focusAndSelectAll(field: SelectableField) {
  field.focus();
  field.setSelectionRange(0, field.value.length);
}
