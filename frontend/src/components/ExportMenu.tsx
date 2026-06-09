import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Download, Check } from 'lucide-react';
import { exportAsText, exportAsPDF, copyToClipboard } from '../lib/export';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  sidebarMode?: boolean;
  disabled?: boolean;
}

const rowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  border: 'none',
  borderRadius: 10,
  background: 'transparent',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
  textAlign: 'left',
  transition: 'background 200ms ease',
};

export function ExportMenu({ messages, sidebarMode = false, disabled = false }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(messages);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { label: 'Save as text', action: () => exportAsText(messages) },
    { label: 'Save as PDF', action: () => exportAsPDF(messages) },
    { label: copied ? 'Copied' : 'Copy to clipboard', action: handleCopy },
  ];

  const sidebarTrigger = (
    <button
      disabled={disabled}
      style={{
        ...rowStyle,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background =
            'color-mix(in srgb, var(--color-border) 60%, transparent)';
      }}
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
      }
    >
      <span style={{ color: 'var(--color-muted)', display: 'flex', flexShrink: 0 }}>
        <Download size={18} />
      </span>
      Export conversation
    </button>
  );

  const iconTrigger = (
    <button
      aria-label="Export conversation"
      title="Export conversation"
      disabled={disabled}
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        color: 'var(--color-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Download size={18} />
    </button>
  );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{sidebarMode ? sidebarTrigger : iconTrigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={sidebarMode ? 'right' : 'bottom'}
          sideOffset={8}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            padding: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            minWidth: 180,
            zIndex: 50,
          }}
        >
          {menuItems.map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 200ms ease',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  'color-mix(in srgb, var(--color-border) 50%, transparent)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
              }
            >
              {label === 'Copied' && <Check size={14} />}
              {label}
            </button>
          ))}
          <Popover.Arrow style={{ fill: 'var(--color-border)' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
