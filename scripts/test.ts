import { KEYSTORE } from "configuration";
import { Wallet, HDNodeWallet, Mnemonic } from "ethers";

async function main() {
  // const wallet = Wallet.fromPhrase(KEYSTORE.default.mnemonic.phrase);
  const wallet = HDNodeWallet.fromMnemonic(
    Mnemonic.fromPhrase(KEYSTORE.default.mnemonic.phrase),
    KEYSTORE.default.mnemonic.basePath
  );
  console.log(wallet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
