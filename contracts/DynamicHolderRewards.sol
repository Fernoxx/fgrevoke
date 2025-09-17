// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract DynamicHolderRewards is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Constants
    uint256 public constant REWARD_RATE = 10000; // 0.01% = 10000 basis points
    uint256 public constant BASIS_POINTS = 1000000; // 100% = 1,000,000 basis points
    uint256 public constant HOUR_IN_SECONDS = 3600;

    // State variables
    IERC20 public immutable token;
    uint256 public lastUpdateTime;
    uint256 public totalRewardsDistributed;
    uint256 public totalHolders;
    
    // Holder tracking
    EnumerableSet.AddressSet private holders;
    mapping(address => uint256) public holderBalances;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;
    
    // Reward tracking
    mapping(address => uint256) public pendingRewards;
    uint256 public totalPendingRewards;

    // Events
    event HolderAdded(address indexed holder, uint256 balance);
    event HolderRemoved(address indexed holder);
    event HolderBalanceUpdated(address indexed holder, uint256 oldBalance, uint256 newBalance);
    event RewardsDistributed(uint256 totalAmount, uint256 timestamp);
    event RewardsClaimed(address indexed holder, uint256 amount);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    event ContractMigrated(address indexed newContract);

    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        lastUpdateTime = block.timestamp;
    }

    // Modifiers
    modifier onlyValidHolder(address holder) {
        require(holder != address(0), "Invalid holder address");
        require(holder != address(this), "Contract cannot be holder");
        _;
    }

    modifier updateRewards() {
        _updateRewards();
        _;
    }

    // Core functions
    function _updateRewards() internal {
        if (block.timestamp <= lastUpdateTime) return;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        uint256 hoursElapsed = timeElapsed / HOUR_IN_SECONDS;
        
        if (hoursElapsed == 0) return;
        
        uint256 totalRewards = 0;
        uint256 currentTotalSupply = token.totalSupply();
        
        // Calculate rewards for each holder
        for (uint256 i = 0; i < holders.length(); i++) {
            address holder = holders.at(i);
            uint256 balance = holderBalances[holder];
            
            if (balance > 0) {
                // Calculate 0.01% per hour for this holder
                uint256 holderRewards = (balance * REWARD_RATE * hoursElapsed) / BASIS_POINTS;
                totalRewards += holderRewards;
                
                // Add to pending rewards
                pendingRewards[holder] += holderRewards;
            }
        }
        
        if (totalRewards > 0) {
            totalPendingRewards += totalRewards;
            emit RewardsDistributed(totalRewards, block.timestamp);
        }
        
        lastUpdateTime = block.timestamp;
    }

    function addHolder(address holder) external onlyOwner onlyValidHolder(holder) {
        require(!holders.contains(holder), "Holder already exists");
        
        uint256 balance = token.balanceOf(holder);
        require(balance > 0, "Holder must have balance");
        
        holders.add(holder);
        holderBalances[holder] = balance;
        lastClaimTime[holder] = block.timestamp;
        totalHolders = holders.length();
        
        emit HolderAdded(holder, balance);
    }

    function removeHolder(address holder) external onlyOwner onlyValidHolder(holder) {
        require(holders.contains(holder), "Holder does not exist");
        
        // Claim any pending rewards before removal
        if (pendingRewards[holder] > 0) {
            _claimRewards(holder);
        }
        
        holders.remove(holder);
        delete holderBalances[holder];
        delete lastClaimTime[holder];
        totalHolders = holders.length();
        
        emit HolderRemoved(holder);
    }

    function updateHolderBalance(address holder) external onlyValidHolder(holder) updateRewards {
        require(holders.contains(holder), "Holder not registered");
        
        uint256 oldBalance = holderBalances[holder];
        uint256 newBalance = token.balanceOf(holder);
        
        holderBalances[holder] = newBalance;
        
        // Remove holder if balance is zero
        if (newBalance == 0) {
            holders.remove(holder);
            totalHolders = holders.length();
            emit HolderRemoved(holder);
        }
        
        emit HolderBalanceUpdated(holder, oldBalance, newBalance);
    }

    function claimRewards() external nonReentrant whenNotPaused updateRewards {
        _claimRewards(msg.sender);
    }

    function _claimRewards(address holder) internal {
        require(holders.contains(holder), "Holder not registered");
        
        uint256 rewards = pendingRewards[holder];
        require(rewards > 0, "No rewards to claim");
        
        // Check contract has enough tokens
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance >= rewards, "Insufficient contract balance");
        
        // Update state
        pendingRewards[holder] = 0;
        totalPendingRewards -= rewards;
        totalClaimed[holder] += rewards;
        totalRewardsDistributed += rewards;
        lastClaimTime[holder] = block.timestamp;
        
        // Transfer rewards
        token.safeTransfer(holder, rewards);
        
        emit RewardsClaimed(holder, rewards);
    }

    // View functions
    function getHolderCount() external view returns (uint256) {
        return holders.length();
    }

    function getHolderAt(uint256 index) external view returns (address) {
        require(index < holders.length(), "Index out of bounds");
        return holders.at(index);
    }

    function getHolderInfo(address holder) external view returns (
        bool isHolder,
        uint256 balance,
        uint256 pendingReward,
        uint256 totalClaimedAmount,
        uint256 lastClaim
    ) {
        isHolder = holders.contains(holder);
        balance = holderBalances[holder];
        pendingReward = pendingRewards[holder];
        totalClaimedAmount = totalClaimed[holder];
        lastClaim = lastClaimTime[holder];
    }

    function calculatePendingRewards(address holder) external view returns (uint256) {
        if (!holders.contains(holder)) return 0;
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        uint256 hoursElapsed = timeElapsed / HOUR_IN_SECONDS;
        
        if (hoursElapsed == 0) return pendingRewards[holder];
        
        uint256 balance = holderBalances[holder];
        uint256 newRewards = (balance * REWARD_RATE * hoursElapsed) / BASIS_POINTS;
        
        return pendingRewards[holder] + newRewards;
    }

    // Emergency functions
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        
        uint256 balance = token.balanceOf(address(this));
        require(amount <= balance, "Insufficient balance");
        
        token.safeTransfer(to, amount);
        emit EmergencyWithdraw(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Migration functions
    function migrateToNewContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Invalid new contract");
        require(newContract != address(this), "Cannot migrate to self");
        
        // Transfer all remaining tokens to new contract
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(newContract, balance);
        }
        
        emit ContractMigrated(newContract);
    }

    // Batch operations for gas efficiency
    function batchAddHolders(address[] calldata newHolders) external onlyOwner {
        for (uint256 i = 0; i < newHolders.length; i++) {
            if (!holders.contains(newHolders[i])) {
                uint256 balance = token.balanceOf(newHolders[i]);
                if (balance > 0) {
                    holders.add(newHolders[i]);
                    holderBalances[newHolders[i]] = balance;
                    lastClaimTime[newHolders[i]] = block.timestamp;
                }
            }
        }
        totalHolders = holders.length();
    }

    function batchUpdateBalances(address[] calldata holdersToUpdate) external {
        for (uint256 i = 0; i < holdersToUpdate.length; i++) {
            address holder = holdersToUpdate[i];
            if (holders.contains(holder)) {
                uint256 oldBalance = holderBalances[holder];
                uint256 newBalance = token.balanceOf(holder);
                
                holderBalances[holder] = newBalance;
                
                if (newBalance == 0) {
                    holders.remove(holder);
                }
            }
        }
        totalHolders = holders.length();
    }
}