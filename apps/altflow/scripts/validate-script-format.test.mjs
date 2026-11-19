import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateScriptFormat, createValidateScriptFormatTool } from '../src/mastra/tools/validate-script-format.ts';

const valid = `第1集 雨夜来客
1-1 老宅门口（夜）
△雨声里，门被敲响。
林川：谁？
1-1-互动 门外的人说是旧识，开不开门？
1-1-A：隔着门问清来意 → 1-2-A
1-1-B：直接拉开门 → 1-2-B
1-2-A 门内
林川：你先说名字。
（合流 → 1-3）
1-2-B 门口
△来人一把按住门框。
（合流 → 1-3）
1-3 堂屋（夜）
△两人对坐，茶已凉。
本集结束
第2集 暗线
2-1 书房（晨）
△林川翻开旧账本。
本集结束
`;

const rules = (text) => validateScriptFormat(text).issues.map(i => i.rule);

test('a well-formed branching script passes and is counted', () => {
  const result = validateScriptFormat(valid);
  assert.deepEqual(result.issues, []);
  assert.equal(result.valid, true);
  assert.deepEqual(result.stats, { episodes: 2, scenes: 5, branchScenes: 2, interactions: 1, options: 2 });
});

test('empty input and a script without an episode title are rejected', () => {
  assert.equal(validateScriptFormat('   ').valid, false);
  assert.ok(rules('1-1 场景描述\n本集结束').includes('集标题'));
});

test('scene numbers must carry the episode number and increase', () => {
  const text = valid.replace('1-3 堂屋（夜）', '1-1 堂屋（夜）').replace('2-1 书房（晨）', '3-1 书房（晨）');
  const issues = validateScriptFormat(text).issues;
  assert.ok(issues.some(i => i.rule === '场景编号' && i.message.includes('重复')));
  assert.ok(issues.some(i => i.rule === '场景编号' && i.message.includes('集号应为 2')));
});

test('an option without an explicit jump, or jumping nowhere, is reported with its line', () => {
  const noJump = valid.replace('1-1-B：直接拉开门 → 1-2-B', '1-1-B：直接拉开门');
  const missing = valid.replace('→ 1-2-B', '→ 1-9-B');
  const a = validateScriptFormat(noJump).issues.find(i => i.rule === '选项跳转');
  assert.ok(a);
  assert.equal(a.lineNumber, 7);
  assert.ok(validateScriptFormat(missing).issues.some(i => i.message.includes('没有这个场景')));
});

test('options must start at A, be consecutive and belong to their interaction', () => {
  const skipped = valid.replace('1-1-B：直接拉开门 → 1-2-B', '1-1-C：直接拉开门 → 1-2-B');
  assert.ok(validateScriptFormat(skipped).issues.some(i => i.message.includes('应为 B')));
  const wrong = valid.replace('1-1-B：直接拉开门', '1-2-B：直接拉开门');
  assert.ok(validateScriptFormat(wrong).issues.some(i => i.message.includes('编号不一致')));
  const single = valid.replace('1-1-B：直接拉开门 → 1-2-B\n', '');
  assert.ok(rules(single).includes('互动选项'));
});

test('an interaction marker must follow its own scene and have options', () => {
  const misplaced = valid.replace('1-1-互动', '1-2-互动');
  assert.ok(validateScriptFormat(misplaced).issues.some(i => i.rule === '互动标记'));
  assert.ok(rules(valid.replace(/1-1-A.*\n1-1-B.*\n/, '')).includes('互动选项'));
});

test('every branch scene must close and be reachable; merges must land on a real scene', () => {
  const open = valid.replace('（合流 → 1-3）\n1-2-B', '1-2-B');
  assert.ok(validateScriptFormat(open).issues.some(i => i.rule === '分支收束' && i.message.includes('1-2-A')));
  const orphan = valid.replace('1-1-A：隔着门问清来意 → 1-2-A', '1-1-A：隔着门问清来意 → 1-2-B');
  assert.ok(validateScriptFormat(orphan).issues.some(i => i.rule === '场景可达' && i.message.includes('1-2-A')));
  const badMerge = valid.replace('（合流 → 1-3）', '（合流 → 1-8）');
  assert.ok(validateScriptFormat(badMerge).issues.some(i => i.message.includes('合流目标')));
});

test('a branch may end with a closing or an ending marker instead of a merge', () => {
  const closed = valid.replace('（合流 → 1-3）\n1-2-B', '（闭合）\n1-2-B').replace('（合流 → 1-3）\n1-3', '（结局：孤身赴约）\n1-3');
  assert.deepEqual(validateScriptFormat(closed).issues, []);
});

test('each episode must end with 本集结束', () => {
  const issues = validateScriptFormat(valid.replace('本集结束\n第2集', '第2集')).issues;
  assert.ok(issues.some(i => i.rule === '集结束' && i.message.includes('第 1 集')));
});

test('the tool wraps the validator and returns the same shape', async () => {
  const tool = createValidateScriptFormatTool();
  assert.equal(tool.id, 'validate_script_format');
  const result = await tool.execute({ script: valid }, {});
  assert.equal(result.valid, true);
});
