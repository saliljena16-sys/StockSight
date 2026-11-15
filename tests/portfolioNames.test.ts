import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPortfolioName, deletePortfolioMessage, findPortfolioNameConflict, portfolioNameError, suggestPortfolioName } from '../src/utils/portfolioNames.ts';
import { focusAndSelectAll } from '../src/utils/focus.ts';

const names = ['Core', 'Second'];

test('name conflicts are case-insensitive and ignore surrounding spaces', () => {
  assert.equal(findPortfolioNameConflict('Second', names), 'Second');
  assert.equal(findPortfolioNameConflict('  second ', names), 'Second');
  assert.equal(findPortfolioNameConflict('Third', names), undefined);
  assert.equal(portfolioNameError('core', names), 'A portfolio named "Core" already exists. Choose a different name.');
  assert.equal(portfolioNameError('Third', names), null);
});

test('renaming may keep or re-case its own name but not take another', () => {
  assert.equal(portfolioNameError('CORE', names, 'Core'), null);
  assert.equal(portfolioNameError('Second', names, 'Core'), 'A portfolio named "Second" already exists. Choose a different name.');
});

test('the suggested name skips names that are taken', () => {
  assert.equal(suggestPortfolioName(['Core']), 'Portfolio 2');
  assert.equal(suggestPortfolioName(['Core', 'portfolio 3']), 'Portfolio 4');
});

const CLASH_SECOND = 'A portfolio named "Second" already exists. Choose a different name.';

test('creating accepts a free, trimmed name and refuses a taken one with the reason', () => {
  assert.deepEqual(checkPortfolioName(' Growth ', names), { status: 'ok', name: 'Growth' });
  assert.deepEqual(checkPortfolioName('Second', names), { status: 'clash', message: CLASH_SECOND });
  assert.deepEqual(checkPortfolioName('  sECOND ', names), { status: 'clash', message: CLASH_SECOND });
  // The suggested default is always accepted as-is.
  assert.deepEqual(checkPortfolioName(suggestPortfolioName(names), names), { status: 'ok', name: 'Portfolio 3' });
});

test('a blank name is never saved', () => {
  assert.deepEqual(checkPortfolioName('', names), { status: 'empty' });
  assert.deepEqual(checkPortfolioName('   ', names), { status: 'empty' });
  assert.deepEqual(checkPortfolioName('   ', names, 'Core'), { status: 'empty' });
});

test('renaming refuses another portfolio\'s name and treats the unchanged name as no change', () => {
  assert.deepEqual(checkPortfolioName('Second', names, 'Core'), { status: 'clash', message: CLASH_SECOND });
  assert.deepEqual(checkPortfolioName('Core Growth', names, 'Core'), { status: 'ok', name: 'Core Growth' });
  assert.deepEqual(checkPortfolioName(' Core ', names, 'Core'), { status: 'unchanged' });
  assert.deepEqual(checkPortfolioName('core', names, 'Core'), { status: 'ok', name: 'core' });
});

test('the delete confirmation names the portfolio and what is lost with it', () => {
  assert.equal(deletePortfolioMessage('Core'), '"Core" and its stocks, shares, cash and transactions will be deleted. This can\'t be undone.');
});

/**
 * A text field in a document that doesn't have focus (DevTools or another window in front, a
 * background or headless tab): focus() moves focus but fires no focus event, and the caret starts
 * at the end, where setting the value put it.
 */
function fieldInUnfocusedDocument(value: string) {
  const focusListeners: Array<() => void> = [];
  return {
    value,
    focused: false,
    selectionStart: value.length,
    selectionEnd: value.length,
    onFocus(listener: () => void) { focusListeners.push(listener); },
    focus() { this.focused = true; }, // no focus event is dispatched
    select() { this.setSelectionRange(0, this.value.length); },
    setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; },
  };
}

test('the name dialog field is focused with the whole prefilled name selected, even without a focus event', () => {
  // What the dialog used to do: autoFocus, then select() from the focus event, which never comes.
  const before = fieldInUnfocusedDocument('Popular Picks');
  before.onFocus(() => before.select());
  before.focus();
  assert.deepEqual([before.focused, before.selectionStart, before.selectionEnd], [true, 13, 13], 'caret left at the end');

  for (const name of ['Popular Picks', 'Portfolio 2']) { // rename (current name) and create (suggestion)
    const field = fieldInUnfocusedDocument(name);
    focusAndSelectAll(field);
    assert.deepEqual([field.focused, field.selectionStart, field.selectionEnd], [true, 0, name.length], `${name}: all selected`);
  }
});
