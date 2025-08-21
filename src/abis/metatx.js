export const MetaTxAbi = [
  {
    name: "claimWithMetaTx",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "c",
        type: "tuple",
        components: [
          { name: "fid", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "day", type: "uint256" },
          { name: "amountWei", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "executeMetaTransaction",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "userAddress", type: "address" },
      { name: "functionSignature", type: "bytes" },
      { name: "sigR", type: "bytes32" },
      { name: "sigS", type: "bytes32" },
      { name: "sigV", type: "uint8" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "getNonce",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "nonce_", type: "uint256" }],
  },
];