import { ethers } from "ethers";
import "dotenv/config";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";
import { writeLogs } from "../../utils";

// This key is already public on Herong's Tutorial Examples - v1.03, by Dr. Herong Yang
// Do never expose your keys like this
const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";

const PROPOSALS = ["Revive Luna", "Kill UST", "Abandon Ship"];

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

async function main() {
  const wallet =
    process.env.MNEMONIC && process.env.MNEMONIC.length > 0
      ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
      : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
  writeLogs("Using address", wallet.address);

  const provider = ethers.providers.getDefaultProvider("ropsten");
  const signer = wallet.connect(provider);
  const balanceBN = await signer.getBalance();
  const balance = Number(ethers.utils.formatEther(balanceBN));
  writeLogs("Wallet balance", balance);

  if (balance < 0.01) throw new Error("Not enough ether");

  writeLogs("Deploying Ballot contract", {});
  writeLogs("Proposals", PROPOSALS);
  if (PROPOSALS.length < 2) throw new Error("Not enough proposals provided");
  PROPOSALS.forEach((element, index) => {
    writeLogs("Proposal N.", `${index + 1}: ${element}`);
  });

  const ballotFactory = new ethers.ContractFactory(
    ballotJson.abi,
    ballotJson.bytecode,
    signer
  );

  const ballotContract = await ballotFactory.deploy(
    convertStringArrayToBytes32(PROPOSALS)
  );

  writeLogs("Awaiting confirmations", {});
  await ballotContract.deployed();
  writeLogs("Completed", {});
  writeLogs("Contract deployed at", ballotContract.address);
  writeLogs("Querying proposals:", await ballotContract.proposals());
  writeLogs("", "")
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
