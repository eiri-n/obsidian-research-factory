プロジェクト仕様書：Obsidian Research Factory（コミュニティプラグイン版）

版数: 2.0.0 (リリース候補版仕様)
状態: 🚀 公開リリースに向けた設計段階
対象利用者: 世界的研究者層 (目標利用者数 10,000名以上)
技術スタック: TypeScript, Obsidian API, Node.js (fs)

1. 製品理念および市場価値

1.1 研究活動における未踏の連結環 (The Missing Link)

本拡張機能は、Paperpile（およびZotero、Mendeley等の文献管理システム）とObsidian間の「機能的断絶」を解消することを主たる目的とする。
既存の拡張機能（Citations等）が「検索および引用」に主眼を置いているのに対し、本機能は**「読解前のインボックス構築」および「読解後の知識蒸留」の自動化**に特化することにより、既存製品との明確な差別化を図るものである。

1.2 利用者獲得に向けた三つの基本公約

構成設定の排除 (Zero-Config Start):
導入に際しては、.bibファイルの選択のみを要件とする。Python環境の構築や複雑な設定操作は一切不要とする。

即時同期 (Live Sync):
文献管理システム側でのデータ追加操作に呼応し、Obsidian側において即座にノートが生成されるものとする。同期ボタン押下等の手動操作は排除される。

文脈の知的付与 (Smart Context):
単なるメタデータの転記に留まらず、利用者の研究領域に応じた「文脈（タグ・フォルダ）」が自動的に付与される機構を実装する。

2. 利用者体験 (UX) 設計

2.1 導入手順 (Onboarding Flow)

本機能を有効化した直後における利用者体験を以下の通り規定する。

初期設定ダイアログ (Welcome Modal):

「BibTeXファイル (.bib) の所在」を選択させる対話画面を表示する。

Paperpile利用者に対しては、Google Driveの標準パスをOSごとに自動提案する機能を実装する。

パス対応付け設定 (Mapping Configuration):

PDFフォルダの所在指定を実施する（任意項目とする）。

テンプレート選択 (Template Selection):

「Simple」「Academic」「Zettelkasten」の3種より、利用形態に適したプリセットを選択させる。

完了処理 (Done):

背景処理にて初期インデックス作成を開始する。処理完了次第、通知（トースト通知）を行うものとする。

2.2 設定画面構成 (Settings Tab)

YAMLファイルの直接編集を排除し、GUIによる操作環境を提供する。

全般設定 (General):

BibTeXファイルパス (ファイル選択UI)

監視モード: [自動 (Live)] / [手動]

インボックス設定 (Inbox Settings):

インボックスフォルダパス (初期値: _inbox)

アーカイブフォルダパス (初期値: _ref_notes)

自動タグ付与規則 (Auto-Tagging Rules - GUI):

[ + 規則追加 ] ボタン

規則定義例: If [Title/Abstract] contains "Aptamer", add tag "#topic/aptamer"

テンプレート設定 (Templates):

Handlebars/Mustache形式による変数埋め込みエディタ。

プレビュー機能を具備すること。

3. システムアーキテクチャ (TypeScript移行)

Python環境からTypeScript（Obsidian API）環境への完全移行を実施する。

3.1 全体構造図

graph TD
    subgraph "External System"
        A[Paperpile / Zotero] -->|Export| B(paperpile.bib)
        A -->|Sync| C[PDF Files]
    end

    subgraph "Obsidian Environment (Electron)"
        D[File Watcher (chokidar/fs)] -- Watches --> B
        D -- Event --> E[BibTeX Parser (JS)]
        
        E -- Extract Data --> F[Note Generator]
        F -- Apply Logic --> G[Tagging Engine]
        
        G -->|Create/Update| H(Obsidian Vault)
        
        I[Settings UI] -- Configures --> F
        I -- Configures --> G
    end


3.2 技術スタック変更詳細

コンポーネント

Python版 (旧)

Plugin版 (新)

採用事由および実装詳細

開発言語

Python

TypeScript

利用者環境への依存排除、およびObsidianネイティブ動作の実現のため。

監視機構

watchdog

Node.js fs.watch

デスクトップ版ObsidianはNode.js環境を内包するため、外部ファイル監視が可能である。

解析機構

bibtexparser

@retorquere/bibtex-parser

JS製において最も堅牢かつ高速なパーサーである。Zotero Better BibTeX開発者による維持管理が行われており、信頼性が高い。

テンプレート

f-string

Mustache / Nunjucks

条件分岐やループ処理等、利用者による柔軟な変数操作を可能にするため。

PDF連携

Symlink

URI Scheme / App Protocol

一般利用者にとって危険を伴うシンボリックリンクを排除し、file:/// または app:// プロトコルによる安全な外部ファイル参照を採用する。

4. コア機能詳細仕様

4.1 知的取込機構 (Smart Import Engine)

BibTeXファイルの変更検知時における論理動作を規定する。大量データの取り扱いを考慮し、処理性能に配慮すること。

差分更新 (Diff Update):

.bib ファイル全体の再解析による負荷を回避するため、前回解析時のハッシュマップをメモリ上に保持し、「差分（新規追加・更新）」のみを処理対象とする。

冪等性の確保 (Idempotency):

既にノートが存在する場合の挙動について、以下の「更新方針 (Update Policy)」を利用者が選択可能とする。

本文保護 (Protect Body): フロントマター（メタデータ）のみを更新し、本文は維持する。（初期設定）

上書き (Overwrite): 完全なる上書きを実施する。

無視 (Skip): 更新処理を行わない。

4.2 PDF処理戦略 ("Path Hell" Solution)

クロスプラットフォーム環境における最大の障壁である「絶対パス問題」に対する解決策を提示する。

パス対応付け (Path Mapping):

利用者は「PDFルートフォルダ」を指定するものとする。

本機能はBibTeX内の file フィールド（相対パスやクラウドパスを含む）を解析し、ローカル実在パスとの照合を行う。

開示動作 (Open Action):

OS規定のアプリケーションにて開く: window.open('file://' + path)

Obsidian内にて開く: PDFをVault内へ複製（またはインポート）する選択肢を提供する（iPad利用者向け）。

4.3 自動タグ付与UI (Auto-Tagging UI)

JSON/YAMLの直接記述を排除し、GUIによる規則作成環境を実装する。

規則エンジン (Rule Engine):

条件: Keywords (AND/OR/NOT 論理演算対応)

動作: Add Tag, Move to Folder, Set Property

例: "If abstract contains 'Transformer' AND year is > 2020, add tag '#method/LLM'"

5. モバイル環境（iOS/Android）への対応策

デスクトップ版とは異なり、モバイル版Obsidianにおけるサンドボックス制限により「外部.bibファイル」および「外部PDF」へのアクセスが制限される場合があることを考慮する。

5.1 モバイル制限対策

ハイブリッド・モード (Hybrid Mode):

PC環境: 全機能（監視・生成・PDFリンク）が動作するものとする。

モバイル環境: 生成済みノートの「閲覧」および「執筆」に特化する。

同期対応 (Sync Support):

Obsidian SyncまたはiCloud経由で同期された場合、PC環境にて生成されたノートはモバイル環境においても閲覧可能とする。

PDFリンクについては、モバイル環境下で file:/// プロトコルが機能しないため、**「PDFのVault内インポート」**を推奨設定とする（モバイル利用頻度が高い利用者向け）。

6. 実装工程計画 (Milestones)

第1工程: コア論理実装 (v0.1.0) - 内部アルファ版

[x] TypeScriptプロジェクトの構築 (obsidian-plugin-template)。

[ ] 外部 .bib ファイルの読込および解析処理の実装。

[ ] 設定画面（ファイルパス指定）の実装。

[ ] 基本的Markdown生成およびVaultへの保存処理の実装。

第2工程: 監視およびUI実装 (v0.5.0) - クローズドベータ版

[ ] fs.watch による自動同期機能の実装。

[ ] タグ付与規則のGUI実装。

[ ] テンプレートエンジンの組み込み。

[ ] エラー処理（BibTeX構文エラー時の通知等）の実装。

第3工程: 品質向上および性能試験 (v0.9.0) - パブリックベータ版

[ ] 5,000件以上の参照を含むBibTeXにおける性能試験の実施。

[ ] Windows/Mac/Linux環境におけるパス解決試験の実施。

[ ] 導入手順（初期設定ウィザード）の実装。

第4工程: コミュニティ公開 (v1.0.0)

[ ] Obsidian Community Plugins リポジトリへのPR提出。

[ ] 文書（README, デモGIF）の整備。

7. 開発者向け実装指針 (Guidelines for Implementation)

本仕様書に基づき実装を担当する技術者への指針を以下に示す。

堅牢性の確保:
利用者の .bib ファイルはデータ不整合を含む可能性が高い。解析エラーによる全体停止を回避すべく、例外処理（try-catch）を徹底し、問題箇所のみを無視してログ出力する設計とされたい。

UXにおける速度の重視:
同期処理の遅延は利用者の不安を招く要因となる。処理実行中はステータスバーにアイコンを表示し、稼働状況を常に可視化することを要する。

ライブラリ選定における注意:
ObsidianプラグインはWebpack/Esbuildによりバンドルされる仕様である。ネイティブバイナリに依存するライブラリの使用を避け、Pure JS/TSによるライブラリを選定されたい。

結語:
本プロジェクトが企図するのは単なる「Paperpileの拡張機能」に留まらず、「Obsidianを最強の研究開発環境へと昇華させるための原動機」となることである。1万人の研究者が、本コードを通じて新たな発見に至る未来を想定し、実装に当たられたい。