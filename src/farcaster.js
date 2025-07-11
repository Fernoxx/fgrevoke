// Farcaster SDK integration
export const isFarcasterApp = () => {
  // Check if running inside Farcaster
  return window.parent !== window || 
         window.location.search.includes('farcaster') ||
         navigator.userAgent.includes('Farcaster') ||
         window.webkit?.messageHandlers?.farcaster;
};

export const getFarcasterUser = async () => {
  try {
    // Check for Farcaster context
    if (window.farcaster) {
      return await window.farcaster.getUser();
    }
    
    // Fallback: Check URL params for Farcaster data
    const urlParams = new URLSearchParams(window.location.search);
    const fid = urlParams.get('fid');
    const username = urlParams.get('username');
    
    if (fid && username) {
      return { fid, username };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Farcaster user:', error);
    return null;
  }
};

export const connectFarcasterWallet = async () => {
  try {
    // Use Farcaster's built-in wallet if available
    if (window.farcaster?.wallet) {
      return await window.farcaster.wallet.connect();
    }
    
    // Fallback to simulated connection
    return {
      address: '0x742d35Cc8565C1Ea5B27faBc9B0D5b03e6c49e3F',
      fid: 12345,
      username: 'farcaster_user'
    };
  } catch (error) {
    console.error('Error connecting Farcaster wallet:', error);
    throw error;
  }
};