import React, { useState } from 'react';
import { Search, Radio, AlertOctagon, Check, CheckCheck, Clock } from 'lucide-react';
import { Contact, Message } from '../types';
import { formatTime24 } from '../utils';

interface ChatsListProps {
  contacts: Contact[];
  messages: Message[];
  activeChatId: string | null;
  recentlyUpdatedChatId?: string | null;
  onSelectChat: (contactId: string) => void;
  onTriggerSos: () => void;
}

export const ChatsList: React.FC<ChatsListProps> = ({
  contacts,
  messages,
  recentlyUpdatedChatId,
  onSelectChat,
  onTriggerSos,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get last message for each chat
  const getLastMessage = (chatId: string): Message | undefined => {
    const chatMsgs = messages.filter((m) => m.chatId === chatId);
    if (chatMsgs.length === 0) return undefined;
    return chatMsgs[chatMsgs.length - 1];
  };

  const filteredContacts = contacts.filter((c) => {
    const lastMsg = getLastMessage(c.id);
    const matchesName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMsg = lastMsg ? lastMsg.text.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return matchesName || matchesMsg;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] text-[var(--color-text)]">
      {/* Top Header */}
      <header className="px-4 py-3 bg-[var(--color-header)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <Radio className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">MeshAid</h1>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-none">Offline Emergency Mesh</p>
          </div>
        </div>

        {/* SOS button: Red is used ONLY for SOS */}
        <button
          onClick={onTriggerSos}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--color-sos)] text-white text-xs font-semibold hover:bg-[var(--color-sos-hover)] transition-colors shadow-sm cursor-pointer"
          title="Send Emergency SOS Broadcast"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>SOS</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="px-3 pt-3 pb-2 bg-[var(--color-bg-app)] shrink-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts and messages"
            className="w-full bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] pl-9 pr-3 py-2 rounded border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-text-secondary)]"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
            No contacts match "{searchQuery}"
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const lastMsg = getLastMessage(contact.id);
            const timeStr = lastMsg ? formatTime24(lastMsg.timestamp) : '';
            const isHighlighted = recentlyUpdatedChatId === contact.id;

            return (
              <div
                key={contact.id + (lastMsg ? `-${lastMsg.id}` : '')}
                onClick={() => onSelectChat(contact.id)}
                className={`flex items-center px-4 py-3 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)] cursor-pointer transition-colors ${
                  isHighlighted ? 'animate-row-highlight' : ''
                }`}
              >
                {/* Avatar circle with initials */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold border ${
                    contact.isGroup
                      ? 'bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text)]'
                      : 'bg-[var(--color-avatar-bg)] border-[var(--color-border)] text-[var(--color-avatar-text)]'
                  }`}
                >
                  {contact.initials}
                </div>

                {/* Content */}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-[var(--color-text)] truncate">
                      {contact.name}
                    </span>
                    {timeStr && (
                      <span className="text-[11px] text-[var(--color-text-secondary)] ml-2 shrink-0">{timeStr}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-[var(--color-text-secondary)] truncate pr-2 space-x-1">
                      {lastMsg && lastMsg.sender === 'me' && (
                        <span className="shrink-0 mr-1">
                          {lastMsg.status === 'pending' && <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />}
                          {lastMsg.status === 'sent' && <Check className="w-3 h-3 text-[var(--color-text-secondary)]" />}
                          {lastMsg.status === 'relayed' && <CheckCheck className="w-3 h-3 text-[var(--color-text-secondary)]" />}
                          {lastMsg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-[var(--color-delivered)]" />}
                        </span>
                      )}
                      {lastMsg && lastMsg.isSos && (
                        <span className="text-[var(--color-sos)] font-medium mr-1">[SOS]</span>
                      )}
                      <span className="truncate">
                        {lastMsg ? lastMsg.text : 'No messages yet'}
                      </span>
                    </div>

                    {contact.unreadCount > 0 && (
                      <span className="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--color-bubble-me)] text-[11px] font-medium text-[var(--color-delivered)] border border-[var(--color-delivered)]/30">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
