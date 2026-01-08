<!-- codex: 今後実施される改修作業に支障をきたさないための資料を適宜追記すること -->

# BEM命名規則

本プロジェクトでは `block__element--modifier` を採用します。

* **block**: 機能単位（例: `header`, `section`, `modal`, `item-list`）
* **element**: blockの構成要素（例: `header__menu`, `item-list__item`）
* **modifier**: 状態/バリエーションに限定（例: `button--primary`, `modal--open`）

## 命名変更前後の対応表（簡易）

| 既存クラス | BEM命名例 | 置き換え基準 |
| --- | --- | --- |
| `.container` | `.app` | 画面全体を包む1ブロックとして扱う |
| `.content` | `.app__content` | `.app` 配下の主要コンテンツ領域 |
| `.header-menu` | `.header__menu` | `header` ブロックの構成要素 |
| `.header-menu-item` | `.header__menu-item` | メニュー項目は `header` の要素 |
| `.logo` | `.header__logo` | ヘッダー内のロゴ要素 |
| `.modal` | `.modal` | 単体のUIブロックとして維持 |
