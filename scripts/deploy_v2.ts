import hre, { ethers } from "hardhat";

async function main() {
  const NFTSaleContractFactory = await ethers.getContractFactory("NFTSaleContractV2");
  const { ADMIN_ADDRESS, NFT_ADDRESS, CURRENCY_CONTRACT_ADDRESS } = process.env;
  // check if admin address is set
  if (!ADMIN_ADDRESS) throw new Error("ADMIN_ADDRESS is not set");
  // check if nft address is set
  if (!NFT_ADDRESS) throw new Error("NFT_ADDRESS is not set");
  // check if currency contract address is set
  if (!CURRENCY_CONTRACT_ADDRESS) throw new Error("CURRENCY_CONTRACT_ADDRESS is not set");

  const PLATFORM_SALES_SHARE_PERCENT = 55 * 10 ** 8;
  const PARTNER_SALES_SHARE_PERCENT = 45 * 10 ** 8;

  const nftSaleContract = await NFTSaleContractFactory.deploy(ADMIN_ADDRESS, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, NFT_ADDRESS, CURRENCY_CONTRACT_ADDRESS);

  console.log("NFTSaleContract deployed to:", nftSaleContract.address);

  await nftSaleContract.deployed();

  // verify contract
  await hre.run("verify:verify", {
    address: nftSaleContract.address,
    contract: "contracts/NFTSaleContractV2.sol:NFTSaleContractV2",
    constructorArguments: [ADMIN_ADDRESS, PLATFORM_SALES_SHARE_PERCENT, PARTNER_SALES_SHARE_PERCENT, NFT_ADDRESS, CURRENCY_CONTRACT_ADDRESS],
  });

  // console.log(`You can verify contract by running: npx hardhat verify --network ${hre.network.name} ${nftSaleContract.address} ${ADMIN_ADDRESS} ${PLATFORM_SALES_SHARE_PERCENT} ${PARTNER_SALES_SHARE_PERCENT} ${NFT_ADDRESS} ${CURRENCY_CONTRACT_ADDRESS}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
