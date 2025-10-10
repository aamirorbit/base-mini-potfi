import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PotFi", function () {
  let potfi;
  let owner;
  let feeTreasury;
  let gateSigner;

  beforeEach(async function () {
    [owner, feeTreasury, gateSigner] = await ethers.getSigners();
    
    const PotFi = await ethers.getContractFactory("PotFi");
    potfi = await PotFi.deploy(feeTreasury.address, gateSigner.address);
    await potfi.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct fee treasury", async function () {
      expect(await potfi.feeTreasury()).to.equal(feeTreasury.address);
    });

    it("Should set the correct gate signer", async function () {
      expect(await potfi.gateSigner()).to.equal(gateSigner.address);
    });

    it("Should set the correct owner", async function () {
      expect(await potfi.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await potfi.FEE_BPS()).to.equal(250);
      expect(await potfi.BPS()).to.equal(10000);
      expect(await potfi.MAX_WINNERS()).to.equal(200);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to set cooldown", async function () {
      await potfi.setCooldown(60);
      expect(await potfi.cooldownSecs()).to.equal(60);
    });

    it("Should allow owner to set gate signer", async function () {
      const [, , , newSigner] = await ethers.getSigners();
      await potfi.setGateSigner(newSigner.address);
      expect(await potfi.gateSigner()).to.equal(newSigner.address);
    });

    it("Should not allow non-owner to set cooldown", async function () {
      await expect(
        potfi.connect(feeTreasury).setCooldown(60)
      ).to.be.revertedWithCustomError(potfi, "OwnableUnauthorizedAccount");
    });
  });
});
