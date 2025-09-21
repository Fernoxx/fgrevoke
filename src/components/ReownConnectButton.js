import React from 'react';

// Reown AppKit Connect Button Component
// This component provides a simple wrapper around the Reown modal button
export function ReownConnectButton() {
  return <appkit-button />;
}

// Reown AppKit Account Button Component  
// This shows the connected account details
export function ReownAccountButton() {
  return <appkit-account-button />;
}

// Combined button that shows connect or account based on connection status
export function ReownButton() {
  return (
    <>
      <appkit-button />
      <appkit-account-button />
    </>
  );
}