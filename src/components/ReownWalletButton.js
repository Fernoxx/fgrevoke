import React from 'react';
import { Wallet } from 'lucide-react';
import { isReownInitialized } from '../lib/reownConfig';
import { useAppKit } from '@reown/appkit/react';

// Component that uses Reown AppKit
function ReownButton({ disabled, buttonText }) {
  const { open } = useAppKit();

  return (
    <button
      onClick={() => {
        console.log('Opening Reown modal...');
        open();
      }}
      disabled={disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors duration-200 shadow-sm"
    >
      <Wallet className="w-5 h-5" />
      <span>{buttonText}</span>
    </button>
  );
}

// Fallback button component
function FallbackButton({ fallbackAction, disabled, buttonText }) {
  return (
    <button
      onClick={() => {
        console.log('Using fallback wallet connection...');
        fallbackAction();
      }}
      disabled={disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors duration-200 shadow-sm"
    >
      <Wallet className="w-5 h-5" />
      <span>{buttonText}</span>
    </button>
  );
}

// Main export that conditionally renders the appropriate button
export function ReownWalletButton({ fallbackAction, isConnecting, disabled, buttonText }) {
  // If Reown is initialized, use the Reown button, otherwise use fallback
  if (isReownInitialized) {
    return <ReownButton disabled={disabled} buttonText={buttonText} />;
  } else {
    return <FallbackButton fallbackAction={fallbackAction} disabled={disabled} buttonText={buttonText} />;
  }
}