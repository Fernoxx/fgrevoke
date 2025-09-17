const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DynamicHolderRewards", function () {
  let dynamicRewards;
  let token;
  let owner;
  let holder1;
  let holder2;
  let holder3;

  beforeEach(async function () {
    [owner, holder1, holder2, holder3] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy("Test Token", "TEST", ethers.utils.parseEther("1000000"));
    await token.deployed();

    // Deploy DynamicHolderRewards contract
    const DynamicHolderRewards = await ethers.getContractFactory("DynamicHolderRewards");
    dynamicRewards = await DynamicHolderRewards.deploy(token.address, owner.address);
    await dynamicRewards.deployed();

    // Transfer tokens to holders
    await token.transfer(holder1.address, ethers.utils.parseEther("100000"));
    await token.transfer(holder2.address, ethers.utils.parseEther("50000"));
    await token.transfer(holder3.address, ethers.utils.parseEther("25000"));

    // Transfer tokens to contract for rewards
    await token.transfer(dynamicRewards.address, ethers.utils.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await dynamicRewards.token()).to.equal(token.address);
    });

    it("Should set the correct owner", async function () {
      expect(await dynamicRewards.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero holders", async function () {
      expect(await dynamicRewards.getHolderCount()).to.equal(0);
    });
  });

  describe("Holder Management", function () {
    it("Should add a holder", async function () {
      await dynamicRewards.addHolder(holder1.address);
      expect(await dynamicRewards.getHolderCount()).to.equal(1);
      expect(await dynamicRewards.getHolderAt(0)).to.equal(holder1.address);
    });

    it("Should not add holder with zero balance", async function () {
      await expect(dynamicRewards.addHolder(owner.address))
        .to.be.revertedWith("Holder must have balance");
    });

    it("Should batch add holders", async function () {
      await dynamicRewards.batchAddHolders([holder1.address, holder2.address, holder3.address]);
      expect(await dynamicRewards.getHolderCount()).to.equal(3);
    });

    it("Should remove a holder", async function () {
      await dynamicRewards.addHolder(holder1.address);
      await dynamicRewards.removeHolder(holder1.address);
      expect(await dynamicRewards.getHolderCount()).to.equal(0);
    });
  });

  describe("Reward Distribution", function () {
    beforeEach(async function () {
      await dynamicRewards.addHolder(holder1.address);
      await dynamicRewards.addHolder(holder2.address);
    });

    it("Should calculate pending rewards correctly", async function () {
      // Fast forward time by 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const pendingRewards = await dynamicRewards.calculatePendingRewards(holder1.address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should allow claiming rewards", async function () {
      // Fast forward time by 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const initialBalance = await token.balanceOf(holder1.address);
      await dynamicRewards.connect(holder1).claimRewards();
      const finalBalance = await token.balanceOf(holder1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause", async function () {
      await dynamicRewards.pause();
      expect(await dynamicRewards.paused()).to.be.true;
    });

    it("Should allow owner to emergency withdraw", async function () {
      const amount = ethers.utils.parseEther("1000");
      await dynamicRewards.emergencyWithdraw(owner.address, amount);
      expect(await token.balanceOf(owner.address)).to.be.gt(0);
    });
  });
});

// Mock ERC20 contract for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}