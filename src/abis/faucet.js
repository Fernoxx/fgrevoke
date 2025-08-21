export const FaucetAbi = [
  {
    type: "function",
    name: "claimSelf",
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
        ]
      },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "claimFor",
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
        ]
      },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "fid", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "day", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false }
    ]
  }
];