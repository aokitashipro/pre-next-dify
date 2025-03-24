Webhook Secret の取得方法：
Stripeダッシュボードの「開発者」→「Webhooks」セクションに移動
「エンドポイントを追加」をクリック
エンドポイントURLにhttp://localhost:3000/api/stripe/webhookを入力
イベントとして少なくとも以下を選択：
checkout.session.completed
invoice.payment_succeeded
customer.subscription.updated
customer.subscription.deleted
エンドポイント作成後、「署名シークレットを表示」をクリックしてシークレットをコピー
.envファイルのSTRIPE_WEBHOOK_SECRETにコピーしたシークレットを設定
Price ID の取得方法：
Stripeダッシュボードの「製品」セクションに移動
新しい製品を作成（まだなければ）：
名前を設定（例：「Proプラン」）
料金を設定（月額10ドル）
「定期請求」を選択
「毎月」を選択
製品作成後、その製品の「API ID」（price_で始まる）をコピー
.envファイルのSTRIPE_PRO_PRICE_IDにコピーしたIDを設定
これらの設定が完了したら、アプリケーションを再起動して再度試してみてください。また、Stripeのテストモードで操作していることを確認してください（テストモードのAPIキーを使用している場合は問題ありません）。

Stripe CLIを使用することで、公開URLがなくてもWebhookをテストできます。この方法はStripeの公式にも推奨されています。

以下の手順で設定できます：

### 1. Stripe CLIのインストール

**Macの場合**:
```
brew install stripe/stripe-cli/stripe
```

### 2. Stripe CLIでログイン
```
stripe login
```
このコマンドを実行すると、ブラウザが開いてStripeアカウントへのアクセスを許可する画面が表示されます。

### 3. Webhookをローカル環境に転送
アプリケーションが稼働しているポート（今回は3000番）に転送します：
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

このコマンドを実行すると、以下のようなメッセージが表示されます：
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxx
```

### 4. 表示されたWebhook Secretを.envファイルに設定
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### 5. 別のターミナルを開いてアプリケーションを起動
```
npm run dev
```

これで、Stripe CLIが実際のStripeからのWebhookイベントをローカル環境に転送するようになります。Proプランへのアップグレードを試すと、Stripe CLIのターミナルでイベントのログが表示されるはずです。