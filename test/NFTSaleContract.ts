import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NFTSaleContract } from "../typechain-types";

describe("NFT Sale Contract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    const PLATFORM_SALES_SHARE_PERCENT = 40 * 10 ** 8;
    const PARTNER_SALES_SHARE_PERCENT = 60 * 10 ** 8;

    // Contracts are deployed using the first signer/account by default
    const [owner, admin] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy();

    const CurrencyContractFactory = await ethers.getContractFactory("Token");
    const currencyContract = await CurrencyContractFactory.deploy();

    const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
    const nftSaleContract = await upgrades.deployProxy(NFTSaleContractFactory, [admin.address, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, nft.address, currencyContract.address]) as NFTSaleContract;


    return { nft, currencyContract, nftSaleContract, owner, admin, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT };
  }

  describe("Deployment", function () {
    it("Should all parameters correct", async function () {
      const { nftSaleContract, nft, currencyContract, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT } = await loadFixture(deployFixture);

      expect(await nftSaleContract.platformSalesSharePercent()).to.equal(PLATFORM_SALES_SHARE_PERCENT);
      expect(await nftSaleContract.partnerSalesSharePercent()).to.equal(PARTNER_SALES_SHARE_PERCENT);
      expect(await nftSaleContract.nftContract()).to.equal(nft.address);
      expect(await nftSaleContract.currencyContract()).to.equal(currencyContract.address);
    });
  });
});
