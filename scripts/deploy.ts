import hre, { ethers, upgrades } from "hardhat";
import { NFTSaleContract } from "../typechain-types";

async function main() {
  const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContract");
  const { ADMIN_ADDRESS, NFT_ADDRESS, CURRENCY_CONTRACT_ADDRESS } = process.env;
  // check if admin address is set
  if (!ADMIN_ADDRESS) throw new Error("ADMIN_ADDRESS is not set");
  // check if nft address is set
  if (!NFT_ADDRESS) throw new Error("NFT_ADDRESS is not set");
  // check if currency contract address is set
  if (!CURRENCY_CONTRACT_ADDRESS) throw new Error("CURRENCY_CONTRACT_ADDRESS is not set");

  const PLATFORM_SALES_SHARE_PERCENT = 40 * 10 ** 8;
  const PARTNER_SALES_SHARE_PERCENT = 60 * 10 ** 8;

  const nftSaleContract = await upgrades.deployProxy(NFTSaleContractFactory, [ADMIN_ADDRESS, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, NFT_ADDRESS, CURRENCY_CONTRACT_ADDRESS]) as NFTSaleContract;
  await nftSaleContract.deployed();

  console.log("NFTSaleContract deployed to:", nftSaleContract.address);
  console.log(`You can verify contract by running: npx hardhat verify --network ${hre.network.name} ${nftSaleContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
