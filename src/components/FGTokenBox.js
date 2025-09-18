import { useState } from "react";
import { motion } from "framer-motion";
import { sdk } from "@farcaster/miniapp-sdk";

export default function FGTokenBox() {
  const [copied, setCopied] = useState(false);
  const contractAddress = "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuy = async () => {
    try {
      console.log('🔄 Opening Farcaster wallet for $FG token swap...');
      
      // Use Farcaster SDK to open swap directly in wallet - NO FALLBACK TO CLANKER
      const result = await sdk.actions.swapToken({
        sellToken: 'eip155:8453/native', // Base ETH
        buyToken: `eip155:8453/erc20:${contractAddress}`, // $FG token on Base
        sellAmount: '1000000000000000000', // 1 ETH in wei (user can modify in wallet)
      });

      if (result.success) {
        console.log('✅ Swap initiated successfully:', result.swap.transactions);
      } else {
        console.error('❌ Swap failed:', result.error?.message);
        alert('Swap failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error initiating swap:', error);
      alert('Failed to open swap. Please try again.');
    }
  };

  const fakeAddresses = [
    "0x5a65830a7Bb164db1da555555fead3387cb44a4f93",
    "0x696f5d9e0pf7764ba6ef9a65766af247d7661d0b",
    "0xC33763855ea47503f5d53e96734b75346b7fafbd0913",
    "0x2eafdd275dedd538d55da356f350280753766c0ed",
    "0x75d0c6Be553a87fb9653525f3036fa613579",
    "0x750fc630e563df508022668tb56af653",
    "0xC6fed8b360687698cd6555658b5T5f4963aa",
    "0x446d13005d54ffbe64d8f6f52dd55edd67a579c9c",
    contractAddress,
  ];

  // Duplicate the list for looping effect
  const scrollingAddresses = [...fakeAddresses, ...fakeAddresses];

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="bg-purple-400 rounded-2xl shadow-xl p-6 max-w-xl w-full relative overflow-hidden">
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          Buy $FG the native token of the FarGuard miniapp
        </h1>
        <p className="text-center text-white/90 mb-4">
          Designed to reward users for securing their wallets. Revoke unsafe
          approvals through FarGuard to claim $FG, and unlock ongoing rewards by
          holding the token.
        </p>

        {/* Animated scrolling background with two columns */}
        <div className="absolute inset-0 grid grid-cols-2 gap-4 opacity-30 font-mono text-green-300 text-sm">
          {[0, 1].map((col) => (
            <motion.div
              key={col}
              initial={{ y: 0 }}
              animate={{ y: [0, -200] }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="flex flex-col space-y-2"
            >
              {scrollingAddresses.map((addr, idx) => (
                <div key={`${col}-${idx}`} className="line-through">
                  {addr}
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Foreground content */}
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <button
            onClick={handleBuy}
            className="bg-green-500/80 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition"
          >
            Buy $FG
          </button>
          <button
            onClick={handleCopy}
            className="bg-white/80 hover:bg-white text-green-600 font-semibold px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition"
          >
            {copied ? "Copied!" : "Copy CA"}
          </button>
        </div>
      </div>
    </div>
  );
}