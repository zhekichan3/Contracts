import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { NetworkUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-docgen';
import 'hardhat-contract-sizer';
import "solidity-coverage";
import "./tasks";

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
};

let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error('Please set your MNEMONIC in a .env file');
} else {
  mnemonic = process.env.MNEMONIC;
}

let infuraApiKey: string;
if (!process.env.INFURA_API_KEY) {
  throw new Error('Please set your INFURA_API_KEY in a .env file');
} else {
  infuraApiKey = process.env.INFURA_API_KEY;
}

function createNetworkConfig(
  network: keyof typeof chainIds,
): NetworkUserConfig {
  const url: string = `https://${network}.infura.io/v3/${infuraApiKey}`;
  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    gas: "auto",
    gasPrice: 150000000000, // gwei
    url,
  };
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: chainIds.hardhat,
    },
    mainnet: createNetworkConfig('mainnet'),
    goerli: createNetworkConfig('goerli'),
    kovan: createNetworkConfig('kovan'),
    rinkeby: createNetworkConfig('rinkeby'),
    ropsten: createNetworkConfig('ropsten'),

    bsctestnet: {
      url: "https://data-seed-prebsc-2-s2.binance.org:8545/",
      chainId: 97,
      gas: 2100000,
      gasPrice: 10000000000,
      accounts: { mnemonic: mnemonic },
    },

    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 5000000000,
      accounts: { mnemonic: mnemonic }
    },

    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/ta1S39Jb18huDo7G3WZS4A30UmHsgM_N",
      chainId: 80001,
      accounts: { mnemonic: mnemonic },
    },

    matic: {
      url: "https://rpc-mainnet.maticvigil.com",
      chainId: 137,
      accounts: { mnemonic: mnemonic },
    },

    fantom: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 0xfa2,
      accounts: { mnemonic: mnemonic },
    },

    operafantom: {
      url: "https://rpc.ftm.tools/",
      chainId: 250,
      accounts: { mnemonic: mnemonic },
    },

    avaxfuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: { mnemonic: mnemonic }
    },

    avaxmainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: { mnemonic: mnemonic }
    }
  },

  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  mocha: {
    timeout: 20000
  },
  solidity: {
    compilers: [
      {
        version: '0.4.26',
      },
      {
        version: '0.4.21',
      },
      {
        version: '0.5.16',
      },
      {
        version: '0.5.17',
      },
      {
        version: '0.6.4',
      },
      {
        version: '0.6.0',
      },
      {
        version: '0.6.2',
      },
      {
        version: '0.6.6'
      },
      {
        version: '0.6.12',
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.0'
      },
      {
        version: '0.8.3'
      },
      {
        version: '0.8.4',
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      'contracts/tokens/USDT.sol': {
        version: '0.4.18',
      },
      'contracts/tokens/PLEToken.sol': {
        version: '0.6.12',
      },
      'contracts/tokens/ARTXToken.sol': {
        version: '0.6.4',
      },
      'contracts/tokens/ENX.sol': {
        version: '0.8.0'
      }
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    only: ['./FundraiseV2.sol'],
    runOnCompile: false,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
  }
};
