import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkDictionaries, findHardcodedCopy } from './check-studio-i18n.mjs';

describe('Studio copy check', () => {
  describe('when a component adds untranslated labels', () => {
    it('reports text, accessible labels, and toasts', () => {
      const issues = findHardcodedCopy(
        'src/page.tsx',
        'const Page = () => <button aria-label="Open settings">Save changes</button>; toast.error("Failed to save");',
      );
      assert.equal(issues.length, 3);
    });
  });
  describe('when a string is a protocol value or code sample', () => {
    it('does not treat it as interface copy', () => {
      assert.deepEqual(
        findHardcodedCopy(
          'src/page.tsx',
          'const Page = () => <><code>const foo = 1;</code><span>{userText}</span><a href="/agents">{t("Agents")}</a></>;',
        ),
        [],
      );
    });
  });
  describe('when a component uses an English template literal', () => {
    it('reports the sentence', () => {
      assert.equal(
        findHardcodedCopy('src/page.tsx', 'const Page = () => <div>{`Found ${count} items`}</div>;').length,
        1,
      );
    });
  });
});

describe('Studio dictionaries', () => {
  describe('when Chinese omits a dynamic value', () => {
    it('rejects the changed placeholder', () => {
      assert.match(
        checkDictionaries(new Map([['Items', '{count} items']]), new Map([['Items', '条目']]))[0],
        /changed placeholders/,
      );
    });
  });
  describe('when a translation is missing', () => {
    it('rejects an absent Chinese key', () => {
      assert.match(checkDictionaries(new Map([['Save', 'Save']]), new Map())[0], /Missing Chinese/);
    });
  });
  describe('when placeholders change order', () => {
    it('accepts the translated sentence', () => {
      assert.deepEqual(
        checkDictionaries(new Map([['Sentence', '{one} before {two}']]), new Map([['Sentence', '{two}之后是{one}']])),
        [],
      );
    });
  });
});

describe('when an empty state uses content slots', () => {
  it('rejects untranslated titles, descriptions and fallbacks', () => {
    const issues = findHardcodedCopy(
      'src/page.tsx',
      '<EmptyState titleSlot="Storage unavailable" descriptionSlot={error ?? "Try again"} />',
    );
    assert.equal(issues.length, 2);
  });
  it('preserves typography class names', () => {
    assert.deepEqual(
      findHardcodedCopy('src/ds/primitives/text.ts', "const roles = { title: 'text-title', caption: 'text-caption' };"),
      [],
    );
  });
});

// Empty grammar tokens must not weaken the check for normal interface copy.
it('allows the absent Chinese plural suffix while rejecting empty labels', () => {
  assert.deepEqual(
    checkDictionaries(new Map([['English plural suffix', 's']]), new Map([['English plural suffix', '']])),
    [],
  );
  assert.match(checkDictionaries(new Map([['Save', 'Save']]), new Map([['Save', '']]))[0], /Missing Chinese/);
});
