import type { Message, ChatResponse } from '../types';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function flattenAssistant(content: string): string {
  try {
    const r: ChatResponse = JSON.parse(content);
    const lines: string[] = [];
    lines.push(`[Solace] ${r.persona_opener}`);
    lines.push(r.reflection);
    if (r.needs_clarification && r.clarifying_question) {
      lines.push(`Question: ${r.clarifying_question}`);
    } else {
      r.suggestions.forEach((s) => lines.push(`- ${s.title}: ${s.detail}`));
    }
    if (r.follow_up) lines.push(`"${r.follow_up}"`);
    return lines.join('\n');
  } catch {
    return content;
  }
}

function buildPrintHtml(messages: Message[]): string {
  const exportDate = new Date().toLocaleDateString([], {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const messageRows = messages
    .map((m) => {
      if (m.role === 'user') {
        return `
          <div class="msg user">
            <div class="role">You</div>
            <div class="body">${esc(m.content)}</div>
            ${m.timestamp ? `<div class="ts">${formatDate(m.timestamp)}</div>` : ''}
          </div>`;
      }

      // Parse error message
      try {
        const parsed = JSON.parse(m.content) as ChatResponse & { __error?: boolean; text?: string };
        if (parsed.__error) {
          return `<div class="msg bot error"><div class="body">${esc(parsed.text ?? '')}</div></div>`;
        }

        const r = parsed as ChatResponse;
        const suggestions = r.needs_clarification && r.clarifying_question
          ? `<div class="clarify">${esc(r.clarifying_question)}</div>`
          : r.suggestions.map((s) => `
              <div class="suggestion">
                <span class="s-title">${esc(s.title)}</span>
                <span class="s-dot ${s.intensity}"></span>
                <p class="s-detail">${esc(s.detail)}</p>
              </div>`).join('');

        return `
          <div class="msg bot">
            <div class="role">Solace</div>
            <p class="opener">${esc(r.persona_opener)}</p>
            <p class="reflection">${esc(r.reflection)}</p>
            <div class="emotion-pill">${esc(r.emotion.primary)}${r.emotion.secondary ? ` · ${esc(r.emotion.secondary)}` : ''}</div>
            ${suggestions}
            ${r.follow_up ? `<p class="followup">"${esc(r.follow_up)}"</p>` : ''}
            ${m.timestamp ? `<div class="ts">${formatDate(m.timestamp)}</div>` : ''}
            <p class="disclaimer">${esc(r.disclaimer)}</p>
          </div>`;
      } catch {
        return '';
      }
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Solace — Conversation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,400&family=Inter:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', Georgia, sans-serif;
      font-size: 14px;
      color: #2c2520;
      background: #fff;
      line-height: 1.65;
    }

    .page {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 40px 64px;
    }

    header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding-bottom: 20px;
      margin-bottom: 32px;
      border-bottom: 1.5px solid #e8ddd3;
    }

    header .brand {
      font-family: 'Fraunces', Georgia, serif;
      font-style: italic;
      font-size: 1.6rem;
      color: #c98b7a;
      letter-spacing: 0.02em;
    }

    header .meta {
      font-size: 11px;
      color: #998e80;
    }

    .msg {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .role {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #998e80;
      margin-bottom: 6px;
    }

    /* User messages */
    .msg.user .body {
      background: #edf0ec;
      border-radius: 14px 14px 4px 14px;
      padding: 12px 16px;
      display: inline-block;
      max-width: 85%;
      float: right;
      clear: both;
      font-size: 14px;
    }

    .msg.user::after { content: ''; display: table; clear: both; }

    /* Bot messages */
    .msg.bot {
      background: #faf5ef;
      border: 1px solid #efe7dc;
      border-left: 3px solid #c98b7a;
      border-radius: 4px 14px 14px 14px;
      padding: 16px 18px;
      max-width: 92%;
    }

    .msg.bot .opener {
      font-family: 'Fraunces', Georgia, serif;
      font-style: italic;
      font-size: 1.1rem;
      color: #c98b7a;
      margin: 0 0 10px;
      line-height: 1.4;
    }

    .msg.bot .reflection {
      margin: 0 0 12px;
      font-size: 14px;
      color: #2c2520;
    }

    .emotion-pill {
      display: inline-block;
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 10px;
      border: 1px solid #c98b7a;
      color: #2c2520;
      margin-bottom: 12px;
    }

    .clarify {
      background: rgba(138,168,138,0.12);
      border-left: 3px solid #8aa88a;
      border-radius: 0 6px 6px 0;
      padding: 8px 12px;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .suggestion {
      border: 1px solid #efe7dc;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: #fff;
    }

    .s-title {
      font-weight: 500;
      font-size: 13px;
      color: #2c2520;
    }

    .s-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-left: 6px;
      vertical-align: middle;
    }
    .s-dot.gentle  { background: #8aa88a; }
    .s-dot.moderate { background: #d4a85a; }
    .s-dot.active  { background: #c98b7a; }

    .s-detail {
      font-size: 12px;
      color: #998e80;
      margin: 4px 0 0;
    }

    .followup {
      font-style: italic;
      font-size: 13px;
      color: #c98b7a;
      padding-left: 12px;
      border-left: 2px solid rgba(201,139,122,0.35);
      margin: 12px 0 10px;
      line-height: 1.55;
    }

    .ts {
      font-size: 10px;
      color: #c0b4a8;
      margin-top: 8px;
    }

    .disclaimer {
      font-size: 10px;
      color: #c0b4a8;
      margin: 6px 0 0;
      line-height: 1.5;
    }

    .msg.error .body {
      font-style: italic;
      color: #998e80;
      font-size: 13px;
    }

    footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #efe7dc;
      font-size: 10px;
      color: #c0b4a8;
      text-align: center;
    }

    @media print {
      body { font-size: 12px; }
      .page { padding: 0; }
      header { margin-bottom: 24px; }
      .msg { margin-bottom: 18px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <span class="brand">Solace</span>
      <span class="meta">Exported ${exportDate}</span>
    </header>

    <main>${messageRows}</main>

    <footer>
      Solace is not a substitute for professional mental health support.
      If you are in crisis, please contact a qualified professional or call 988.
    </footer>
  </div>
</body>
</html>`;
}

export function exportAsText(messages: Message[]): void {
  const lines: string[] = ['Solace — Conversation Export', ''];
  messages.forEach((m) => {
    if (m.role === 'user') {
      lines.push(`You: ${m.content}`);
    } else {
      lines.push(flattenAssistant(m.content));
    }
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'solace-conversation.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsPDF(messages: Message[]): void {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    // Fallback if popup blocked
    alert('Please allow popups for this site to export as PDF.');
    return;
  }
  win.document.open();
  win.document.write(buildPrintHtml(messages));
  win.document.close();
  // Wait for fonts to load before printing
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  });
}

export async function copyToClipboard(messages: Message[]): Promise<void> {
  const lines: string[] = ['Solace — Conversation', ''];
  messages.forEach((m) => {
    if (m.role === 'user') {
      lines.push(`You: ${m.content}`);
    } else {
      lines.push(flattenAssistant(m.content));
    }
    lines.push('');
  });
  await navigator.clipboard.writeText(lines.join('\n'));
}
