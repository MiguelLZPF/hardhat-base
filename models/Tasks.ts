export interface IGenerateWallets {
  relativePath: string;
  password: string;
  entropy: string;
  privateKey: string;
  mnemonicPhrase: string;
  mnemonicPath: string;
  batchSize: number;
  type: string;
}