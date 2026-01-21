## エンジン設計メモ

- `script.js` からの抽出候補とAPI案: [manual/engine.md](manual/engine.md)
- エンジンの使い方（実装済みAPI）: [manual/engine.md#エンジンの使い方](manual/engine.md#エンジンの使い方)

## エンジン配布方針

- 配布形態: **ESM 単一ファイル `dist/engine.js`** を公式配布物とする（バンドル済み）。  
  - 利用者は `<script type="module">` から直接 import できる形を想定。
  - 依存管理の負担を避けるため、**ESM モジュール一式での配布は当面行わない**。
  - 将来的に型定義や補助ツールを追加する場合は、`dist/` に併置して拡張。
- 生成方法: `npm run build:engine` で `core/engine/*.js` を束ねた `dist/engine.js` を生成する。

## `index.html` での読み込み例

```html
<!-- index.html -->
<script type="module">
  import { createStore } from "./dist/engine.js";

  const store = createStore();
  // store.getState() / store.setState() などの API を利用
</script>
```

## 派生アプリでの組み込み例

```html
<!-- 例: 派生アプリ側で配布物を同梱する場合 -->
<script type="module">
  import { createStore } from "./vendor/jet-pallet/engine.js";

  const store = createStore();
  // 派生アプリの UI/状態管理と連携して利用
</script>
```

```js
// 例: ビルドツール経由で読み込む場合（任意のバンドラー設定に合わせる）
import { createStore } from "./dist/engine.js";

const store = createStore();
// store の出力を派生アプリの状態にマッピングする
```

## 互換性ポリシーと変更方針

- エンジン API は **Semantic Versioning (MAJOR.MINOR.PATCH)** を採用する。
- 破壊的変更は **MAJOR** を更新し、API設計.mdで事前告知する。
- **MINOR** は後方互換の機能追加、**PATCH** は互換性を保つ修正を対象とする。
- 既存 API の削除・仕様変更は、**非推奨の告知 → 次の MAJOR で削除** の順で進める。
