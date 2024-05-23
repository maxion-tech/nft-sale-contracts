import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true,
    },
  },
  networks: {
    bscTestnet: {
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY as string] : [],
      chainId: 97,
      url: process.env.BSC_TESTNET_URL || ""
    },
    bsc: {
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY as string] : [],
      chainId: 56,
      url: process.env.BSC_MAINNET_URL || ""
    },
    maxiTestnet: {
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY as string] : [],
      chainId: 898,
      url: process.env.MAXI_TESTNET_URL || "https://rpc-testnet.maxi.network",
    },
    maxiTestnetHW: {
      chainId: 898,
      url: process.env.MAXI_TESTNET_URL || "https://rpc-testnet.maxi.network",
      ledgerAccounts: process.env.LEDGER_ACCOUNT ? [process.env.LEDGER_ACCOUNT] : [],
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.ETHERSCAN_API_KEY as string,
      bsc: process.env.ETHERSCAN_API_KEY as string,
      maxiTestnetHW: process.env.ETHERSCAN_API_KEY as string,
    },
    customChains: [
      {
        network: "maxiTestnetHW",
        chainId: 898,
        urls: {
          apiURL: "https://testnet.maxi.network/api",
          browserURL: "https://testnet.maxi.network/"
        }
      }
    ]
  }
};

export default config;
