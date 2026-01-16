# エンジン設計メモ（script.js からの抽出候補 & API案）

このドキュメントは `script.js` に散らばっている再利用ロジックの洗い出しと、派生アプリ向けに公開するエンジンAPI案をまとめたものです。実装はまだありませんが、**抽出対象の範囲**と**I/F**を揃えるための設計メモとして使ってください。  

## 1. `script.js` 内の再利用ロジック候補

### データモデル / 正規化 / 永続化
- バフ情報の正規化（`memo`/`description`互換、`showSimpleMemo`補完）: `normalizeBuff` / `normalizeBuffs`。【F:script.js†L443-L463】
- 既定データ生成（初期バフ/判定/攻撃）: `getDefaultBuffs` / `getDefaultJudges` / `getDefaultAttacks`。【F:script.js†L496-L518】
- ローカルストレージへの保存/読み込み（全データ）: `loadData` / `saveData` / `exportData` / `importData`。【F:script.js†L465-L616】
- ユーザー辞書の保存/読み込み: `loadUserDictionary` / `saveUserDictionary` / `exportUserDictionary` / `importUserDictionary`。【F:script.js†L1061-L1346】

### カテゴリ管理
- カテゴリの追加・編集・削除・置換: `addCategory` / `editCategory` / `removeCategory` / `replaceCategoryOnItems` / `replaceBuffTargetsForCategory`。【F:script.js†L649-L872】
- カテゴリ → アイテムのマッピング生成: `buildCategoryMap`。【F:script.js†L877-L892】
- カテゴリの一覧表示/選択補助: `updateCategoryIndexDropdown` / `scrollToCategory`（カテゴリインデックス用途）。【F:script.js†L875-L918】

### バフ/判定/攻撃の入力 & 解析
- バフターゲットのエンコード/デコード（`judge:` / `attack:` / `judge-category:` などの接頭辞）: `updateBuffTargetDropdown` / `formatTargetsForBulk`。【F:script.js†L1405-L1483】【F:script.js†L3036-L3078】
- 一括追加のフォーマット解析（`|`区切り & `<カテゴリ>`ブロック）: `bulkAdd`。【F:script.js†L1630-L1822】
- バフ表示用のメモ抽出と簡易メモ判定: `getBuffMemoText` / `getBuffSimpleMemo`。【F:script.js†L1486-L1497】

### マクロ辞書 / オートコンプリート
- マクロ辞書のCRUD（追加/編集/削除）: `addOrUpdateMacro` / `startMacroEdit` / `cancelMacroEdit` / `deleteMacro`。【F:script.js†L1088-L1226】
- マクロ辞書の表示とカテゴリ分割: `renderMacroDictionary` / `renderMacroItems`。【F:script.js†L1230-L1295】
- 文字列候補の検索 & 入力補完: `getAutocompleteSuggestions` / `getTokenAtCaret` / `selectAutocompleteItem` ほか。【F:script.js†L2744-L2948】

### コマンド生成 / バフ効果の展開
- 判定/攻撃コマンドの生成と、バフ効果の合成（`all-judge` / `judge-category:` 等による絞り込み）: `updatePackageOutput`。【F:script.js†L2578-L2735】
- スロット記法（`//slot=value` と `//slot//` 置換）、複数効果の色付き合成: `updatePackageOutput` 内の解析ロジック。【F:script.js†L2612-L2735】

> 上記はUI非依存のロジックとしてエンジン化しやすい箇所です。UI要素の更新処理は別レイヤに切り出す想定です。  

---

## 1.5 配布形態（案）

- **ESM 単一ファイル `dist/engine.js` を公式配布物とする**。  
  - `<script type="module">` から直接 import できる形を想定。
  - 依存はバンドル内に含め、追加のビルド工程を不要にする。

### `index.html` での読み込み例
```html
<script type="module">
  import { createStore } from "./dist/engine.js";

  const store = createStore();
  // 例: 判定ラベルの追加
  const judgeIndex = store.addLabel("judge", { name: "命中", roll: "1d20" });
  console.log(store.generateCommands("judge", judgeIndex).text);
</script>
```

---

## 2. エンジンとして公開する API I/F 案

### 2.1 データ型（例）
```ts
type Buff = {
  name: string;
  effect: string;
  targets: string[]; // e.g. "judge:命中", "attack-category:近接"
  turn?: number | null;
  originalTurn?: number | null;
  color: string;
  category?: string | null;
  memo?: string;
  showSimpleMemo?: boolean;
  active?: boolean;
};

type PackageLabel = { // 判定/攻撃ラベル
  name: string;
  roll: string;
  category?: string | null;
};

type MacroEntry = {
  id: string;
  text: string;
  category: string;
  usage?: number;
};

type EngineData = {
  buffs: Buff[];
  buffCategories: string[];
  judges: PackageLabel[];
  judgeCategories: string[];
  attacks: PackageLabel[];
  attackCategories: string[];
  userDictionary: MacroEntry[];
};
```

### 2.2 API 一覧（案）
| API | 役割 | 入力 | 出力 |
| --- | --- | --- | --- |
| `createStore(initial?: Partial<EngineData>)` | エンジン状態の生成 | 初期データ | `store` |
| `store.getState()` | 現在のデータ取得 | なし | `EngineData` |
| `store.setState(patch)` | まとめて上書き | 部分データ | `void` |
| `store.addBuff(buff)` | バフ追加 | `Buff` | 追加後インデックス |
| `store.updateBuff(index, patch)` | バフ更新 | index + 部分 | `void` |
| `store.toggleBuff(index, active?)` | バフ有効/無効 | index + 任意active | `void` |
| `store.progressTurn()` | ターン経過（バフ減算） | なし | `void` |
| `store.resetBuffsToMaxTurns()` | バフターンの初期化 | なし | `void` |
| `store.addLabel(type, label)` | 判定/攻撃の追加 | type + `PackageLabel` | index |
| `store.addCategory(type, name)` | カテゴリ追加 | type + name | `void` |
| `store.renameCategory(type, from, to)` | カテゴリ名変更 | type + from/to | `void` |
| `store.removeCategory(type, name)` | カテゴリ削除 | type + name | `void` |
| `store.addMacro(entry)` | マクロ追加 | `MacroEntry` | index |
| `store.updateMacro(id, patch)` | マクロ更新 | id + patch | `void` |
| `store.removeMacro(id)` | マクロ削除 | id | `void` |
| `store.exportData()` | JSON出力 | なし | `string` |
| `store.importData(json)` | JSON入力 | `string` | `EngineData` |
| `store.exportUserDictionary()` | 辞書JSON出力 | なし | `string` |
| `store.importUserDictionary(json)` | 辞書JSON入力 | `string` | `MacroEntry[]` |
| `store.generateCommands(type, index, options?)` | 判定/攻撃コマンド生成 | type + index + options | `{ html, text }` |
| `store.bulkAdd(type, rawText)` | 一括登録 | type + rawText | `{ added, errors[] }` |

> `generateCommands` は `updatePackageOutput` の中核処理（バフ効果の合成・スロット展開）をエンジンに切り出す想定です。【F:script.js†L2578-L2735】  

### 2.3 入出力例（JSON）
**exportData**
```json
{
  "buffs": [
    {
      "name": "キャッツアイ",
      "memo": "命中UP",
      "showSimpleMemo": true,
      "effect": "+1",
      "targets": ["judge:命中(武器A)　SAMPLE"],
      "turn": 3,
      "originalTurn": 3,
      "color": "#56ccf2",
      "category": null,
      "active": true
    }
  ],
  "buffCategories": [],
  "judges": [{ "name": "命中(武器A)　SAMPLE", "roll": "1d20" }],
  "judgeCategories": [],
  "attacks": [{ "name": "武器A　SAMPLE", "roll": "2d6" }],
  "attackCategories": [],
  "userDictionary": []
}
```

**generateCommands**
```json
{
  "type": "judge",
  "index": 0,
  "options": {
    "targetType": "gte",
    "targetValue": "12"
  }
}
```
出力（例）:
```json
{
  "text": "1d20+1>=12 命中(武器A)　SAMPLE",
  "html": "<span>1d20</span><span style=\"color:#56ccf2\">+1</span><span>>=12 命中(武器A)　SAMPLE</span>"
}
```

---

## 3. 派生アプリ向け: 最小実装サンプル（コピペ用）

```js
// engine.js は将来提供されるエンジンモジュールの想定です。
import { createStore } from './engine.js';

const store = createStore();

// 1) 判定ラベルを追加
const judgeIndex = store.addLabel('judge', {
  name: '命中(ロングソード)',
  roll: '1d20'
});

// 2) バフを追加（対象は「すべての判定」）
store.addBuff({
  name: 'フォーカス',
  effect: '+2',
  targets: ['all-judge'],
  color: '#56ccf2',
  memo: '判定+2',
  showSimpleMemo: true,
  active: true
});

// 3) コマンド生成（text/html を受け取る）
const command = store.generateCommands('judge', judgeIndex, {
  targetType: 'gte',
  targetValue: '12'
});

console.log(command.text);
// => "1d20+2>=12 命中(ロングソード)"

// UIは受け取った text/html を表示するだけでOK
document.getElementById('output').textContent = command.text;
```

---

## 4. 追加メモ
- `bulkAdd` で使っている `<カテゴリ>` ブロック構文や `|` 区切りの仕様は、エンジン側でパーサとして提供すると派生アプリで再利用しやすくなります。【F:script.js†L1630-L1822】
- `formatTargetsForBulk` のようなターゲット表示名変換は、UI表示/エクスポートの両方で必要になるため共通関数化が有効です。【F:script.js†L3036-L3078】

---

## 5. 互換性ポリシー（破壊的変更）

- エンジン API は **Semantic Versioning (MAJOR.MINOR.PATCH)** を採用予定。
- 破壊的変更は **MAJOR** を更新し、README/マニュアルで告知する。
- **MINOR** は後方互換の機能追加、**PATCH** は互換性を保つ修正を対象とする。
