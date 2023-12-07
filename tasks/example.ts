import { task } from "hardhat/config";

export const hello = task("hello", "Prints 'Hello, World!'", async () => {
  console.log("Hello, World!");
});
