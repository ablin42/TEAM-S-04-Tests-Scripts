import { ethers } from "ethers";
import "dotenv/config";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";
import { writeLogs } from "../../utils";

// This key is already public on Herong's Tutorial Examples - v1.03, by Dr. Herong Yang
// Do never expose your keys like this
const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";

// ? This script is used to create new wallets and fund them to be able to use them
// ? To interact with our ballot contract

async function main() {
  const mainWallet =
    process.env.MNEMONIC && process.env.MNEMONIC.length > 0
      ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
      : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
  writeLogs("Using address", mainWallet.address);

  const provider = ethers.providers.getDefaultProvider("ropsten");
  const signer = mainWallet.connect(provider);
  const balanceBN = await signer.getBalance();
  const balance = Number(ethers.utils.formatEther(balanceBN));
  writeLogs("Wallet balance", balance);

  if (balance < 0.01) throw new Error("Not enough ether");

  for (let i = 0; i < 10; i++) {
    writeLogs("Creating new account", {});
    let wallet = ethers.Wallet.createRandom();
    writeLogs("New wallet", {
      mnemonic: wallet.mnemonic.phrase,
      address: wallet.address,
      privateKey: wallet.privateKey,
    });

    const options = {
      to: wallet.address,
      value: ethers.utils.parseEther("0.1"),
    };

    writeLogs(`Sending 0.1 eth`, {from: mainWallet.address, to: wallet.address})
    const tx = await signer.sendTransaction(options);
    writeLogs("Awaiting confirmations", {});
    await tx.wait();
    writeLogs("Transaction completed. Hash:", tx.hash);
  }

  writeLogs("", "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
