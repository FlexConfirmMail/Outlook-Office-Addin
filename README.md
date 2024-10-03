# FlexConfirmMail for Outlook with Office addin

## 開発者向け動作確認方法

### 準備

* Microsoft 365 developer programへの参加
  * https://learn.microsoft.com/ja-jp/office/developer-program/microsoft-365-developer-program
  * OutlookのWindowsクライアントもダウンロードしておく
    * Adminセンター->Admin->Subscriptions->Microsoft 365 E5 Developer 試用版->Download and install softwareからダウンロードする
* Go
  * https://go.dev/doc/install
* Node.jsおよびnpm
  * https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-installer-to-install-nodejs-and-npm

### アドインの静的サイトファイルのビルド

* リポジトリのホームに移動し、`build.bat`を実行する
  * アドイン用サイトをビルドする。成果物の静的サイト用ファイルはdistフォルダに作成される。

これは、以下の処理を実行している。

* `npm install`
  * npmの必要なモジュールをインストール（リポジトリのモジュールが更新された場合には再実行）
* `nxp webpack`
   * JavaScriptをまとめつつ、リリース用フォルダのdistフォルダに成果物の静的サイト用ファイルを出力する

### サンプルのパーソナルHTTPS Webサーバーの作成

* リポジトリのホームに移動し、管理者権限のコマンドプロンプトから`build-web-server.bat`を実行する
  * `local-web-server-keys`フォルダにローカルHTTPSサーバー用の自己署名証明書を作成する。
  * 自己署名証明書を信頼されたルート証明機関の証明書としてインポートする
  * `local-web-server`フォルダにHTTPSサーバーのexeおよび必要なキーファイルを作成する（`local-web-server-keys`フォルダからのコピー）

これは、以下の処理を実行している。
実際の処理は`build-and-import-keys.bat`および`build-web-server.bat`を参照のこと。

* `go run tools\generate_cert\generate_cert.go --host 127.0.0.1`
  * 自己証明書およびサーバー秘密鍵用の作成
*   `copy cert.pem cert.crt`
  * 自己署名証明書をインストール可能な形式に変更
* `certutil -addstore ROOT cert.crt`
  * 自己署名証明書を信頼されたルート証明機関の証明書としてインポートする
* `go build tools\https_server\https_server.go`

パーソナルHTTPS Webサーバーの仕様は以下の通り。

ファイル名: https_server.exe
引数: --root Webサーバーのルートパスを指定する。デフォルトは.\web
概要: --rootで指定されたパスをhttps://127.0.0.1:10041でホスティングする。
      https_server.exeと同じフォルダに`key.pem`（サーバー用秘密鍵）と`cert.pem`（自己署名証明書）が必要。

### テスト用にパーソナルHTTPS Webサーバーを起動する

`tests\run-test-server`に移動し、管理者権限のコマンドプロンプトから`run-test-server.bat`を実行する。

実行すると、以下の処理を実行する。

* アドインの静的サイトファイルを`dist`に作成
* 自己署名証明書およびサーバー秘密鍵がなければ作成
* 自己署名証明書のインポート
* パーソナルHTTPS Webサーバーのビルド
* `dist`を`tests\run-test-server\web`にコピー
* テスト用の設定ファイル`tests\run-test-server\configs`を`tests\run-test-server\web`にコピー
* パーソナルHTTPS Webサーバーで`tests\run-test-server\web`をホスティング
  * https://127.0.0.1:10041でアクセスできるようになる

#### `src`配下の変更を`tests\run-test-server\web`に自動で反映する

`run-test-server.bat`を実行中に、`src`配下への変更を`tests\run-test-server\web`に自動で反映したい場合、
別のコマンドプロンプトを開き、本リポジトリのルートで以下のnpmコマンドを実行する。

```
npm run watch:run-test-server
```

上記のコマンドを実行すると、10秒ごとに`src`の変更を監視し、変更があればリビルドして`tests\run-test-server\web`に出力する。
上記コマンド実行時、証明書のインポートを求められた場合はインポートすること。

### Outlookでのテストを行う。

* 以下のいずれかの方法でアドイン追加ページを呼び出す
  * デスクトップアプリ
    * 「テスト用にパーソナルHTTPS Webサーバーを起動する」の手順を実施し、Webサーバーを起動する
    * Windowsクライアント版のOutlookを起動する
    * [ファイル]->[アドインの管理]を選択する
  * Webアプリ
    * https://aka.ms/olksideload にアクセスする
* Webブラウザで[Outlook 用アドイン]ページが開く 
* [個人用アドイン]->[カスタムアドイン]->[カスタムアドインの追加]を選択する
* [ファイルから追加]を選択する
* `flex-confirm-mail-outlook-web`リポジトリの`manifest.xml`を指定する
* [カスタムアドイン]にFlexConfirmMailが追加される

何らかのメールを送信しようとしたときに「FlexConfirmMail が要求を処理しています」というメッセージや、「FlexConfirmMail」というタイトルのダイアログが表示されれば正しくインストールできている。

なお、現状では、設定用のリボンのボタンなども存在しない。
設定はWebサーバーのconfigsフォルダー配下のファイルを直接編集する。

### デバッグ方法

#### Web版

F12で開発者ツールを開くことができるので、ログやデバッガーで動作を確認する。
アドインのHTMLやJavaScriptが読み込まれるのは、実際にアドインが使用されるときであるのに注意。
例えば、メール送信時のアドインは、メールを送信したときに呼び出される。

#### デスクトップアプリ版

FlexConfirmMailの警告ダイアログなど、すべてHTMLで実装されているページについては、F12で開発者ツールを開くことができる。
以降はWeb版と同様にデバッグが可能。

#### その他の方法

また、以下の手順にしたがい、フレームワークを利用したデバッグをすることも可能。
本プロジェクトの場合、Node.jsでのデバッグとなる。

https://learn.microsoft.com/ja-jp/office/dev/add-ins/testing/debug-add-ins-overview