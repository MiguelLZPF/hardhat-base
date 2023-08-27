import { KEYSTORE } from "configuration";
import { Wallet, Provider, HDNodeWallet, ProgressCallback, SigningKey } from "ethers";
import { checkDirectoriesInPath, gProvider } from "scripts/utils";

export default class CustomWallet extends Wallet {
  constructor(
    key: string | SigningKey = KEYSTORE.default.privateKey,
    provider: Provider = gProvider
  ) {
    super(key, provider);
  }

  static override createRandom(provider: Provider = gProvider): HDNodeWallet {
    return super.createRandom(provider);
  }

  static override fromPhrase(
    phrase: string = KEYSTORE.default.mnemonic.phrase,
    provider: Provider = gProvider,
    path: string = KEYSTORE.default.mnemonic.path
  ): HDNodeWallet {
    return HDNodeWallet.fromPhrase(
      phrase.toLowerCase() === "default" ? KEYSTORE.default.mnemonic.phrase : phrase,
      path
    ).connect(provider);
  }

  static override async fromEncryptedJson(
    json: string,
    password: string | Uint8Array = KEYSTORE.default.password,
    progress?: ProgressCallback,
    isAbsolutePath = false,
    provider = gProvider
  ): Promise<Wallet | HDNodeWallet> {
    if (!isAbsolutePath) {
      // remove "/"
      json = json[0] == "/" ? json.substring(1) : json;
      // add .json extension
      json = json.endsWith(".json") ? json : `${json}.json`;
      // full path relative to project root. example: keystore/relativePath"
      json = `${KEYSTORE.root}/${json}`;
    }
    checkDirectoriesInPath(json);
    return (await super.fromEncryptedJson(json, password, progress)).connect(provider);
  }
  static override fromEncryptedJsonSync(
    json: string,
    password: string | Uint8Array = KEYSTORE.default.password,
    isAbsolutePath = false,
    provider: Provider = gProvider
  ): Wallet | HDNodeWallet {
    if (!isAbsolutePath) {
      // remove "/"
      json = json[0] == "/" ? json.substring(1) : json;
      // add .json extension
      json = json.endsWith(".json") ? json : `${json}.json`;
      // full path relative to project root. example: keystore/relativePath"
      json = `${KEYSTORE.root}/${json}`;
    }
    checkDirectoriesInPath(json);
    return super.fromEncryptedJsonSync(json, password).connect(provider);
  }

  override async encrypt(
    password: string | Uint8Array = KEYSTORE.default.password,
    progressCallback?: ProgressCallback | undefined
  ): Promise<string> {
    return super.encrypt(password, progressCallback);
  }
  override encryptSync(password: string | Uint8Array = KEYSTORE.default.password): string {
    return super.encryptSync(password);
  }
}
