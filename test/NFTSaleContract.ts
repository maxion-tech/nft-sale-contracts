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
    const [owner, admin, seller, buyer, platform, partner] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy();

    const CurrencyContractFactory = await ethers.getContractFactory("Token");
    const currencyContract = await CurrencyContractFactory.deploy();

    const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
    const nftSaleContract = await upgrades.deployProxy(NFTSaleContractFactory, [admin.address, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, nft.address, currencyContract.address]) as NFTSaleContract;

    const DEFAULT_ADMIN_ROLE = await nftSaleContract.DEFAULT_ADMIN_ROLE();
    const NFT_SELLER_ROLE = await nftSaleContract.NFT_SELLER_ROLE();
    const PLATFORM_ROLE = await nftSaleContract.PLATFORM_ROLE();
    const PARTNER_ROLE = await nftSaleContract.PARTNER_ROLE();

    // grant NFT_SELLER_ROLE from nft sale contract to seller
    await nftSaleContract.connect(admin).grantRole(NFT_SELLER_ROLE, seller.address);

    // grant PLATFORM_ROLE from nft sale contract to platform
    await nftSaleContract.connect(admin).grantRole(PLATFORM_ROLE, platform.address);

    // grant PARTNER_ROLE from nft sale contract to partner
    await nftSaleContract.connect(admin).grantRole(PARTNER_ROLE, partner.address);


    return { nft, currencyContract, nftSaleContract, owner, admin, seller, buyer, platform, partner, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, DEFAULT_ADMIN_ROLE, NFT_SELLER_ROLE, PLATFORM_ROLE, PARTNER_ROLE };
  }

  describe("Deployment", function () {
    it("Should all parameters correct", async function () {
      const { admin, seller, nftSaleContract, nft, currencyContract, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, DEFAULT_ADMIN_ROLE, NFT_SELLER_ROLE } = await loadFixture(deployFixture);

      expect(await nftSaleContract.platformSalesSharePercent()).to.equal(PLATFORM_SALES_SHARE_PERCENT);
      expect(await nftSaleContract.partnerSalesSharePercent()).to.equal(PARTNER_SALES_SHARE_PERCENT);
      expect(await nftSaleContract.nftContract()).to.equal(nft.address);
      expect(await nftSaleContract.currencyContract()).to.equal(currencyContract.address);
      expect(await nftSaleContract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await nftSaleContract.hasRole(NFT_SELLER_ROLE, seller.address)).to.equal(true);
    });

    it("Should revert if platformSalesSharePercent + partnerSalesSharePercent > 100%", async function () {
      const { nft, currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 50 * 10 ** 8, 51 * 10 ** 8, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: platform and partner share is not equal to 100%");
    });

    it("Should revert if platformSalesSharePercent + partnerSalesSharePercent < 100%", async function () {
      const { nft, currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 50 * 10 ** 8, 49 * 10 ** 8, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: platform and partner share is not equal to 100%");
    });

    it("Should revert if platformSalesSharePercent + partnerSalesSharePercent = 0%", async function () {
      const { nft, currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 0, 0, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: platform share is zero");
    });

    it("Should revert if platformSalesSharePercent = 0%", async function () {
      const { nft, currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 0, 50 * 10 ** 8, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: platform share is zero");
    });

    it("Should revert if partnerSalesSharePercent = 0%", async function () {
      const { nft, currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 50 * 10 ** 8, 0, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: partner share is zero");
    });

    it("Should revert if nftContract is zero address", async function () {
      const { currencyContract, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 50 * 10 ** 8, 50 * 10 ** 8, ethers.constants.AddressZero, currencyContract.address])).to.be.revertedWith("NFTSaleContract: nft contract address is zero address");
    });

    it("Should revert if currencyContract is zero address", async function () {
      const { nft, admin } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [admin.address, 50 * 10 ** 8, 50 * 10 ** 8, nft.address, ethers.constants.AddressZero])).to.be.revertedWith("NFTSaleContract: currency contract address is zero address");
    });

    it("Should revert if admin is zero address", async function () {
      const { nft, currencyContract } = await loadFixture(deployFixture);

      const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
      await expect(upgrades.deployProxy(NFTSaleContractFactory, [ethers.constants.AddressZero, 50 * 10 ** 8, 50 * 10 ** 8, nft.address, currencyContract.address])).to.be.revertedWith("NFTSaleContract: admin is zero address");
    });

  });

  describe("Sale", function () {
    it("Should complete flow", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer, platform, partner } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price);
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price);
      await nftSaleContract.connect(buyer).buyNft(nftId, quantity);
      const { platformShareAmount, partnerShareAmount } = await nftSaleContract.calculateSalesShareAmount(price);

      const platformSalesShareAmountTotal = await nftSaleContract.platformSalesShareAmountTotal();
      const partnerSalesShareAmountTotal = await nftSaleContract.partnerSalesShareAmountTotal();

      expect(await nft.balanceOf(buyer.address, nftId)).to.eq(quantity);
      // check seller currency balance
      expect(await currencyContract.balanceOf(seller.address)).to.eq(0);
      // check platform sales share amount total
      expect(platformSalesShareAmountTotal).to.eq(platformShareAmount);
      // check partner sales share amount total
      expect(partnerSalesShareAmountTotal).to.eq(partnerShareAmount);

      // platform withdraw sales share
      await nftSaleContract.connect(platform).withdrawPlatformSalesShareAmount();
      // check platform currency balance
      expect(await currencyContract.balanceOf(platform.address)).to.eq(platformShareAmount);

      // partner withdraw sales share
      await nftSaleContract.connect(partner).withdrawPartnerSalesShareAmount();
      // check partner currency balance
      expect(await currencyContract.balanceOf(partner.address)).to.eq(partnerShareAmount);
    });

    // repeat test for multiple nft
    it("Should complete flow for multiple nft", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer, platform, partner } = await loadFixture(deployFixture);

      const nftId1 = 1;
      const nftId2 = 2;
      const quantity = 1;
      const price1 = ethers.utils.parseEther("100");
      const price2 = ethers.utils.parseEther("200");

      await nft.mint(seller.address, nftId1, 1, "0x00");
      await nft.mint(seller.address, nftId2, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId1, quantity, price1);
      await nftSaleContract.connect(seller).setNftToSale(nftId2, quantity, price2);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price1.add(price2));
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price1.add(price2));
      await nftSaleContract.connect(buyer).buyNft(nftId1, quantity);
      await nftSaleContract.connect(buyer).buyNft(nftId2, quantity);

      const { platformShareAmount: platformShareAmount1, partnerShareAmount: partnerShareAmount1 } = await nftSaleContract.calculateSalesShareAmount(price1);
      const { platformShareAmount: platformShareAmount2, partnerShareAmount: partnerShareAmount2 } = await nftSaleContract.calculateSalesShareAmount(price2);

      const platformSalesShareAmountTotal = await nftSaleContract.platformSalesShareAmountTotal();
      const partnerSalesShareAmountTotal = await nftSaleContract.partnerSalesShareAmountTotal();

      expect(await nft.balanceOf(buyer.address, nftId1)).to.eq(quantity);
      expect(await nft.balanceOf(buyer.address, nftId2)).to.eq(quantity);
      // check seller currency balance
      expect(await currencyContract.balanceOf(seller.address)).to.eq(0);
      // check platform sales share amount total
      expect(platformSalesShareAmountTotal).to.eq(platformShareAmount1.add(platformShareAmount2));
      // check partner sales
      expect(partnerSalesShareAmountTotal).to.eq(partnerShareAmount1.add(partnerShareAmount2));

      // platform withdraw sales share
      await nftSaleContract.connect(platform).withdrawPlatformSalesShareAmount();
      // check platform currency balance
      expect(await currencyContract.balanceOf(platform.address)).to.eq(platformShareAmount1.add(platformShareAmount2));

      // partner withdraw sales share
      await nftSaleContract.connect(partner).withdrawPartnerSalesShareAmount();
      // check partner currency balance
      expect(await currencyContract.balanceOf(partner.address)).to.eq(partnerShareAmount1.add(partnerShareAmount2));

    });

    it("Should revert if nft is not approved for sale", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");

      // seller set nft to sale
      await expect(nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price)).to.be.revertedWith("ERC1155: caller is not token owner or approved");
    });

    it("Should revert if NFT amount is less than nft quantity", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, quantity, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price);
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price);

      await expect(nftSaleContract.connect(buyer).buyNft(nftId, 2)).to.be.revertedWith("NFTSaleContract: nft amount is less than nft quantity");
    });

    it("Should revert if NFT is not on sale", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price);
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price);

      await expect(nftSaleContract.connect(buyer).buyNft(nftId, quantity)).to.be.revertedWith("NFTSaleContract: nft id is not exist");
    });

    it("Should revert if NFT is not enough", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price);
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price);

      await nftSaleContract.connect(buyer).buyNft(nftId, quantity);

      await expect(nftSaleContract.connect(buyer).buyNft(nftId, quantity)).to.be.revertedWith("NFTSaleContract: nft id is not exist");
    });

    it("Should revert if currency is not enough", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price.sub(1));
      await currencyContract.connect(buyer).approve(nftSaleContract.address, price.sub(1));

      await expect(nftSaleContract.connect(buyer).buyNft(nftId, quantity)).to.be.revertedWith("NFTSaleContract: user have not enough currency token to buy nft");
    });

    it("Should revert if currency is not approved", async function () {
      const { nft, currencyContract, nftSaleContract, seller, buyer } = await loadFixture(deployFixture);

      const nftId = 1;
      const quantity = 1;
      const price = ethers.utils.parseEther("100");

      await nft.mint(seller.address, nftId, 1, "0x00");
      await nft.connect(seller).setApprovalForAll(nftSaleContract.address, true);

      // seller set nft to sale
      await nftSaleContract.connect(seller).setNftToSale(nftId, quantity, price);

      // buyer buy nft
      await currencyContract.mint(buyer.address, price);
      // await currencyContract.connect(buyer).approve(nftSaleContract.address, price);

      await expect(nftSaleContract.connect(buyer).buyNft(nftId, quantity)).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
});
