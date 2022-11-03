require("@nomiclabs/hardhat-waffle");
// const myAction = require("./scripts/script");
const dotenv = require("dotenv");
dotenv.config();
const config = require("./config");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  console.log("taskArg", taskArgs)
  for (const account of accounts) {
    console.log(account.address);
  }
});

// .setAction(async()=>{
// });
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALKey,
        blockNumber: eval(config.blockNumber)
      },
      mining: {
        auto: false,
        interval: 0
      }
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
