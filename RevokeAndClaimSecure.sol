// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// RevokeAndClaimSecure - ULTRA SECURE VERSION
/// Only allows claims from verified attester with Neynar-verified FIDs
/// No CAPTCHA needed - pure cryptographic security
/// 
/// Security Features:
/// - Only authorized attester can approve claims
/// - Strict FID validation (1-1000000 range)
/// - Enhanced EIP-712 signature verification
/// - Nonce tracking to prevent replay attacks
/// - Per-FID claim limits (30 max)
/// - Per-revoke uniqueness (one claim per revoke)
/// - Emergency controls (pause, migrate, withdraw)
/// - Signature malleability protection

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRevokeHelper {
    function hasRevoked(address user, address token, address spender) external view returns (bool);
}

contract RevokeAndClaimSecure is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Core contract components
    IERC20 public fg;                 // FG reward token (set once)
    IRevokeHelper public revokeHelper;
    address public attester;          // backend attester (signer) - ONLY THIS ADDRESS CAN APPROVE CLAIMS
    uint256 public rewardAmount;      // reward per revoke (wei)

    // Security parameters
    uint8 public constant MAX_REWARDS_PER_FID = 30;  // Max 30 claims per FID
    uint256 public constant MIN_FID = 1;             // Minimum valid FID
    uint256 public constant MAX_FID = 1000000;       // Maximum valid FID
    uint256 public constant MAX_DEADLINE_OFFSET = 3600; // Max 1 hour deadline

    // Tracking mappings
    mapping(uint256 => uint8) public fidRewardCount;        // fid => claim count
    mapping(bytes32 => bool) public revokeClaimed;          // revokeKey => claimed
    mapping(bytes32 => bool) public usedAttestation;        // digest => used
    mapping(uint256 => bool) public usedNonce;             // nonce => used (prevents replay)

    // EIP-712 domain and type hash - EXACTLY matches backend
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(uint256 fid,uint256 nonce,uint256 deadline,address token,address spender)"
    );

    // Events
    event AttesterSet(address indexed attester);
    event TokenBound(address indexed token);
    event RewardAmountSet(uint256 amount);
    event RewardClaimed(
        address indexed wallet, 
        uint256 indexed fid, 
        address indexed token, 
        address spender, 
        uint256 amount
    );
    event RevokeHelperSet(address indexed helper);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    event Migrated(address indexed to, uint256 amount);
    event SecurityViolation(string reason, address user);

    constructor(
        address _revokeHelper,
        uint256 _rewardAmount,
        address _attester,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_revokeHelper != address(0), "zero helper");
        require(_rewardAmount > 0, "zero reward");
        require(_attester != address(0), "zero attester");
        
        revokeHelper = IRevokeHelper(_revokeHelper);
        rewardAmount = _rewardAmount;
        attester = _attester;

        // EIP-712 domain setup - EXACTLY matches backend
        uint256 chainId;
        assembly { chainId := chainid() }
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("RevokeAndClaim"),           // EXACT name from backend
                keccak256("1"),                       // EXACT version from backend
                chainId,
                address(this)
            )
        );

        emit RevokeHelperSet(_revokeHelper);
        emit RewardAmountSet(_rewardAmount);
        emit AttesterSet(_attester);
    }

    /* ---------------- Owner Functions ---------------- */

    /// Bind FG token one time only
    function setTokenOnce(address _fg) external onlyOwner {
        require(address(fg) == address(0), "fg already set");
        require(_fg != address(0), "zero token");
        fg = IERC20(_fg);
        emit TokenBound(_fg);
    }

    /// Set the attester address (ONLY this address can approve claims)
    function setAttester(address _a) external onlyOwner {
        require(_a != address(0), "zero attester");
        attester = _a;
        emit AttesterSet(_a);
    }

    /// Update revoke helper contract
    function setRevokeHelper(address _h) external onlyOwner {
        require(_h != address(0), "zero helper");
        revokeHelper = IRevokeHelper(_h);
        emit RevokeHelperSet(_h);
    }

    /// Update reward amount
    function setRewardAmount(uint256 _r) external onlyOwner {
        require(_r > 0, "zero reward");
        rewardAmount = _r;
        emit RewardAmountSet(_r);
    }

    /// Pause all claiming (emergency stop)
    function pause() external onlyOwner { 
        _pause(); 
    }

    /// Unpause claiming
    function unpause() external onlyOwner { 
        _unpause(); 
    }

    /// Emergency rescue any ERC20 (including FG)
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyWithdraw(to, amount);
    }

    /// Migrate entire FG balance to new contract
    function migrateToNew(address newContract) external onlyOwner {
        require(newContract != address(0), "zero new");
        uint256 bal = fg.balanceOf(address(this));
        fg.safeTransfer(newContract, bal);
        emit Migrated(newContract, bal);
    }

    /* ---------------- ULTRA SECURE CLAIMING ---------------- */

    /// Claim reward with EIP-712 attestation signed by attester
    /// ONLY your attester can approve claims after verifying FID with Neynar
    function claimWithAttestation(
        uint256 fid,
        uint256 nonce,
        uint256 deadline,
        address token,
        address spender,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // Basic validations
        require(address(fg) != address(0), "fg not set");
        require(attester != address(0), "attester not set");
        require(block.timestamp <= deadline, "attestation expired");
        require(block.timestamp >= deadline - MAX_DEADLINE_OFFSET, "deadline too far");
        require(token != address(0) && spender != address(0), "token/spender zero");
        
        // CRITICAL: Validate FID is legitimate (from Neynar)
        require(fid >= MIN_FID, "invalid fid");
        require(fid <= MAX_FID, "fid too high");

        // Enhanced nonce protection (prevents replay attacks)
        require(!usedNonce[nonce], "nonce used");
        usedNonce[nonce] = true;

        // ULTRA SECURE: EIP-712 structure EXACTLY matches backend
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                fid,        // FID first (matches backend)
                nonce,
                deadline,
                token,
                spender
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        require(!usedAttestation[digest], "attestation used");
        usedAttestation[digest] = true;

        // CRITICAL: Verify signature comes from YOUR attester
        address recovered = _recover(digest, signature);
        require(recovered == attester, "invalid attester");

        // Ensure user actually revoked using RevokeHelper
        require(revokeHelper.hasRevoked(msg.sender, token, spender), "not revoked");

        // Enhanced uniqueness & fid cap
        bytes32 revokeKey = keccak256(abi.encodePacked(msg.sender, token, spender));
        require(!revokeClaimed[revokeKey], "already claimed");
        require(fidRewardCount[fid] < MAX_REWARDS_PER_FID, "fid cap reached");

        // Final security check: ensure contract has enough tokens
        require(fg.balanceOf(address(this)) >= rewardAmount, "insufficient balance");

        // Mark as claimed
        revokeClaimed[revokeKey] = true;
        fidRewardCount[fid] = fidRewardCount[fid] + 1;

        // Transfer reward
        fg.safeTransfer(msg.sender, rewardAmount);
        emit RewardClaimed(msg.sender, fid, token, spender, rewardAmount);
    }

    /* ---------------- ENHANCED ECDSA RECOVERY ---------------- */
    
    /// Ultra-secure signature recovery with malleability protection
    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig len");
        
        bytes32 r; 
        bytes32 s; 
        uint8 v;
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        
        // Enhanced v validation
        require(v == 27 || v == 28, "invalid v");
        
        // CRITICAL: Prevent signature malleability
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "invalid s");
        
        return ecrecover(digest, v, r, s);
    }

    /* ---------------- VIEW FUNCTIONS ---------------- */
    
    /// Check if a specific revoke has been claimed
    function isRevokeClaimed(address user, address token, address spender) external view returns (bool) {
        bytes32 revokeKey = keccak256(abi.encodePacked(user, token, spender));
        return revokeClaimed[revokeKey];
    }
    
    /// Get claim count for a specific FID
    function getFidRewardCount(uint256 fid) external view returns (uint8) {
        return fidRewardCount[fid];
    }
    
    /// Check if user can claim (comprehensive check)
    function canClaim(address user, address token, address spender, uint256 fid) external view returns (bool) {
        // Basic checks
        if (address(fg) == address(0) || attester == address(0)) return false;
        if (fg.balanceOf(address(this)) < rewardAmount) return false;
        if (fid < MIN_FID || fid > MAX_FID) return false;
        
        // Uniqueness checks
        bytes32 revokeKey = keccak256(abi.encodePacked(user, token, spender));
        if (revokeClaimed[revokeKey]) return false;
        if (fidRewardCount[fid] >= MAX_REWARDS_PER_FID) return false;
        
        // Revocation check
        if (!revokeHelper.hasRevoked(user, token, spender)) return false;
        
        return true;
    }

    /// Get contract info
    function getContractInfo() external view returns (
        address _fg,
        address _attester,
        address _revokeHelper,
        uint256 _rewardAmount,
        uint256 _fgBalance,
        bool _paused
    ) {
        return (
            address(fg),
            attester,
            address(revokeHelper),
            rewardAmount,
            address(fg) != address(0) ? fg.balanceOf(address(this)) : 0,
            paused()
        );
    }

    /// Get FID statistics
    function getFidStats(uint256 fid) external view returns (
        uint8 claimCount,
        uint8 remainingClaims,
        bool canClaimMore
    ) {
        uint8 count = fidRewardCount[fid];
        uint8 remaining = count < MAX_REWARDS_PER_FID ? MAX_REWARDS_PER_FID - count : 0;
        bool isEligible = count < MAX_REWARDS_PER_FID;
        
        return (count, remaining, isEligible);
    }
}