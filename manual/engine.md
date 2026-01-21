# エンジンの使い方

このドキュメントは、現在実装されているエンジンAPI（`core/engine/store.js` ほか） の使い方をまとめたものです。
JetPaletteEngine はブラウザ向けのグローバルとして提供され、`createStore` で状態ストアを生成して利用します。

---

## 1. エンジンの読み込み

### 1.1 `<script>` で読み込む（現状の実装）

```html
<script src="core/engine/utils.js"></script>
<script src="core/engine/buffs.js"></script>
<script src="core/engine/bulk.js"></script>
<script src="core/engine/commands.js"></script>
<script src="core/engine/store.js"></script>
<script>
  const store = JetPaletteEngine.createStore();
</script>
```

> `store.js` は IIFE で `window.JetPaletteEngine` を公開します。`utils.js` などのモジュールファイルを先に読み込んでください。

### 1.2 ESM 配布形態（`dist/engine.js`）

- **ESM 単一ファイル `dist/engine.js` を公式配布物とする**想定。
- `dist/engine.js` から `createStore` / `normalizeBuffs` / `convertYstToJetPalette` を直接 `import` できます。

```html
<script type="module">
  import { createStore } from "./dist/engine.js";

  const store = createStore();
</script>
```

> `dist/engine.js` は `npm run build:engine` で生成できます。

---

## 2. データ型（実装ベース）

```ts
type Buff = {
  name: string;
  effect: string;
  targets: string[]; // e.g. "judge:命中", "attack-category:近接", "all-judge"
  turn?: number | null;
  originalTurn?: number | null;
  color: string;
  category?: string | null;
  memo?: string;
  description?: string; // memo が未指定の場合は description を使用
  showSimpleMemo?: boolean;
  active?: boolean;
};

type PackageLabel = {
  name: string;
  roll: string;
  category?: string | null;
};

type EngineData = {
  buffs: Buff[];
  buffCategories: string[];
  judges: PackageLabel[];
  judgeCategories: string[];
  attacks: PackageLabel[];
  attackCategories: string[];
  userDictionary: Array<{ id: string; text: string; category: string; usage?: number }>;
};
```

---

## 3. 実装済み API 一覧

### 3.1 `JetPaletteEngine`

| API | 役割 | 入力 | 出力 |
| --- | --- | --- | --- |
| `JetPaletteEngine.createStore(initial?, options?)` | エンジン状態の生成 | 初期データ / オプション | `store` |
| `JetPaletteEngine.normalizeBuffs(buffs)` | バフ配列の正規化 | `Buff[]` | `Buff[]` |
| `JetPaletteEngine.convertYstToJetPalette(input)` | 変換（ゆとシート → JET-PALLET） | 文字列 or オブジェクト | `EngineData` |

#### `createStore` オプション
| オプション | 役割 | 既定値 |
| --- | --- | --- |
| `getDefaultBuffColor()` | デフォルト色 | `#BD93F9` |
| `validateColor(color)` | カラーコード検証 | 6桁HEX以外は `getDefaultBuffColor()` に丸める |

### 3.2 `store`

| API | 役割 | 入力 | 出力 |
| --- | --- | --- | --- |
| `store.getState()` | 現在のデータ取得 | なし | `EngineData` |
| `store.setState(patch)` | データ上書き | 部分データ | `EngineData` |
| `store.addItem(type, item)` | 要素追加 | type + data | 追加後インデックス |
| `store.updateItem(type, index, patch)` | 要素更新 | type + index + patch | `boolean` |
| `store.removeItem(type, index)` | 要素削除 | type + index | 削除した要素 or `null` |
| `store.exportData()` | JSON出力 | なし | `string` |
| `store.importData(json)` | JSON入力 | `string | object` | `EngineData` |
| `store.bulkAdd(type, rawText)` | 一括登録 | type + rawText | `{ added, errors[] }` |
| `store.generateCommands(type, index, options?)` | コマンド生成 | type + index + options | `{ html, text, parts }` or `null` |

> `type` は `buff` / `judge` / `attack` を指定します。

---

## 4. 最小実装サンプル（バフ追加 → 生成）

### 4.1 HTML + JS（コピペ用）

```html
<script src="core/engine/utils.js"></script>
<script src="core/engine/buffs.js"></script>
<script src="core/engine/bulk.js"></script>
<script src="core/engine/commands.js"></script>
<script src="core/engine/store.js"></script>
<script>
  const store = JetPaletteEngine.createStore();

  // 1) 判定ラベルを追加
  const judgeIndex = store.addItem('judge', {
    name: '命中(ロングソード)',
    roll: '1d20'
  });

  // 2) バフを追加（対象は「すべての判定」）
  store.addItem('buff', {
    name: 'フォーカス',
    effect: '+2',
    targets: ['all-judge'],
    color: '#56ccf2',
    memo: '判定+2',
    showSimpleMemo: true,
    active: true
  });

  // 3) コマンド生成
  const command = store.generateCommands('judge', judgeIndex, {
    targetType: 'gte',
    targetValue: '12'
  });

  if (command) {
    console.log(command.text);
    // => "1d20+2>=12 命中(ロングソード)"
  }
</script>
```

### 4.2 `examples/engine-minimal.html`

- ブラウザで開くだけで動く最小例を用意しています。
- `examples/engine-minimal.html` を開き、生成結果を確認してください。

### 4.3 `examples/engine-minimal-snippet.html`

- コピペ向けにHTML+JSだけを抜き出した最小スニペットです。
- ドキュメントや外部プロジェクトへ流用する場合に活用してください。

---

## 5. 参考メモ

- `bulkAdd` の `<カテゴリ>` ブロック構文や `|` 区切りは、UIからの一括登録に利用しています。
- `generateCommands` はバフ効果の合成やスロット展開を行い、`text` と `html` を返します。

---

## 6. `script.js` 機能分類と分割方針

現行の `script.js` は UI とデータ処理が混在しているため、以下の5領域に分類して分割します。
キーワードである「テーマ管理」「コンテキストメニュー」「トースト通知」は **UI** と **ユーティリティ** に跨る前提で整理します。

### 6.1 分類（現状の責務）

| 区分 | 主な役割 | 代表的な責務/機能 |
| --- | --- | --- |
| UI | DOM操作・表示更新 | コンテキストメニュー、テーマ管理、トースト通知、モーダル/セクション/リスト描画、ドラッグ&ドロップ、オートコンプリート表示 |
| 状態管理 | UI状態と永続化 | `uiState`、localStorageのUI状態保存/復元、選択状態の同期 |
| エンジン連携 | `JetPaletteEngine` との境界 | `createStore`、`store.getState`/`setState`/`addItem`/`bulkAdd`/`generateCommands` 呼び出し、カテゴリ/ラベル更新 |
| 変換 | 入出力の整形/変換 | JSONインポート/エクスポート、バフ/ラベルの `|` 連結形式の生成、対象ラベルのテキスト化 |
| ユーティリティ | 共通ロジック | HTMLエスケープ、カラー検証/算出、UUID生成、テーマ色取得、モーダル取得補助 |

### 6.2 分割方針（モジュール境界の例）

> 既存の `script.js` を段階的に分割し、`index.html` からはエントリポイントのみを読み込む形を目標とします。

#### UI (`ui/*`)
- `ui/context-menu.js`: コンテキストメニュー生成/表示/アクション登録。
- `ui/theme.js`: テーマ管理（`applyTheme`/`initTheme`/`updateThemeToggle`）、テーマ色に基づくUI更新。
- `ui/toast.js`: トースト通知 (`showToast`) とスタイル挿入。
- `ui/sections.js`: 折りたたみセクション管理 (`toggleSection`/`loadUIState`/`saveUIState`)。
- `ui/renderers/`: `renderBuffs`/`renderPackage`/`renderMacroDictionary` 等の描画ロジック。
- `ui/modals/`: `openBuffModal`/`openJudgeModal`/`openAttackModal` とフォーム初期化。

#### 状態管理 (`state/*`)
- `state/ui-state.js`: `uiState` の定義と更新API。
- `state/persistence.js`: `uiState` と `localStorage` の保存/復元。
- `state/selection.js`: マルチセレクトや選択状態の同期。

#### エンジン連携 (`engine/*`)
- `engine/store.js`: `JetPaletteEngine.createStore` の初期化と依存注入（`validateColor`, `getDefaultBuffColor`）。
- `engine/buff-ops.js`: バフ追加・更新・ターン進行などストア操作に紐づく処理。
- `engine/package-ops.js`: 判定/攻撃ラベルとカテゴリ操作（追加/更新/削除/並び替え）。

#### 変換 (`convert/*`)
- `convert/import-export.js`: JSON/テキストの入出力（`importData`/`exportData`/ユーザー辞書入出力）。
- `convert/formatters.js`: `formatBuffForBulk`/`formatPackageForBulk`/対象テキスト化など変換系関数。

#### ユーティリティ (`utils/*`)
- `utils/dom.js`: `escapeHtml`/`getActiveModal` などDOMヘルパー。
- `utils/color.js`: `getContrastColor`/`validateColor`/`getThemeColorValue`/`getDefaultBuffColor`。
- `utils/uuid.js`: `generateUUID`。

### 6.3 移行の優先順位（推奨）

1. **ユーティリティ** を切り出し、他モジュールから参照できるようにする。
2. **UI（テーマ管理・コンテキストメニュー・トースト通知）** を `ui/*` に移動して責務を明確化。
3. **状態管理** と **変換** を切り出し、UIから依存する関数を最小化。
4. **エンジン連携** をまとめて `engine/*` に集約し、`script.js` には初期化と配線のみ残す。
