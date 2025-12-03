プロジェクト仕様書：Obsidian Research Factory (AI-Native Edition) に関する設計および実装規定版数: 2.2.0 (Gemma 3 対応決定版)状態: 🚀 実装フェーズ対象: 開発担当技術者技術スタック: TypeScript, Obsidian API, Google Gemini API (REST)1. 製品構想：「司書機能から参謀機能への昇華」1.1 概念枠組みの変革第0.1.0版までの本拡張機能においては、「文献資料の自動整理（Librarian）」機能の実装が完了した。第2.0.0版以降における開発目的は、本機能を**「研究戦略策定における参謀機能（Strategist）」**へと進化させることに存する。1.2 中核的価値：「研究間隙マトリックス」本システムの最終到達点は、Obsidian環境下における**「研究間隙マトリックス（Research Gap Matrix）」**の自動生成にある。当該機能の実現に際しては、大規模言語モデル（LLM）を活用し、論文抄録（Abstract）からの構造化データ抽出を行うものとする。その際、データの整合性を担保すべく、厳格なスキーマ制御を適用することが必須となる。2. システムアーキテクチャ（モデル非依存設計）「資金投入皆無」という制約事項を遵守しつつ、将来的なモデルの変遷（GeminiからGemma 3、さらにはローカルモデルへの移行等）に追随可能な、柔軟性を有するアーキテクチャを採用するものとする。graph LR
    subgraph "Obsidian Environment"
        A[Note Generator] -->|Check Hash| B{Changed?}
        B -- Yes --> C[AI Service]
        B -- No --> D[Skip AI]
        
        C -- "Abstract + Schema" --> E[Google Gemini API]
    end
    
    subgraph "Google Cloud"
        E -- "Inference (Gemma 3 / Gemini 1.5)" --> F[Structured JSON]
    end
    
    F --> C
    C --> A
    A -->|Write Frontmatter| G[Markdown Note]
    A -->|Log Error| H[.jsonl Log]

3. 機能要件3.1 AI抽出エンジン (GeminiService)実装にあたっては、ソフトウェア開発キット（SDK）の使用を排し、標準的な requestUrl 関数を用いることとする。また、使用するモデル名称については、設定画面において変更可能な仕様とする。接続先: Google Gemini API (REST)モデル設定: 初期設定値は gemini-1.5-flash とする。利用者による設定変更により gemma-3-27b-it 等への変更を可能とする。入力: 論文抄録および利用者定義による分類候補一覧出力: 厳格なJSON形式。コードブロック（```json）を含まない平文形式を要求するものとする。3.2 スキーマおよび検証（列挙型制御）Dataviewにおける集計処理の安定性を確保するため、自由記述形式を排し、「選択式」によるデータ抽出を基本原則とする。候補一覧（利用者設定にて定義）:Task Candidates: $$"Structure Prediction", "Docking", "Generation", ...$$Method Candidates: $$"Diffusion", "Transformer", "GNN", "SELEX", ...$$Target Candidates: $$"RNA", "Protein", "Small Molecule", ...$$代替規則: 定義された候補に該当しない場合においては、Unknown または Other を出力させるものとする。3.3 冪等性およびコスト管理（知的キャッシュ）APIへの過剰なリクエストを抑制するため、以下の論理構造を実装するものとする。ハッシュ照合: ノートのFrontmatterに含まれる ai_abstract_hash と、現在の抄録のハッシュ値（MD5/SHA256）を比較照合する。両者が一致した場合には処理を省略する。レート制限対策:リクエスト間隔の制御を行う（例：1秒あたり1リクエスト）。エラー発生時には、当該ノートに関するAI処理のみを省略し、次なるノートの処理へと移行する（全体処理の停止は行わない）。3.4 エラー処理およびログ記録JSONの厳密性:構文解析に失敗した場合には、応答データの原文をプラグインフォルダ内の logs/extraction_errors.jsonl へ追記保存する仕様とする。これは、プロンプトの改善サイクルを確立することを目的とする。利用者に対しては、「AI抽出失敗」の旨をステータスバーまたはログを通じて通知するものとする（ポップアップ通知の連続表示は回避すること）。4. データ設計（Frontmatterスキーマ）将来的なモデルの移行およびデータの再抽出に備え、来歴情報（Provenance）としてのメタデータを記録するものとする。---
citekey: smith2024diffusion
title: "Score-based generative modeling for aptamer design"
year: 2024
tags: [topic/diffusion, topic/aptamer]

# --- AI Generated Structured Data ---
task: "Generation"             # Enum: [Prediction, Docking, Generation]
method_class: "Diffusion"      # Enum: [Diffusion, Transformer, GNN]
target: "Aptamer"              # Enum: [RNA, Protein, Aptamer]
gap: "High computational cost" # Free text (max 15 words)
ai_summary:
  - "拡散モデルを用いた初のアプタマー生成手法"
  - "推論速度に課題あり"

# --- AI Metadata (Provenance) ---
ai_model: "gemma-3-27b-it"
ai_version: "v2.0.0"
ai_extracted_at: "2025-12-04T10:00:00Z"
ai_abstract_hash: "a1b2c3d4e5..." # Abstract本文のハッシュ値
---

5. ユーザーインターフェース（設定）AIモデル名称: テキスト入力形式（例：gemma-3-27b-it）。候補一覧:課題一覧（カンマ区切り）手法一覧（カンマ区切り）対象一覧（カンマ区切り）システムプロンプト: 上記候補一覧を埋め込むテンプレートを初期設定として用意するものとする。6. 実装工程計画第2.1フェーズ：堅牢なAIサービスの構築$$ $$ src/services/GeminiService.ts の実装。モデル名称を引数として受け取る設計とすること。エラー発生時の .jsonl 出力機能を実装すること。$$ $$ 設定画面へのモデル名称および候補一覧入力欄を追加すること。第2.2フェーズ：ロジックの組み込み$$ $$ NoteGenerator へハッシュ計算ロジックを追加すること。$$ $$ プロンプト構築機能の実装（利用者定義リストをプロンプトへ注入すること）。第2.3フェーズ：試験および調整$$ $$ バッチ処理時におけるレート制限挙動の確認を行うこと。$$ $$ 構文解析エラー時におけるログ出力の確認を行うこと。開発者への注記:「モデルは変遷し得るものであり、かつ大規模言語モデル（LLM）は過誤を犯す可能性がある」という前提に基づき、コードの記述を行うこと。正常終了時には整合性の取れたFrontmatterを生成し、異常終了時には有用なエラーログを保存することが、良質なツールの要件である。