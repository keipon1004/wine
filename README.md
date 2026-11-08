# wine

個人用のワインテイスティング記録リポジトリです。**Markdown が正本**で、公開用 HTML は GitHub Pages で自動生成されます。

## 公開サイト（GitHub Pages）

- **URL（project Pages）:** merge 後に GitHub Actions がデプロイします。想定 URL は  
  **https://keipon1004.github.io/wine/**  
  （初回はリポジトリ Settings → Pages で **GitHub Actions** ソースになっていることを確認してください。実際の URL はデプロイ完了後に確定します。）
- `main` への push のたびに `.github/workflows/deploy-pages.yml` が `dist/` をビルドして公開します。
- ローカルビルド: `npm ci && BASE_PATH=/wine/ npm run build && npm run validate`

## 考え方

- **1回飲んだ = 1ファイル（正本）**  
  記録の本文は `logs/YYYY/YYYY-MM-DD_生産者_ワイン名.md` にだけ置きます。
- **インデックスはリンク集**  
  地域・品種ごとのファイル（`indexes/`）には **その記録への相対リンクのみ** を足します。同じ内容を複数ファイルに書き写しません。
- **ブレンド**  
  含まれる品種ごとに、該当する `indexes/grapes/*.md` から同じ記録ファイルへリンクします。
- **不明な項目**  
  ヴィンテージ・価格・産地など分からないものは **空欄または「不明」のまま**。推測で補完しません。
- **メモ原文**  
  テンプレートの「メモ（原文）」に、ざっくり書いたメモを **そのまま** 残します。

## Grok Bot で雑メモを整理する

飲んだあとにチャットやメモ帳に書いた断片（店名・感想・画像の説明など）を、Grok Bot に渡して整理できます。

1. 雑メモを貼る（事実と感想が混ざっていてよい）
2. Bot に「`templates/wine-log.md` に沿って1本の記録にまとめ、ファイル名案と足すべきインデックスリンクを出して」と頼む
3. 出力を確認し、足りない事実は空のままにする
4. `logs/YYYY/` に保存し、該当する地域・品種インデックスに **1行リンク** を追加

Bot は記録の **複製** ではなく **整形とリンク案** を手伝う想定です。正本は常に `logs/` だけです。

## ディレクトリ構成

```
.
├── README.md                 # このファイル
├── package.json              # 静的サイトビルド（marked）
├── scripts/                  # build-site.mjs / validate-site.mjs
├── site/assets/              # CSS / クライアント JS（絞り込み）
├── templates/
│   └── wine-log.md           # 記録の雛形
├── logs/
│   └── YYYY/                 # 年フォルダ（飲んだ年）
│       └── YYYY-MM-DD_生産者_ワイン名.md
└── indexes/
    ├── README.md             # インデックスの入口
    ├── regions/
    │   ├── france/
    │   │   ├── bordeaux.md
    │   │   └── burgundy.md
    │   └── japan/
    │       └── yamanashi.md
    └── grapes/
        ├── pinot-noir.md
        ├── chardonnay.md
        └── merlot.md
```

`indexes/regions/` と `indexes/grapes/` にある地域名・品種名は **置き場の例** です。実際に飲んだワインの記録は、あなたが `logs/` に追加してからインデックスを更新してください。

## 相対リンクの慣習

| リンク元 | 記録ファイルへの例 |
|----------|-------------------|
| `indexes/regions/france/bordeaux.md` | `../../../logs/2025/2025-03-01_生産者_ワイン名.md` |
| `indexes/grapes/pinot-noir.md` | `../../logs/2025/2025-03-01_生産者_ワイン名.md` |
| 記録ファイル内 → 品種インデックス | `../../indexes/grapes/pinot-noir.md` |

記録が増えたら年フォルダ（`logs/2025/README.md` など）で一覧しても構いません。

## 地域インデックスを細かくする

1つの地域ファイルが長くなったら、例としてボルドーを次のように分割できます。

```
indexes/regions/france/bordeaux/
├── README.md          # 左岸・右岸などへの目次
├── medoc.md
└── ...
```

親の `bordeaux.md` は目次に寄せるか、サブフォルダの README へリダイレクト用のリンクだけにします。**記録ファイルの場所は `logs/` のまま** 変えません。

## クイックリンク

- [記録の置き場所と命名規則](logs/README.md)
- [テンプレート](templates/wine-log.md)
- [インデックス一覧](indexes/README.md)
