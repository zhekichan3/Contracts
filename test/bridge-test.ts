import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import * as mocha from "mocha-steps";
import { Bridge, LiquidityPool, Token } from '../typechain'
import { hrtime } from 'process';


let owner: SignerWithAddress
let validator: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress
let user3: SignerWithAddress

let USDT_ETH: Token;
let USDT_BSC: Token;
let DAI_ETH: Token;
let DAI_BSC: Token;

let Bridge_ETH: Bridge;
let Bridge_BSC: Bridge;

let fee = 20; // 2%
let lockTime = 100; // seconds

let USDT_ETH_Pool: LiquidityPool;
let DAI_ETH_Pool: LiquidityPool;
let USDT_BSC_Pool: LiquidityPool;
let DAI_BSC_Pool: LiquidityPool;

describe("Cross chain Bridge test", () => {
  beforeEach(async () => {
    [owner, validator, user1, user2, user3] = await ethers.getSigners();
  });

  it("STEP 1: Should deploy the Tokens", async function () {
    let USDTAmount = 100000_000000;
    let DAIAmount = ethers.utils.parseEther("100000");
    let TokenContract = await ethers.getContractFactory("Token");

    USDT_ETH = await (await TokenContract.deploy("USDT token", "USDT", USDTAmount, 6)).deployed() as Token;
    USDT_BSC = await (await TokenContract.deploy("USDT token", "USDT", USDTAmount, 6)).deployed() as Token;

    DAI_ETH = await (await TokenContract.deploy("DAI token", "DAI", DAIAmount, 18)).deployed() as Token;
    DAI_BSC = await (await TokenContract.deploy("DAI token", "DAI", DAIAmount, 18)).deployed() as Token;

    await USDT_ETH.transfer(user1.address, 1000_000000);
    await USDT_ETH.transfer(user2.address, 1000_000000);

    await USDT_BSC.transfer(user1.address, 1000_000000);
    await USDT_BSC.transfer(user2.address, 1000_000000);

    await DAI_ETH.transfer(user1.address, ethers.utils.parseEther("1000"));
    await DAI_ETH.transfer(user2.address, ethers.utils.parseEther("1000"));

    await DAI_BSC.transfer(user1.address, ethers.utils.parseEther("1000"));
    await DAI_BSC.transfer(user2.address, ethers.utils.parseEther("1000"));
  });

  it("STEP 2: Should deploy the Bridge", async function () {
    let BridgeContract = await ethers.getContractFactory("Bridge");
    Bridge_ETH = await (await BridgeContract.deploy(validator.address, fee, lockTime)).deployed() as Bridge;
    Bridge_BSC = await (await BridgeContract.deploy(validator.address, fee, lockTime)).deployed() as Bridge;
  });

  it("STEP 3: Check Bridge parameters", async function () {
    expect(await Bridge_ETH.validator()).to.equal(validator.address);
    expect(await Bridge_BSC.validator()).to.equal(validator.address);

    expect(await Bridge_ETH.fee()).to.equal(fee);
    expect(await Bridge_BSC.fee()).to.equal(fee);

    expect(await Bridge_ETH.lockPeriod()).to.equal(lockTime);
    expect(await Bridge_BSC.lockPeriod()).to.equal(lockTime);
  });

  it("STEP 4: Should create new Liquidity Pools", async function () {
    Bridge_ETH.addPool(USDT_ETH.address);
    Bridge_ETH.addPool(DAI_ETH.address);
    Bridge_BSC.addPool(USDT_BSC.address);
    Bridge_BSC.addPool(DAI_BSC.address);

    USDT_ETH_Pool = await ethers.getContractAt("LiquidityPool", await Bridge_ETH.liquidityPools(USDT_ETH.address))
    DAI_ETH_Pool = await ethers.getContractAt("LiquidityPool", await Bridge_ETH.liquidityPools(DAI_ETH.address))

    USDT_BSC_Pool = await ethers.getContractAt("LiquidityPool", await Bridge_BSC.liquidityPools(USDT_BSC.address))
    DAI_BSC_Pool = await ethers.getContractAt("LiquidityPool", await Bridge_BSC.liquidityPools(DAI_BSC.address))

    expect(await USDT_ETH_Pool.token()).to.equal(USDT_ETH.address);
    expect(await USDT_ETH_Pool.lockPeriod()).to.equal(lockTime);
    expect(await USDT_ETH_Pool.bridge()).to.equal(Bridge_ETH.address);
    expect(await USDT_ETH_Pool.name()).to.equal("USDT token Bridge LP Token");
    expect(await USDT_ETH_Pool.symbol()).to.equal("pUSDT");

    expect(await USDT_BSC_Pool.token()).to.equal(USDT_BSC.address);
    expect(await USDT_BSC_Pool.lockPeriod()).to.equal(lockTime);
    expect(await USDT_BSC_Pool.bridge()).to.equal(Bridge_BSC.address);
    expect(await USDT_BSC_Pool.name()).to.equal("USDT token Bridge LP Token");
    expect(await USDT_BSC_Pool.symbol()).to.equal("pUSDT");

    expect(await DAI_ETH_Pool.token()).to.equal(DAI_ETH.address);
    expect(await DAI_ETH_Pool.lockPeriod()).to.equal(lockTime);
    expect(await DAI_ETH_Pool.bridge()).to.equal(Bridge_ETH.address);
    expect(await DAI_ETH_Pool.name()).to.equal("DAI token Bridge LP Token");
    expect(await DAI_ETH_Pool.symbol()).to.equal("pDAI");

    expect(await DAI_BSC_Pool.token()).to.equal(DAI_BSC.address);
    expect(await DAI_BSC_Pool.lockPeriod()).to.equal(lockTime);
    expect(await DAI_BSC_Pool.bridge()).to.equal(Bridge_BSC.address);
    expect(await DAI_BSC_Pool.name()).to.equal("DAI token Bridge LP Token");
    expect(await DAI_BSC_Pool.symbol()).to.equal("pDAI");
  });

  it("STEP 5: Check requires for addPool function", async function () {
    try {
      await Bridge_ETH.connect(user1).addPool(USDT_ETH.address);
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Ownable: caller is not the owner") }

    try {
      await Bridge_ETH.connect(owner).addPool(user1.address);
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Bridge: Invalid token address") }

    try {
      await Bridge_ETH.connect(owner).addPool(USDT_ETH.address);
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Bridge: The token is already registered") }
  });

  it("STEP 6: Should approve tokens to Liquidity pools", async function () {
    await USDT_ETH.connect(user1).approve(USDT_ETH_Pool.address, ethers.utils.parseEther("1000.0"));
    await USDT_BSC.connect(user1).approve(USDT_BSC_Pool.address, ethers.utils.parseEther("1000.0"));
    await DAI_ETH.connect(user1).approve(DAI_ETH_Pool.address, ethers.utils.parseEther("1000.0"));
    await DAI_BSC.connect(user1).approve(DAI_BSC_Pool.address, ethers.utils.parseEther("1000.0"));

    await USDT_ETH.connect(user2).approve(Bridge_ETH.address, ethers.utils.parseEther("1000.0"));
    await USDT_BSC.connect(user2).approve(Bridge_BSC.address, ethers.utils.parseEther("1000.0"));
    await DAI_ETH.connect(user2).approve(Bridge_ETH.address, ethers.utils.parseEther("1000.0"));
    await DAI_BSC.connect(user2).approve(Bridge_BSC.address, ethers.utils.parseEther("1000.0"));
  });

  it("STEP 7: Should add liquidity when the underlying source token has 18 decimal points", async function () {
    let DAI_ETH_LPBalanceBefore = await DAI_ETH_Pool.balanceOf(user1.address);
    let DAI_BSC_LPBalanceBefore = await DAI_BSC_Pool.balanceOf(user1.address);

    let DAI_ETH_BalanceBefore = await DAI_ETH.balanceOf(user1.address);
    let DAI_BSC_BalanceBefore = await DAI_BSC.balanceOf(user1.address);

    expect(DAI_ETH_LPBalanceBefore).to.equal(0)
    expect(DAI_BSC_LPBalanceBefore).to.equal(0)

    expect(DAI_ETH_BalanceBefore).to.equal(ethers.utils.parseEther("1000.0"))
    expect(DAI_BSC_BalanceBefore).to.equal(ethers.utils.parseEther("1000.0"))

    await DAI_ETH_Pool.connect(user1).addLiquidity(ethers.utils.parseEther("500.0"));
    await DAI_BSC_Pool.connect(user1).addLiquidity(ethers.utils.parseEther("500.0"));

    let DAI_ETH_LPBalanceAfter = await DAI_ETH_Pool.balanceOf(user1.address);
    let DAI_BSC_LPBalanceAfter = await DAI_BSC_Pool.balanceOf(user1.address);

    let DAI_ETH_BalanceAfter = await DAI_ETH.balanceOf(user1.address);
    let DAI_BSC_BalanceAfter = await DAI_BSC.balanceOf(user1.address);

    expect(DAI_ETH_LPBalanceAfter).to.equal(ethers.utils.parseEther("500.0"));
    expect(DAI_BSC_LPBalanceAfter).to.equal(ethers.utils.parseEther("500.0"));

    expect(DAI_ETH_BalanceAfter).to.equal(ethers.utils.parseEther("500.0"))
    expect(DAI_BSC_BalanceAfter).to.equal(ethers.utils.parseEther("500.0"))
  });


  it("STEP 8: Should add liquidity when the underlying source token has fewer than 18 decimal points", async function () {
    let USDT_ETH_LPBalanceBefore = await USDT_ETH_Pool.balanceOf(user1.address);
    let USDT_BSC_LPBalanceBefore = await USDT_BSC_Pool.balanceOf(user1.address);

    let USDT_ETH_BalanceBefore = await USDT_ETH.balanceOf(user1.address);
    let USDT_BSC_BalanceBefore = await USDT_BSC.balanceOf(user1.address);

    expect(USDT_ETH_LPBalanceBefore).to.equal(0)
    expect(USDT_BSC_LPBalanceBefore).to.equal(0)

    expect(USDT_ETH_BalanceBefore).to.equal(1000_000000)
    expect(USDT_BSC_BalanceBefore).to.equal(1000_000000)

    await USDT_ETH_Pool.connect(user1).addLiquidity(500_000000);
    await USDT_BSC_Pool.connect(user1).addLiquidity(500_000000);

    let USDT_ETH_LPBalanceAfter = await USDT_ETH_Pool.balanceOf(user1.address);
    let USDT_BSC_LPBalanceAfter = await USDT_BSC_Pool.balanceOf(user1.address);

    let USDT_ETH_BalanceAfter = await USDT_ETH.balanceOf(user1.address);
    let USDT_BSC_BalanceAfter = await USDT_BSC.balanceOf(user1.address);

    expect(USDT_ETH_LPBalanceAfter).to.equal(ethers.utils.parseEther("500.0"));
    expect(USDT_BSC_LPBalanceAfter).to.equal(ethers.utils.parseEther("500.0"));
    expect(USDT_ETH_BalanceAfter).to.equal(500_000000)
    expect(USDT_BSC_BalanceAfter).to.equal(500_000000)

    expect(await USDT_ETH.balanceOf(USDT_ETH_Pool.address)).to.equal(500_000000);
    expect(await USDT_BSC.balanceOf(USDT_BSC_Pool.address)).to.equal(500_000000);
  });

  it("STEP 9: Should initiate the swap", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 100_000000;
    let chainTo = 2;
    let recipient = user3.address;

    let USDT_ETH_PoolBalanceBefore = await USDT_ETH.balanceOf(USDT_ETH_Pool.address);

    await Bridge_ETH.connect(user2).swap(
      recipient,
      transaction_number,
      amount,
      USDT_ETH.address,
      USDT_BSC.address,
      2
    );

    let USDT_ETH_PoolBalanceAfter = await USDT_ETH.balanceOf(USDT_ETH_Pool.address);

    expect(USDT_ETH_PoolBalanceAfter).to.equal(Number(USDT_ETH_PoolBalanceBefore) + amount)
  });

  it("STEP 10: Check requires for swap function", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 100_000000;
    let chainTo = 2;
    let recipient = user3.address;

    let USDT_ETH_PoolBalanceBefore = await USDT_ETH.balanceOf(USDT_ETH_Pool.address);

    try {
      await Bridge_ETH.connect(user2).swap(
        recipient,
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        2
      );
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Bridge: swap is not empty state or duplicate secret") }

    try {
      await Bridge_ETH.connect(user2).swap(
        recipient,
        transaction_number,
        amount,
        user2.address,
        USDT_BSC.address,
        2
      );
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Bridge: liquidity pool is not registered") }
  });


  it("STEP 11: Should redeem the swap on the another blockchain", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 100_000000;
    let chainTo = 2;
    let recipient = user3.address;

    let message = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      [
        "string",
        "uint256",
        "address",
        "address",
        "address",
        "uint256"
      ],
      [
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        recipient,
        chainTo
      ]
    ));

    let signature = await validator.signMessage(message);
    let { v, r, s } = ethers.utils.splitSignature(signature);

    await Bridge_BSC.connect(user3).redeem(
      user3.address,
      user2.address,
      transaction_number,
      amount,
      USDT_ETH.address,
      USDT_BSC.address,
      chainTo,
      v,
      r,
      s
    )

    expect(await USDT_BSC.balanceOf(user3.address)).to.equal(amount * 0.98)
    expect(await (await Bridge_BSC.swaps(message)).state).to.equal(2) // 0 - empty, 1 active, 2 - redeemed

  });

  it("STEP 12: Should revert if swap is already redeemed", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 100_000000;
    let chainTo = 2;
    let recipient = user3.address;

    let message = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      [
        "string",
        "uint256",
        "address",
        "address",
        "address",
        "uint256"
      ],
      [
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        recipient,
        chainTo
      ]
    ));

    let signature = await validator.signMessage(message);
    let { v, r, s } = ethers.utils.splitSignature(signature);

    try {
      await Bridge_BSC.connect(user3).redeem(
        user3.address,
        user2.address,
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        chainTo,
        v,
        r,
        s
      )
      console.log("Should not pass!!!!")
    } catch (error) { expect(error.message).to.include("Bridge: swap is not empty state or duplicate secret") }
  });

  it("STEP 13: Should revert if the provided message was not signed by the validator", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 200_000000;
    let chainTo = 2;
    let recipient = user3.address;
    let message = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      [
        "string",
        "uint256",
        "address",
        "address",
        "address",
        "uint256"
      ],
      [
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        recipient,
        chainTo
      ]
    ));

    let signature = await user2.signMessage(message);
    let { v, r, s } = ethers.utils.splitSignature(signature);

    try {
      await Bridge_BSC.connect(user3).redeem(
        user3.address,
        user2.address,
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        chainTo,
        v,
        r,
        s
      )
      console.log("Should not pass!!!!")
    } catch (error) {
      expect(error.message).to.include("Bridge: validator address is invalid")
    }
  })

  it("STEP 14: Should revert if there is no liquidity pool for the given destination tokens", async function () {
    let transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
    let amount = 20000_000000;
    let chainTo = 2;
    let recipient = user3.address;
    let message = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      [
        "string",
        "uint256",
        "address",
        "address",
        "address",
        "uint256"
      ],
      [
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        recipient,
        chainTo
      ]
    ));

    let signature = await validator.signMessage(message);
    let { v, r, s } = ethers.utils.splitSignature(signature);

    try {
      await Bridge_BSC.connect(user3).redeem(
        user3.address,
        user2.address,
        transaction_number,
        amount,
        USDT_ETH.address,
        USDT_BSC.address,
        chainTo,
        v,
        r,
        s
      )

      console.log("Should not pass!!!!")
    } catch (error) {
      expect(error.message).to.include("Bridge: not enough balance in pool")
    }
  })

  it("STEP 15: Check removeLiquidity requires", async function () {
    try {
      await USDT_ETH_Pool.connect(user3).removeLiquidity(1000);
      console.log("Should not pass!!!!")
    } catch (error) {
      expect(error.message).to.include("Pool: sender is not a liquidity provider")
    }

    try {
      await USDT_ETH_Pool.connect(user1).removeLiquidity(1000);
      console.log("Should not pass!!!!")
    } catch (error) {
      expect(error.message).to.include("Pool: Tokens are not yet available for withdrawal")
    }

    ethers.provider.send("evm_increaseTime", [100])
    ethers.provider.send("evm_mine", [])

    try {
      await USDT_ETH_Pool.connect(user1).removeLiquidity(5000_000000);
      console.log("Should not pass!!!!")
    } catch (error) {
      expect(error.message).to.include("Pool: not enough token to remove")
    }
  });

  it("STEP 16: Should remove given amount of tokens plus accrued fees", async function () {
    await USDT_ETH_Pool.connect(user1).removeLiquidity(50_000000);
  });
})