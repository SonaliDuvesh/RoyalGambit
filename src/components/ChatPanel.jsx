import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

export default function ChatPanel({
  isOpen,
  onClose,
  messages = [],
  currentUserId,
  onSendMessage,
  onMarkRead
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      onMarkRead?.();
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isOpen, messages.length, onMarkRead]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <LiquidGlassContainer
      borderRadius={18}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '340px',
        height: '420px',
        border: '1px solid var(--border-rose)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 25px rgba(229, 169, 149, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 80,
        overflow: 'hidden',
        animation: 'modalPop 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-rose)',
        background: 'rgba(25, 10, 20, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="var(--rose-gold)" />
          <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--rose-gold-light)', letterSpacing: '0.04em' }}>
            In-Game Chat
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Message List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '0.85rem',
            padding: '20px'
          }}>
            <MessageSquare size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div>No messages yet.</div>
            <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>Say hello to your opponent!</div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const timeStr = msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={msg.id || index}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                {!isMe && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--rose-gold-light)', marginBottom: '2px', marginLeft: '4px' }}>
                    {msg.sender_name || msg.sender?.username || 'Opponent'}
                  </span>
                )}
                <div style={{
                  background: isMe
                    ? 'linear-gradient(135deg, rgba(153, 30, 74, 0.85) 0%, rgba(229, 169, 149, 0.75) 100%)'
                    : 'rgba(50, 20, 42, 0.85)',
                  border: isMe ? '1px solid var(--rose-gold)' : '1px solid var(--border-rose)',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.66rem',
                  color: 'var(--text-dim)',
                  marginTop: '2px',
                  marginInline: '4px'
                }}>
                  <span>{timeStr}</span>
                  {isMe && (
                    <span style={{ color: msg.read_at ? '#4ade80' : 'var(--text-dim)', fontWeight: 500 }}>
                      {msg.read_at ? 'Seen ✓✓' : 'Delivered ✓'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          borderTop: '1px solid var(--border-rose)',
          background: 'rgba(20, 8, 16, 0.8)'
        }}
      >
        <textarea
          rows={1}
          className="form-input"
          style={{
            resize: 'none',
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: '8px',
            height: '36px',
            lineHeight: '1.4'
          }}
          placeholder="Message opponent... (Enter to send)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '8px 12px', borderRadius: '8px', flexShrink: 0 }}
          disabled={!inputText.trim()}
        >
          <Send size={15} />
        </button>
      </form>
    </LiquidGlassContainer>
  );
}

