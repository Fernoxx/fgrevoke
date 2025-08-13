export const Permit2Abi = [
  // read current allowance stored in Permit2
  {"type":"function","name":"allowance","stateMutability":"view","inputs":[
    {"name":"owner","type":"address"},{"name":"token","type":"address"},{"name":"spender","type":"address"}],
    "outputs":[{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}]},
  // direct owner call to set allowance
  {"type":"function","name":"approve","stateMutability":"nonpayable","inputs":[
    {"name":"token","type":"address"},{"name":"spender","type":"address"},
    {"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"}],"outputs":[]}
];