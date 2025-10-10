import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("JackPot", function () {
  let jackpot;
  let owner;
  let feeTreasury;
  let gateSigner;

  beforeEach(async function () {
    [owner, feeTreasury, gateSigner] = await ethers.getSigners();
    
    const JackPot = await ethers.getContractFactory("JackPot");
    jackpot = await JackPot.deploy(feeTreasury.address, gateSigner.address);
    await jackpot.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct fee treasury", async function () {
      expect(await jackpot.feeTreasury()).to.equal(feeTreasury.address);
    });

    it("Should set the correct gate signer", async function () {
      expect(await jackpot.gateSigner()).to.equal(gateSigner.address);
    });

    it("Should set the correct owner", async function () {
      expect(await jackpot.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await jackpot.FEE_BPS()).to.equal(250);
      expect(await jackpot.BPS()).to.equal(10000);
      expect(await jackpot.MAX_WINNERS()).to.equal(200);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to set cooldown", async function () {
      await jackpot.setCooldown(60);
      expect(await jackpot.cooldownSecs()).to.equal(60);
    });

    it("Should allow owner to set gate signer", async function () {
      const [, , , newSigner] = await ethers.getSigners();
      await jackpot.setGateSigner(newSigner.address);
      expect(await jackpot.gateSigner()).to.equal(newSigner.address);
    });

    it("Should not allow non-owner to set cooldown", async function () {
      await expect(
        jackpot.connect(feeTreasury).setCooldown(60)
      ).to.be.revertedWithCustomError(jackpot, "OwnableUnauthorizedAccount");
    });
  });
});
