import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanWikitext, parseObservances, weatherLabel } from '../api/_lib/sources.ts';

const sample = `== 記念日・年中行事 ==
{{see also|365日の記念日一覧}}
* [[国際非暴力デー]]（{{UN}}）
*: [[マハトマ・ガンディー]]の誕生日にちなみ、[[2007年]]に[[国際連合総会|国連総会]]で制定。<ref>{{Cite web|title=x}}</ref>
* '''豆腐の日'''（{{JPN}}）
*: 「とう(10)ふ(2)」の語呂合わせ。
* [[望遠鏡の日]]
** 下位項目
* {{仮リンク|宇宙の日|en|Space Day}}（[[アメリカ合衆国]]）
`;

test('記念日を取り出せる', () => {
  const items = parseObservances(sample);
  assert.equal(items[0].name, '国際非暴力デー');
  assert.match(items[0].note, /^マハトマ・ガンディーの誕生日にちなみ、2007年に国連総会で制定。$/);
  assert.equal(items[1].name, '豆腐の日');
  assert.equal(items[1].note, '「とう(10)ふ(2)」の語呂合わせ。');
  assert.equal(items[2].name, '望遠鏡の日');
  assert.equal(items[2].note, '下位項目');
  assert.equal(items[3].name, '宇宙の日');
  assert.ok(items.every((i) => !i.name.includes('{{') && !i.name.includes('[[')));
});

test('ウィキ記法を消せる', () => {
  assert.equal(cleanWikitext("[[A|あ]]と'''い'''{{x|{{y}}}}<ref>r</ref>"), 'あとい');
});

test('天気コード', () => {
  assert.equal(weatherLabel(0).label, '快晴');
  assert.equal(weatherLabel(63).label, '雨');
  assert.equal(weatherLabel(95).label, '雷雨');
});
