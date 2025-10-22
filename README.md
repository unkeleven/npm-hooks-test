# npm install 時に動作するLife Cycle Scriptsの動作確認環境

このリポジトリは、**npm のLife Cycle Scripts（preinstall / install / postinstall など）** が 実際にどのタイミングで実行されるのかを確認するためのものです。
今回はnpmのパッケージを自作し、それを自分でインストールしてみて、どのフックが実際に動くのかを確認します。



## 目的

npm のLife Cycle Scriptsは、npm が `install` などの操作を行う際に 自動的に呼び出すスクリプトのことです。

たとえば、`preinstall`, `install`, `postinstall` といったスクリプトは  
パッケージがインストールされるときに順番に実行されます。

> ※ `npm pack` 実行時に動く `prepack` / `postpack` なども同じカテゴリに属しますが、今回は扱いません。



```
├── my-hooks-pkg/   ← 自作のnpmパッケージ（各フックの挙動をログ出力）
└── test-app/       ← それを install してLife Cycle Scriptsの挙動を確認するためのアプリ
```

------



## 実行環境

* Node.js 18 以上（推奨: 18 LTS / 20系）  
* npm 8 以上  
* macOS / Linux で動作確認済み



## ディレクトリ構成

```
npm-hooks-lab/
├── my-hooks-pkg/
│   ├── package.json
│   ├── index.js
│   ├── scripts/
│   │   └── log.js
│   └── hooks.log      ← 実行ログ（自動追記）
│
└── test-app/
    ├── package.json
    ├── index.js
    └── node_modules/
```



## my-hooks-pkgの主な内容

### package.jsonから抜粋

```json
{
  "scripts": {
    "preinstall": "node scripts/log.js preinstall",
    "install": "node scripts/log.js install",
    "postinstall": "node scripts/log.js postinstall",
    "prepublish": "node scripts/log.js prepublish",
    "preprepare": "node scripts/log.js preprepare",
    "prepare": "node scripts/log.js prepare",
    "postprepare": "node scripts/log.js postprepare"
  }
}
```

Life Cycle Scriptsを並べて定義しています。
たとえば、`preinstall`が起動したら、`node scripts/log.js preinstall` が実行されます。

### log.js（my-hooks-pkg/scripts/log.js）

```js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const event = process.argv[2];
if (!event) {
  console.error('[log.js] Missing event name. Usage: node scripts/log.js <event>');
  process.exit(1);
}
const msg = `[${new Date().toISOString()}] ${event} in ${process.cwd()}\n`;

try {
  fs.appendFileSync(path.join(__dirname, '..', 'hooks.log'), msg);
} catch (e) {
  console.error('Failed writing hooks.log:', e);
  process.exit(0);
}
```

#### 処理の流れ

1. npm がどのスクリプトを実行したか (`preinstall`, `install`, etc.) を取得
2. 日時・イベント名・実行場所をログ文字列にまとめる
3. `hooks.log` に出力




## 手順
### 1. テスト用パッケージを作成する（npm pack）

まず `my-hooks-pkg` に移動し、tarball（`.tgz`）を作成します。

```sh
cd my-hooks-pkg
npm pack
```

生成された `my-hooks-pkg-0.1.0.tgz` は「公開用に固めた状態のパッケージ」です。
 これを次のステップでテストアプリにインストールします。


### 2. テストアプリでインストールして挙動を確認

```sh
cd ../test-app
npm install ../my-hooks-pkg/my-hooks-pkg-0.1.0.tgz
```

#### このとき実行されるスクリプト

- `preinstall`
- `install`
- `postinstall`

これらのイベントが走ると、 `hooks.log` に以下のようなログが追記されます。

```
[2025-10-21T05:20:43.812Z] preinstall in /Users/hoge/develop/npm-hooks-lab/test-app
[2025-10-21T05:20:43.917Z] install in /Users/hoge/develop/npm-hooks-lab/test-app
[2025-10-21T05:20:44.001Z] postinstall in /Users/hoge/develop/npm-hooks-lab/test-app
```

`package.json`には、`preinstall`, `install`, `postinstall`以外のフックスクリプトも記載していますが、それについては、下部[package.json内でのLife Cycle Scriptsの記述についての補足](#package.json内でのLife Cycle Scriptsの記述についての補足)を参照ください。


### 3. --ignore-scripts で挙動を比較

```sh
rm -rf node_modules package-lock.json
npm install --ignore-scripts ../my-hooks-pkg/my-hooks-pkg-0.1.0.tgz
```

#### 期待する結果

- `preinstall / install / postinstall` は **実行されません**
- `hooks.log` にも **新しい行が追加されません**

これで、`--ignore-scripts` がLife Cycle Scriptsを無効化することを確認できます。



## package.json内でのLife Cycle Scriptsの記述についての補足

[公式ドキュメント](https://docs.npmjs.com/cli/v8/using-npm/scripts)には、以下のような記述があります。

```
npm install
These also run when you run npm install -g <pkg-name>

preinstall
install
postinstall
prepublish
preprepare
prepare
postprepare
```

そのため、`my-hooks-pkg/package.json` では、次のようにスクリプトを定義しています。

```json
{
  "scripts": {
    "preinstall": "node scripts/log.js preinstall",
    "install": "node scripts/log.js install",
    "postinstall": "node scripts/log.js postinstall",
    "prepublish": "node scripts/log.js prepublish",
    "preprepare": "node scripts/log.js preprepare",
    "prepare": "node scripts/log.js prepare",
    "postprepare": "node scripts/log.js postprepare"
  }
}
```

ただし、実際に npm install を実行した際に起動するのは、上記のうち
preinstall, install, postinstall の3つのみです。

npm公式ドキュメント によると、`prepublish` はすでに deprecated（非推奨） となっています。

また、preprepare および postprepare については、ドキュメント内に記述が見当たりませんでした。

prepare については、以下のように publish および pack のタイミングで実行されると説明されています。

> Runs any time before the package is packed, i.e. during npm publish and npm pack.

したがって、今回のように「他者が npm install で依存としてインストールする」ケースでは、
prepare / preprepare / postprepare は実行されません。




## 📘 参考

- [npm Docs: scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [npm Docs: Life Cycle Scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts#life-cycle-scripts)

