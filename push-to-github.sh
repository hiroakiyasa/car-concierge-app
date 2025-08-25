#!/bin/bash

# GitHubリポジトリのURLを設定（ユーザー名を置き換えてください）
echo "GitHubのユーザー名を入力してください："
read GITHUB_USERNAME

# リモートリポジトリを追加
git remote add origin https://github.com/$GITHUB_USERNAME/car-concierge-app.git

# ブランチ名をmainに変更
git branch -M main

# GitHubにプッシュ
git push -u origin main

echo "✅ GitHubへのプッシュが完了しました！"
echo "📍 リポジトリURL: https://github.com/$GITHUB_USERNAME/car-concierge-app"