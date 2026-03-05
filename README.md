# Repo Jump

GitHub リポジトリ間を素早く移動する Chrome 拡張機能。
どのページからでも Cmd+K でコマンドパレットを開き、fuzzy search でリポジトリを絞り込んで即座に遷移できる。

## 特徴

- どのページからでも `Cmd+K` (Mac) / `Ctrl+K` (Windows) でパレットを呼び出せる
- fuzzy search によるリポジトリ名のインクリメンタルサーチ
- スペースキーで遷移先を選択（Code / Issues / Pull Requests / Actions）
- 最近開いたリポジトリの履歴（最大50件）を優先表示
- 個人リポジトリ + 所属 Organization のリポジトリを一括取得

## インストール

1. このリポジトリを clone する
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、clone したディレクトリを選択

## セットアップ

1. GitHub で Personal Access Token (Classic) を作成する
   - 必要なスコープ: `repo`, `read:org`
2. Chrome ツールバーの Repo Jump アイコンをクリック
3. PAT を入力して「保存」をクリック
4. 「リポジトリを更新」ボタンをクリックしてリポジトリ一覧を取得

## 使い方

1. 任意のページで `Cmd+K` (Mac) / `Ctrl+K` (Windows) を押してパレットを開く
2. リポジトリ名を入力して fuzzy search で絞り込む
3. `Enter` で選択したリポジトリの Code ページに新規タブで遷移
4. スペースを入力すると遷移先選択モードに切り替わる
   - 例: `repo-jump iss` → repo-jump の Issues ページ
5. `↑` `↓` で候補を移動、`Escape` で閉じる

## キーボードショートカット

| キー | 動作 |
|------|------|
| `Cmd+K` / `Ctrl+K` | パレットの開閉 |
| `↑` `↓` | 候補の選択移動 |
| `Enter` | 選択した候補に遷移 |
| `Escape` | パレットを閉じる |
| `Space` | 遷移先選択モードに切り替え |
| `Backspace`（遷移先が空のとき） | リポジトリ検索モードに戻る |
