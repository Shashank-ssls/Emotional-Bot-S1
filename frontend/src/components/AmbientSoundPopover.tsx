import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Volume2, VolumeX } from 'lucide-react';

type AmbientChoice = 'off' | 'rain' | 'hum' | 'waves';

const OPTIONS: { value: AmbientChoice; label: string; desc: string }[] = [
  { value: 'off',   label: 'Off',           desc: '' },
  { value: 'rain',  label: 'Soft rain',     desc: 'White noise' },
  { value: 'hum',   label: 'Warm hum',      desc: 'Tonal drone' },
  { value: 'waves', label: 'Distant waves', desc: 'Pink noise' },
];

interface Props {
  sidebarMode?: boolean;
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

function buildRainNodes(ctx: AudioContext): AudioNode[] {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const hiFilter = ctx.createBiquadFilter();
  hiFilter.type = 'bandpass';
  hiFilter.frequency.value = 1400;
  hiFilter.Q.value = 0.4;

  const loFilter = ctx.createBiquadFilter();
  loFilter.type = 'highpass';
  loFilter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = 0.28;

  source.connect(hiFilter);
  hiFilter.connect(loFilter);
  loFilter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  return [source];
}

function buildHumNodes(ctx: AudioContext): AudioNode[] {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.07;
  masterGain.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];
  [55, 110, 165, 220].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 1 / (i + 1);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    oscs.push(osc);
  });

  // Gentle tremolo
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.012;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  return [...oscs, lfo];
}

function buildWavesNodes(ctx: AudioContext): AudioNode[] {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise via Voss-McCartney
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * 0.5362) * 0.11;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 480;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.32;

  // Slow LFO simulates wave rhythm
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.18;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  source.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);
  source.start();
  return [source, lfo];
}

export function AmbientSoundPopover({ sidebarMode = false }: Props) {
  const [choice, setChoice] = useState<AmbientChoice>(() => {
    return (localStorage.getItem('solace.ambient') as AmbientChoice) ?? 'off';
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const stopAudio = () => {
    nodesRef.current.forEach((n) => {
      try { (n as OscillatorNode | AudioBufferSourceNode).stop(); } catch { /* already stopped */ }
    });
    nodesRef.current = [];
    ctxRef.current?.close();
    ctxRef.current = null;
  };

  useEffect(() => {
    localStorage.setItem('solace.ambient', choice);
    stopAudio();
    if (choice === 'off') return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    ctx.resume();

    if (choice === 'rain')  nodesRef.current = buildRainNodes(ctx);
    if (choice === 'hum')   nodesRef.current = buildHumNodes(ctx);
    if (choice === 'waves') nodesRef.current = buildWavesNodes(ctx);

    return stopAudio;
  }, [choice]);

  const isActive = choice !== 'off';
  const activeLabel = OPTIONS.find((o) => o.value === choice)?.label ?? 'Off';

  const sidebarTrigger = (
    <button
      style={rowStyle}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          'color-mix(in srgb, var(--color-border) 60%, transparent)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
      }
    >
      <span style={{ color: 'var(--color-muted)', display: 'flex', flexShrink: 0 }}>
        <Volume2 size={18} />
      </span>
      <span style={{ flex: 1 }}>Ambient sound</span>
      <span style={{ fontSize: 12, color: isActive ? 'var(--color-secondary)' : 'var(--color-muted)' }}>
        {activeLabel}
      </span>
    </button>
  );

  const iconTrigger = (
    <button
      aria-label="Ambient sound"
      title="Ambient sound"
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
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {isActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--color-secondary)',
          }}
        />
      )}
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
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            minWidth: 190,
            zIndex: 50,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12, marginTop: 0 }}>
            Ambient sound
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setChoice(opt.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: choice === opt.value ? 'var(--color-secondary)' : 'var(--color-border)',
                  background: choice === opt.value
                    ? 'color-mix(in srgb, var(--color-secondary) 15%, transparent)'
                    : 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 250ms ease',
                }}
              >
                <span>{opt.label}</span>
                {opt.desc && (
                  <span style={{ fontSize: 11, color: 'var(--color-muted)', opacity: 0.7 }}>
                    {opt.desc}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Popover.Arrow style={{ fill: 'var(--color-border)' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
