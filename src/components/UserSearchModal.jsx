import React, { useState, useEffect } from 'react';
import { Search, UserCheck, X, Loader2, Send } from 'lucide-react';
import { searchPlayers } from '../services/gameService';

export default function UserSearchModal({
  isOpen,
  onClose,
  currentUser,
  onSelectPlayerToInvite
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
      setHasSearched(false);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(searchTerm, currentUser?.id);
        setResults(players);
        setHasSearched(true);
      } catch (err) {
        console.error('Player search error:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h2 className="modal-title">Find a Friend</h2>
        <p className="modal-subtitle">
          Search for another player by their username to start a game.
        </p>

        <div className="form-group" style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type player's username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div style={{ position: 'absolute', right: '12px', top: '34px', color: 'var(--rose-gold)' }}>
            {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </div>
        </div>

        {/* Results List */}
        <div style={{ minHeight: '140px', maxHeight: '220px', overflowY: 'auto', margin: '14px 0' }}>
          {results.length > 0 ? (
            results.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(38, 16, 32, 0.65)',
                  border: '1px solid var(--border-rose)',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(20, 8, 16, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-rose)'
                  }}>
                    <UserCheck size={18} color="var(--rose-gold)" />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {player.username}
                  </span>
                </div>

                <button
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => onSelectPlayerToInvite(player)}
                >
                  <Send size={14} />
                  <span>Invite</span>
                </button>
              </div>
            ))
          ) : hasSearched && !searching ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '30px' }}>
              No player found matching "{searchTerm}".
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '30px' }}>
              Enter at least one character to search registered players.
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

