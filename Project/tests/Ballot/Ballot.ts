import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

async function giveRightToVote(ballotContract: Ballot, voterAddress: any) {
  const tx = await ballotContract.giveRightToVote(voterAddress);
  await tx.wait();
}

describe("Ballot", function () {
  let ballotContract: Ballot;
  let accounts: any[];

  this.beforeEach(async function () {
    accounts = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot");
    ballotContract = await ballotFactory.deploy(
      convertStringArrayToBytes32(PROPOSALS)
    );
    await ballotContract.deployed();
  });

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(proposal.voteCount.toNumber()).to.eq(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const chairperson = await ballotContract.chairperson();
      expect(chairperson).to.eq(accounts[0].address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const chairpersonVoter = await ballotContract.voters(accounts[0].address);
      expect(chairpersonVoter.weight.toNumber()).to.eq(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      const voter = await ballotContract.voters(voterAddress);
      expect(voter.weight.toNumber()).to.eq(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("The voter already voted.");
    });

    it("can not give right to vote for someone that has already voting rights", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("");
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    it("can not vote without the right to", async function () {
      const voter = accounts[1];
      await expect(ballotContract.connect(voter).vote(0)).to.be.revertedWith(
        "Has no right to vote"
      );
    });

    it("can not vote if it has already voted", async function () {
      const voter = accounts[1];
      await giveRightToVote(ballotContract, voter.address);

      await ballotContract.connect(voter).vote(0);
      await expect(ballotContract.connect(voter).vote(0)).to.be.revertedWith(
        "Already voted."
      );
    });
  });

  describe("when the voter interact with the delegate function in the contract", function () {
    it("can not delegate if already voted", async function () {
      const voter = accounts[1];
      await giveRightToVote(ballotContract, voter.address)

      await ballotContract.connect(voter).vote(0);
      await expect(ballotContract.connect(voter).delegate(accounts[0].address)).to.be.revertedWith(
        "You already voted."
      );
    });

    it("can not self delegate", async function () {
      const voter = accounts[1];
      await expect(ballotContract.connect(voter).delegate(voter.address)).to.be.revertedWith(
        "Self-delegation is disallowed."
      );
    });

    it("can not loop delegation", async function () {
      const voter = accounts[1];
      const attacker = accounts[2];
      await giveRightToVote(ballotContract, voter.address)

      await ballotContract.connect(attacker).delegate(voter.address);
      await expect(ballotContract.connect(voter).delegate(attacker.address)).to.be.revertedWith(
        "Found loop in delegation."
      );
    });

    it("can not delegate to wallet that cannot vote", async function () {
      const voter = accounts[1];
      await expect(ballotContract.connect(voter).delegate(accounts[5].address)).to.be.revertedWith(
        ""
      );
    });
  });

  describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
    it("can not give right to vote if not the chairperson", async function () {
      const voterAddress = accounts[1].address;
      const attacker = accounts[2];

      await expect(
        ballotContract.connect(attacker).giveRightToVote(voterAddress)
      ).to.be.revertedWith("Only chairperson can give right to vote.");
    });
  });

  describe("when the an attacker interact with the vote function in the contract", function () {
    it("can not vote without the right", async function () {
      const attacker = accounts[2];
      await expect(ballotContract.connect(attacker).vote(0)).to.be.revertedWith(
        "Has no right to vote"
      );
    });
  });

  describe("when the an attacker interact with the delegate function in the contract", function () {
    it("can not self delegate", async function () {
      const attacker = accounts[2];
      await expect(ballotContract.connect(attacker).delegate(attacker.address)).to.be.revertedWith(
        "Self-delegation is disallowed."
      );
    });

    it("can not loop delegation", async function () {
      const attacker = accounts[2];
      const voter = accounts[1];
      await giveRightToVote(ballotContract, voter.address)

      await ballotContract.connect(attacker).delegate(voter.address);
      await expect(ballotContract.connect(voter).delegate(attacker.address)).to.be.revertedWith(
        "Found loop in delegation."
      );
    });

    it("can not delegate to wallet that cannot vote", async function () {
      const attacker = accounts[2];
      const voter = accounts[1];
      await expect(ballotContract.connect(attacker).delegate(voter.address)).to.be.revertedWith(
        ""
      );
    });
  });

  describe("when someone interact with the winningProposal function before any votes are cast", function () {
    it("should return 0", async function () {
      const someone = accounts[2];
      expect(await ballotContract.connect(someone).winningProposal()).to.eq(0);
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
    const VOTED = "2";
    it("should return the winning proposal", async function () {
      const someone = accounts[2];
      await ballotContract.vote(VOTED);
      expect(await ballotContract.connect(someone).winningProposal()).to.eq(
        VOTED
      );
    });
  });

  describe("when someone interact with the winnerName function before any votes are cast", function () {
    it("should not return anything but the name of proposal 0", async function () {
      const someone = accounts[2];
      expect(await ballotContract.connect(someone).winnerName()).to.eq(
        ethers.utils.formatBytes32String(PROPOSALS[0])
      );
    });
  });

  describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
    const VOTED = "1";
    it("should not return anything but the name of the voted proposal", async function () {
      const someone = accounts[2];
      await ballotContract.vote(VOTED);
      expect(await ballotContract.connect(someone).winnerName()).to.eq(
        ethers.utils.formatBytes32String(PROPOSALS[VOTED])
      );
    });
  });

  describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    it("should not return anything but the name of the most voted proposal", async function () {
      const voteTracking = [0, 0, 0];
      for (let i = 1; i < 5; i++)
        await giveRightToVote(ballotContract, accounts[i].address);

      for (let i = 0; i < 5; i++) {
        const toVote = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
        voteTracking[toVote]++;
        await ballotContract.connect(accounts[i]).vote(toVote);
      }

      expect(await ballotContract.connect(accounts[2]).winnerName()).to.eq(
        ethers.utils.formatBytes32String(
          PROPOSALS[voteTracking.indexOf(Math.max(...voteTracking))]
        )
      );
    });
  });
});
