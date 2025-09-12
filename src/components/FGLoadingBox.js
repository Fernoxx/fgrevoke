import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function FGLoadingBox() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dots, setDots] = useState(".");

  const fakeAddresses = [
    "0x5a65830a7Bb164db1da555555fead3387cb44a4f93",
    "0x696f5d9e0pf7764ba6ef9a65766af247d7661d0b",
    "0xC33763855ea47503f5d53e96734b75346b7fafbd0913",
    "0x2eafdd275dedd538d55da356f350280753766c0ed",
    "0x75d0c6Be553a87fb9653525f3036fa613579",
    "0x750fc630e563df508022668tb56af653",
    "0xC6fed8b360687698cd6555658b5T5f4963aa",
    "0x446d13005d54ffbe64d8f6f52dd55edd67a579c9c",
    "0x946A173Ad73Cbb942b9877E9029fa4c4dC7f2B07",
  ];

  // Rotate through contracts slowly while loading
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % fakeAddresses.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Animate loading dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div className="w-full max-w-xl flex items-center justify-center">
      <div className="relative bg-purple-200 rounded-2xl shadow-md w-full h-16 flex items-center justify-center font-mono text-sm text-black px-4 overflow-hidden">
        <span className="relative z-10">{fakeAddresses[currentIndex]}</span>
        <motion.div
          key={currentIndex}
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="absolute top-1/2 left-0 h-[2px] bg-red-600 z-0"
        />
        <div className="absolute bottom-1 right-3 text-xs text-gray-700 font-semibold">
          Loading{dots}
        </div>
      </div>
    </div>
  );
}