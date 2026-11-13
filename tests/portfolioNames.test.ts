import test from 'node:test';
import assert from 'node:assert/strict';
import { askForPortfolioName, findPortfolioNameConflict, portfolioNameError, suggestPortfolioName } from '../src/utils/portfolioNames.ts';

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

function scriptedAsk(answers: Array<string | null>) {
  const asked: Array<[string, string]> = [];
  return {
    asked,
    ask: (message: string, defaultValue: string) => {
      asked.push([message, defaultValue]);
      return answers.length ? answers.shift()! : null;
    },
  };
}

test('creating with a taken name re-prompts with the reason instead of accepting it', () => {
  const { ask, asked } = scriptedAsk(['Second', ' Growth ']);
  const name = askForPortfolioName({ ask, message: 'Create a portfolio name', defaultValue: 'Portfolio 3', existingNames: names });
  assert.equal(name, 'Growth');
  assert.deepEqual(asked, [
    ['Create a portfolio name', 'Portfolio 3'],
    ['A portfolio named "Second" already exists. Choose a different name.', 'Second'],
  ]);
});

test('cancelling after a clash returns nothing', () => {
  const { ask } = scriptedAsk(['second', null]);
  assert.equal(askForPortfolioName({ ask, message: 'Create a portfolio name', defaultValue: 'x', existingNames: names }), null);
  assert.equal(askForPortfolioName({ ask: scriptedAsk(['   ']).ask, message: 'm', defaultValue: 'x', existingNames: names }), null);
});

test('renaming re-prompts on a clash and treats the unchanged name as no change', () => {
  const clash = scriptedAsk(['Second', 'Core Growth']);
  assert.equal(askForPortfolioName({ ask: clash.ask, message: 'Rename portfolio', defaultValue: 'Core', existingNames: names, currentName: 'Core' }), 'Core Growth');
  assert.equal(clash.asked[1][0], 'A portfolio named "Second" already exists. Choose a different name.');
  assert.equal(askForPortfolioName({ ask: scriptedAsk(['Core']).ask, message: 'Rename portfolio', defaultValue: 'Core', existingNames: names, currentName: 'Core' }), null);
  assert.equal(askForPortfolioName({ ask: scriptedAsk(['core']).ask, message: 'Rename portfolio', defaultValue: 'Core', existingNames: names, currentName: 'Core' }), 'core');
});
