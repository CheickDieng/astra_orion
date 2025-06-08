import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from './idl/astra_dao.json';

// Use a mock program ID for now (System Program)
const PROGRAM_ID = new PublicKey('11111111111111111111111111111112');

export const getAnchorClient = (wallet) => {
  const connection = new Connection('https://api.devnet.solana.com', 'processed');
  const provider = new AnchorProvider(connection, wallet, { commitment: 'processed' });
  
  // For mock purposes, we'll create a simplified program interface
  const program = {
    programId: PROGRAM_ID,
    provider,
    
    // Mock methods that simulate Anchor program calls
    methods: {
      createProposal: (title, description, deadline) => ({
        accounts: () => ({
          rpc: async () => {
            // Simulate creating proposal
            console.log('Creating proposal:', { title, description, deadline });
            return 'mock_signature_' + Date.now();
          }
        })
      }),
      
      vote: (proposalId, support) => ({
        accounts: () => ({
          rpc: async () => {
            // Simulate voting
            console.log('Voting on proposal:', { proposalId, support });
            return 'mock_vote_signature_' + Date.now();
          }
        })
      })
    },
    
    // Mock account fetching
    account: {
      proposal: {
        all: async () => {
          // Return mock proposals for testing
          return [
            {
              publicKey: new PublicKey('11111111111111111111111111111111'),
              account: {
                id: 1,
                title: 'Increase DAO Treasury',
                description: 'Proposal to increase treasury allocation',
                author: wallet.publicKey,
                yesVotes: 5,
                noVotes: 2,
                deadline: Date.now() + 86400000, // 24 hours from now
                executed: false
              }
            }
          ];
        }
      }
    }
  };
  
  return { provider, program };
};
