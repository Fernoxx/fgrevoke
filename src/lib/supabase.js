import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export async function checkRevocationInDB(wallet, token, spender) {
  try {
    const { data, error } = await supabase
      .from('revocations')
      .select('*')
      .eq('wallet', wallet.toLowerCase())
      .eq('token', token.toLowerCase())
      .eq('spender', spender.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database error:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking revocation:', error);
    return false;
  }
}

export async function recordRevocation(wallet, token, spender, fid, blockNumber = null, txHash = null) {
  try {
    const { error } = await supabase
      .from('revocations')
      .insert({
        wallet: wallet.toLowerCase(),
        token: token.toLowerCase(),
        spender: spender.toLowerCase(),
        fid: fid,
        block_number: blockNumber,
        transaction_hash: txHash
      });
    
    if (error) {
      console.error('Failed to record revocation:', error);
      return false;
    }
    
    console.log('✅ Revocation recorded in database');
    return true;
  } catch (error) {
    console.error('Error recording revocation:', error);
    return false;
  }
}