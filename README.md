# JET-PALLET

TRPGオンラインセッションで発生するバフや状態を管理し、BCDice対応コマンドを生成できる支援ツールです。

### [JET-PALLET（試験版）](https://yytkd.github.io/JET-PALLET/)

# ツールの動作について

まだまだ開発途上ですので、バグが潜んでいる可能性があります。  
動きがおかしくなったと思った時は、ページの再読込をしてみてください。
過去のファイルに「BUFCON」という名称もありますが、初期の開発コードです。

# データについて

データはブラウザに保存されますが、今後のバージョンアップの際に消えることがあるかもしれません。  

# 実装検討中の機能など

- バフ/デバフ以外のラベル（判定・攻撃）やカテゴリのカラー設定
- 複数キャラクターを同時に扱えるタブ機能
- ユーザー辞書にカラーコードのカスタム変数を登録できる機能
- JSONファイルを書き出す出力方法
- オンラインでメンバーと状態を共有（だいぶ先）

# その他

htmlとjavascriptだけで動作するので、ローカルに保存しておけばネット接続が無くても使えます。  
ご意見、ご要望、バグ報告などありましたらお知らせいただけると幸いです。  
**[JTE-PALLET試用フィードバックフォーム](https://forms.gle/Z5YU8JaAVVUmWMaZ7)**



## エンジン設計メモ

- `script.js` からの抽出候補とAPI案: [manual/engine.md](manual/engine.md)
- エンジンの使い方（実装済みAPI）: [manual/engine.md#エンジンの使い方](manual/engine.md#エンジンの使い方)

## エンジン配布方針

- 配布形態: **ESM 単一ファイル `dist/engine.js`** を公式配布物とする（バンドル済み）。  
  - 利用者は `<script type="module">` から直接 import できる形を想定。
  - 依存管理の負担を避けるため、**ESM モジュール一式での配布は当面行わない**。
  - 将来的に型定義や補助ツールを追加する場合は、`dist/` に併置して拡張。

## `index.html` での読み込み例

```html
<!-- index.html -->
<script type="module">
  import { createEngine } from "./dist/engine.js";

  const engine = createEngine();
  // engine.load(data) などの API を利用
</script>
```

## 派生アプリでの組み込み例

```html
<!-- 例: 派生アプリ側で配布物を同梱する場合 -->
<script type="module">
  import { createEngine } from "./vendor/jet-pallet/engine.js";

  const engine = createEngine();
  // 派生アプリの UI/状態管理と連携して利用
</script>
```

```js
// 例: ビルドツール経由で読み込む場合（任意のバンドラー設定に合わせる）
import { createEngine } from "./dist/engine.js";

const engine = createEngine();
// engine の出力を派生アプリの状態にマッピングする
```

## 互換性ポリシーと変更方針

- エンジン API は **Semantic Versioning (MAJOR.MINOR.PATCH)** を採用する。
- 破壊的変更は **MAJOR** を更新し、README/マニュアルで事前告知する。
- **MINOR** は後方互換の機能追加、**PATCH** は互換性を保つ修正を対象とする。
- 既存 API の削除・仕様変更は、**非推奨の告知 → 次の MAJOR で削除** の順で進める。
