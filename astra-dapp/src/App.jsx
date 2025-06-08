import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from '@solana/web3.js';
import { getAnchorClient } from './anchorClient';
import './App.css';

function App() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const wallet = useWallet();
  const [balance, setBalance] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: 72
  });

  // Fetch wallet balance
  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then(bal => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey, connection, connected]);

  // Load proposals when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      loadProposals();
    }
  }, [connected, wallet]);

  const loadProposals = async () => {
    try {
      const { program } = getAnchorClient(wallet);
      const proposals = await program.account.proposal.all();
      setProposals(proposals);
      console.log('Loaded proposals:', proposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const createProposal = async (e) => {
    e.preventDefault();
    if (!connected) return;

    // Input validation
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { program } = getAnchorClient(wallet);
      const proposalKeypair = Keypair.generate();
      const id = Date.now(); // Unique ID based on timestamp
      const deadline = Math.floor(Date.now() / 1000) + (formData.deadline * 60 * 60); // Convert hours to seconds

      const tx = await program.methods
        .createProposal(
          id,
          formData.title,
          formData.description,
          deadline
        )
        .accounts({
          proposal: proposalKeypair.publicKey,
          user: wallet.publicKey,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        })
        .signers([proposalKeypair])
        .rpc();

      console.log('Proposal created! Signature:', tx);
      alert("✅ Proposal created on-chain!");

      // Reset form and reload proposals
      setFormData({ title: '', description: '', deadline: 72 });
      await loadProposals();

    } catch (error) {
      console.error('Error creating proposal:', error);
      if (error.message.includes('User rejected')) {
        alert("Transaction was cancelled");
      } else if (error.message.includes('insufficient')) {
        alert("Insufficient SOL for transaction");
      } else {
        alert("Failed to create proposal. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const voteOnProposal = async (proposalPubkey, voteType) => {
    if (!connected) return;

    setLoading(true);
    try {
      const { program, provider } = getAnchorClient(wallet);

      const tx = await program.methods
        .vote(voteType) // true for yes, false for no
        .accounts({
          proposal: proposalPubkey,
          voter: provider.wallet.publicKey, // Use "voter" to match your program
        })
        .rpc();

      console.log('Vote cast! Signature:', tx);
      alert("✅ Vote submitted!");
      await loadProposals(); // Reload to show updated vote counts

    } catch (error) {
      console.error('Error voting:', error);
      if (error.message.includes('User rejected')) {
        alert("Transaction was cancelled");
      } else if (error.message.includes('already voted')) {
        alert("You have already voted on this proposal");
      } else {
        alert("Failed to submit vote. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 ASTRA DAO</h1>
        <p>Decentralized Voting on Solana</p>

        <div className="wallet-section">
          <WalletMultiButton />

          {connected && publicKey && (
            <div className="wallet-info">
              <p>Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
              <p>Balance: {balance.toFixed(4)} SOL</p>
            </div>
          )}
        </div>

        {connected && (
          <div className="proposal-form">
            <h3>📝 Create New Proposal</h3>
            <form onSubmit={createProposal}>
              <input
                type="text"
                placeholder="Proposal Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Proposal Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Voting period (hours)"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: parseInt(e.target.value)})}
                min="1"
                max="168"
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Proposal'}
              </button>
            </form>
          </div>
        )}

        {connected && proposals.length > 0 && (
          <div className="proposals-list">
            <h3>🗳️ Active Proposals</h3>
            {proposals.map((prop, index) => (
              <div key={index} className="proposal-item">
                <h4>{prop.account.title}</h4>
                <p>{prop.account.description}</p>
                <div className="proposal-stats">
                  <span>For: {prop.account.votesFor?.toString() || 0}</span>
                  <span>Against: {prop.account.votesAgainst?.toString() || 0}</span>
                  <span>Deadline: {new Date(prop.account.deadline * 1000).toLocaleDateString()}</span>
                </div>
                <div className="vote-buttons">
                  <button 
                    onClick={() => voteOnProposal(prop.publicKey, true)}
                    disabled={loading}
                    className="vote-yes"
                  >
                    👍 Vote Yes
                  </button>
                  <button 
                    onClick={() => voteOnProposal(prop.publicKey, false)}
                    disabled={loading}
                    className="vote-no"
                  >
                    👎 Vote No
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {connected && proposals.length === 0 && (
          <div className="no-proposals">
            <p>No proposals found. Create the first one!</p>
          </div>
        )}

        {!connected && (
          <div className="connect-prompt">
            <p>Connect your wallet to start voting!</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
