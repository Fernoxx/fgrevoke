// Auto-generated: MultiRevokeHub on Base
export const MULTI_REVOKE_HUB = "0x160ddce544c9d5b54751ae32bf8152ebde96f879";

export const MultiRevokeHubAbi = [
  {"type":"function","name":"revokeWithPermit2612","stateMutability":"nonpayable","inputs":[
    {"name":"token","type":"address"},{"name":"owner","type":"address"},{"name":"spender","type":"address"},
    {"name":"deadline","type":"uint256"},{"name":"v","type":"uint8"},{"name":"r","type":"bytes32"},{"name":"s","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"revokeWithPermit2","stateMutability":"nonpayable","inputs":[
    {"name":"p","type":"tuple","components":[
      {"name":"details","type":"tuple","components":[
        {"name":"token","type":"address"},{"name":"amount","type":"uint160"},
        {"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}]},
      {"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}]},
    {"name":"v","type":"uint8"},{"name":"r","type":"bytes32"},{"name":"s","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"revokeWithPermit2Approve","stateMutability":"nonpayable","inputs":[
    {"name":"token","type":"address"},{"name":"spender","type":"address"}],"outputs":[ ]},
  {"type":"function","name":"proveRevoked","stateMutability":"nonpayable","inputs":[
    {"name":"token","type":"address"},{"name":"spender","type":"address"}],"outputs":[]},
  {"type":"event","name":"Revoked","inputs":[
    {"name":"owner","type":"address","indexed":true},{"name":"token","type":"address","indexed":true},
    {"name":"spender","type":"address","indexed":true},{"name":"method","type":"string","indexed":false}],"anonymous":false},
  {"type":"event","name":"RevokeProved","inputs":[
    {"name":"owner","type":"address","indexed":true},{"name":"token","type":"address","indexed":true},
    {"name":"spender","type":"address","indexed":true}],"anonymous":false}
];