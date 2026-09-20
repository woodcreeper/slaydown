import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  getInputProps,
  delayRender,
  continueRender,
  cancelRender,
} from 'remotion';
import timeline from './omarchy-timeline.json';

const paper = '#f5f4f7';
const ink = '#29282f';
const muted = '#77727f';
const violet = '#8766ae';
const amber = '#d4a25f';
const night = '#19181f';
const metal = '"Metal Mania", fantasy';
const serif = '"Iowan Old Style", "Baskerville", Georgia, serif';
const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const ease = Easing.bezier(0.2, 0.75, 0.25, 1);
const tween = (frame: number, a: number, b: number, x: number, y: number) =>
  interpolate(frame, [a, b], [x, y], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
const screenshot = (name: string) => staticFile(`screenshots/omarchy/${name}.png`);

function Mark({size = 28, color = ink}: {size?: number; color?: string}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M49 14H24L13 25v12h27v6H14v10h28l10-10V27H25v-3h24z" fill={color} />
      <path d="m49 7-8 10h7l-4 9 13-14h-8l4-5z" fill={amber} />
    </svg>
  );
}

function Base({children, dark = false}: {children: React.ReactNode; dark?: boolean}) {
  return (
    <AbsoluteFill
      style={{
        background: dark ? night : paper,
        color: dark ? '#f5f3f8' : ink,
        fontFamily: sans,
        overflow: 'hidden',
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function Brand({dark = false, label}: {dark?: boolean; label: string}) {
  const color = dark ? '#f4f1f8' : ink;
  return (
    <div
      style={{
        position: 'absolute',
        top: 57,
        left: 96,
        right: 96,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color,
      }}
    >
      <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
        <Mark color={color} />
        <span
          style={{
            fontFamily: metal,
            fontSize: 38,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            transform: 'skewX(-5deg)',
          }}
        >
          SlayDown<span style={{color: amber}}>.</span>
        </span>
      </div>
      <div style={{fontSize: 13, letterSpacing: 3.5, fontWeight: 650, opacity: 0.64}}>{label}</div>
    </div>
  );
}

function Copy({
  eyebrow,
  title,
  subtitle,
  dark = false,
  y = 270,
  size = 78,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dark?: boolean;
  y?: number;
  size?: number;
}) {
  return (
    <div style={{position: 'absolute', left: 104, top: y, width: 500}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 17,
          color: dark ? '#d8b97e' : violet,
          fontSize: 13,
          letterSpacing: 3,
          fontWeight: 650,
          marginBottom: 24,
        }}
      >
        <span style={{width: 32, height: 1, background: 'currentColor'}} />
        {eyebrow}
      </div>
      <div style={{fontFamily: serif, fontSize: size, lineHeight: 1.06, letterSpacing: -2.3}}>{title}</div>
      {subtitle ? (
        <div
          style={{
            fontSize: 24,
            lineHeight: 1.55,
            color: dark ? '#b8b3c1' : muted,
            marginTop: 28,
            maxWidth: 455,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function Screen({
  name,
  width = 1170,
  crop = [0, 0, 2800, 1800],
  style = {},
}: {
  name: string;
  width?: number;
  crop?: [number, number, number, number];
  style?: React.CSSProperties;
}) {
  const [x, y, w, h] = crop;
  const scale = width / w;
  return (
    <div
      style={{
        position: 'absolute',
        width,
        height: h * scale,
        overflow: 'hidden',
        borderRadius: 17,
        background: '#15151d',
        border: '1px solid #ffffff85',
        boxShadow: '0 30px 85px #21132b26, 0 4px 16px #21132b14',
        ...style,
      }}
    >
      <Img
        src={screenshot(name)}
        style={{
          position: 'absolute',
          width: 2880 * scale,
          height: 1800 * scale,
          maxWidth: 'none',
          left: -x * scale,
          top: -y * scale,
        }}
      />
    </div>
  );
}

function Key({label, pressed = false}: {label: string; pressed?: boolean}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        height: 58,
        padding: '0 24px',
        border: `1px solid ${pressed ? '#9c83b9' : '#cac3d2'}`,
        borderBottomWidth: pressed ? 2 : 6,
        borderRadius: 12,
        background: pressed ? '#e0d5ee' : '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color: ink,
        transform: `translateY(${pressed ? 4 : 0}px)`,
      }}
    >
      {label}
    </div>
  );
}

function ShotLabel({children}: {children: React.ReactNode}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 107,
        bottom: 69,
        fontSize: 16,
        color: muted,
        letterSpacing: 0.6,
      }}
    >
      {children}
    </div>
  );
}

function Splash() {
  return (
    <Base dark>
      <div style={{position: 'absolute', left: 108, top: 82, color: '#d8b97e', fontSize: 17, letterSpacing: 3.5, fontWeight: 650}}>
        MARKDOWN, AT HOME ON YOUR DESKTOP
      </div>
      <div style={{position: 'absolute', left: 108, top: 230, width: 1380}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 27}}>
          <Mark size={86} color="#d6c5e9" />
          <div style={{fontFamily: metal, fontSize: 128, textTransform: 'uppercase', transform: 'skewX(-5deg)', lineHeight: 1.1}}>
            SlayDown<span style={{color: amber}}>.</span>
          </div>
        </div>
        <div style={{fontFamily: serif, fontSize: 84, lineHeight: 1.07, letterSpacing: -2.5, marginTop: 41}}>
          SlayDown for<br />Omarchy / Linux
        </div>
        <div style={{fontSize: 27, color: '#d6c5e9', marginTop: 42}}>Your agent writes it. You read it beautifully.</div>
      </div>
      <div style={{position: 'absolute', left: 108, bottom: 70, color: '#b5aabd', fontSize: 18, letterSpacing: 2.3}}>30 SECONDS · REAL OMARCHY CAPTURES</div>
      <div style={{position: 'absolute', right: 110, bottom: 66, color: '#f2edf8', fontSize: 21}}>github.com/woodcreeper/slaydown</div>
    </Base>
  );
}

function AgentPlan() {
  const frame = useCurrentFrame();
  return (
    <Base dark>
      <Brand dark label="THE AGENT CREATES PLAN.MD" />
      <Copy eyebrow="A PUBLIC DEMO FILE" title={<>Your agent<br />makes a plan.</>} subtitle="Real Markdown, written locally on Omarchy." dark y={292} size={84} />
      <Screen name="agent-plan" style={{left: 650, top: 180, opacity: tween(frame, 0, 10, 0, 1), transform: `translateY(${tween(frame, 0, 14, 14, 0)}px)`}} />
      <ShotLabel>Codex · PLAN.md · Omarchy</ShotLabel>
    </Base>
  );
}

function NautilusPlan() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand label="THE FILE IS RIGHT WHERE YOU EXPECT" />
      <Copy eyebrow="NAUTILUS" title={<>Select<br />PLAN.md.</>} subtitle="No import. No copy. Just the original file." y={282} size={88} />
      <Screen name="nautilus-plan" style={{left: 650, top: 180, transform: `translateY(${tween(frame, 0, 18, 12, 0)}px)`}} />
      <div style={{position: 'absolute', left: 108, top: 730}}><Key label="Space  ␣" pressed={frame >= 48} /></div>
      <ShotLabel>Nautilus · PLAN.md selected</ShotLabel>
    </Base>
  );
}

function SushiPreview() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand label="ONE KEY. A BEAUTIFUL READ." />
      <Copy eyebrow="SUSHI + SLAYDOWN" title={<>Space.<br />And there<br />it is.</>} subtitle="A native preview, with SlayDown ready to open." y={230} size={85} />
      <div style={{position: 'absolute', left: 108, top: 805}}><Key label="Space  ␣" pressed={frame < 16} /></div>
      <Screen name="sushi-preview" style={{left: 650, top: 180, opacity: tween(frame, 0, 12, 0, 1), transform: `scale(${tween(frame, 0, 18, 0.985, 1)})`}} />
      <ShotLabel>Nautilus preview · Open With SlayDown</ShotLabel>
    </Base>
  );
}

function OpenReader() {
  const frame = useCurrentFrame();
  const mix = tween(frame, 22, 42, 0, 1);
  return (
    <Base>
      <Brand label="THE SAME FILE. MORE ROOM." />
      <Copy eyebrow="OPEN IN SLAYDOWN" title={<>Take the<br />full view.</>} subtitle="Keep the outline close and the document centered." y={285} size={88} />
      <Screen name="sushi-preview" style={{left: 650, top: 180, opacity: 1 - mix}} />
      <Screen name="reader-outline" style={{left: 650, top: 180, opacity: mix}} />
      <div style={{position: 'absolute', left: 108, top: 740, color: violet, fontSize: 22}}>Open in SlayDown →</div>
      <ShotLabel>SlayDown reader · PLAN.md</ShotLabel>
    </Base>
  );
}

function Features() {
  const frame = useCurrentFrame();
  const active = frame < 45 ? 0 : frame < 90 ? 1 : 2;
  const names = ['reader-outline', 'reader-style', 'reader-search'];
  const labels = ['Outline at a glance', 'Omarchy reading style', 'Search inside the document'];
  return (
    <Base>
      <Brand label="THE FULL SLAYDOWN READER" />
      <Copy eyebrow="YOUR READING TOOLKIT" title={<>Find your<br />way around.</>} y={238} size={78} />
      <div style={{position: 'absolute', left: 108, top: 540, width: 435}}>
        {labels.map((label, index) => (
          <div key={label} style={{display: 'flex', alignItems: 'center', gap: 17, padding: '20px 0', borderBottom: '1px solid #ddd7e5', color: index === active ? ink : '#a59ead', fontSize: 23}}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: index === active ? (index === 1 ? amber : violet) : 'transparent'}} />
            {label}
          </div>
        ))}
      </div>
      <Screen name={names[active]} style={{left: 650, top: 180}} />
      <ShotLabel>{active === 0 ? 'Outline' : active === 1 ? 'Omarchy preset' : 'Search · “automatic refresh”'}</ShotLabel>
    </Base>
  );
}

function Handoff() {
  const frame = useCurrentFrame();
  const mix = tween(frame, 32, 47, 0, 1);
  return (
    <Base>
      <Brand label="YOUR ORIGINAL FILE. YOUR EDITOR." />
      <Copy eyebrow="OPEN IN EDITOR" title={<>Back to<br />the work.</>} subtitle="SlayDown hands the original PLAN.md to Zed." y={285} size={86} />
      <Screen name="reader-outline" style={{left: 650, top: 180, opacity: 1 - mix}} />
      <Screen name="zed-before" style={{left: 650, top: 180, opacity: mix}} />
      {frame < 38 ? <div style={{position: 'absolute', left: 1490, top: 310, padding: '12px 19px', borderRadius: 999, background: '#f5f4f7e8', color: ink, fontSize: 19, boxShadow: '0 8px 30px #0003'}}>Open in Editor ↗</div> : null}
      <ShotLabel>SlayDown → Zed</ShotLabel>
    </Base>
  );
}

function Edit() {
  const frame = useCurrentFrame();
  const state = frame < 25 ? 'zed-before' : frame < 50 ? 'zed-selected' : frame < 75 ? 'zed-typed-1' : frame < 100 ? 'zed-typed-2' : 'zed-typed-3';
  const heading = frame < 25 ? 'Select the heading' : frame < 50 ? 'Ready to replace' : frame < 75 ? '# A plan' : frame < 100 ? '# A plan worth' : '# A plan worth sharing';
  return (
    <Base dark>
      <Brand dark label="EDIT THE ORIGINAL IN ZED" />
      <Copy eyebrow="ONE HEADING, THREE BEATS" title={<>Make it<br />worth sharing.</>} subtitle={heading} dark y={260} size={82} />
      <Screen name={state} crop={[0, 35, 2800, 1120]} style={{left: 650, top: 245}} />
      {frame >= 125 ? <div style={{position: 'absolute', left: 108, top: 735}}><Key label="Ctrl  +  S    Saved" pressed={frame < 140} /></div> : null}
      <ShotLabel>Zed · {state === 'zed-selected' ? 'heading selected' : heading}</ShotLabel>
    </Base>
  );
}

function Refresh() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand label="SAVE THERE. SEE IT HERE." />
      <Copy eyebrow="AUTOMATIC REFRESH" title={<>SlayDown<br />keeps up.</>} subtitle="The heading and outline update without reopening." y={270} size={84} />
      <Screen name="reader-refreshed" style={{left: 650, top: 180, opacity: tween(frame, 0, 12, 0, 1), transform: `translateY(${tween(frame, 0, 16, 10, 0)}px)`}} />
      <div style={{position: 'absolute', left: 108, top: 742, display: 'flex', alignItems: 'center', gap: 12, color: violet, fontSize: 22}}><span style={{fontSize: 27}}>↻</span> Live preview</div>
      <ShotLabel>A plan worth sharing · updated live</ShotLabel>
    </Base>
  );
}

function Outro() {
  return (
    <Base dark>
      <Brand dark label="READ IT. THEN KEEP BUILDING." />
      <div style={{position: 'absolute', left: 106, top: 224, width: 1500}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 25}}>
          <Mark size={86} color="#d6c5e9" />
          <div style={{fontFamily: metal, fontSize: 132, textTransform: 'uppercase', transform: 'skewX(-5deg)', lineHeight: 1.1}}>SlayDown<span style={{color: amber}}>.</span></div>
        </div>
        <div style={{fontFamily: serif, fontSize: 82, lineHeight: 1.12, letterSpacing: -2, color: '#e5ddeb', marginTop: 38}}>SlayDown for<br />Omarchy / Linux</div>
        <div style={{fontSize: 25, color: '#b5aabd', marginTop: 39}}>Preview. Explore. Edit. Keep reading.</div>
        <div style={{fontSize: 27, color: '#f2edf8', marginTop: 70}}>github.com/woodcreeper/slaydown</div>
      </div>
      <div style={{position: 'absolute', right: 113, bottom: 74, color: '#d8b97e', fontSize: 17, letterSpacing: 3}}>BUILT ON LINUX · AUTHENTIC OMARCHY CAPTURES</div>
    </Base>
  );
}

export function SlayDownOmarchyFilm() {
  const {brandFont} = getInputProps<{brandFont: string}>();
  const [fontHandle] = useState(() => delayRender('Loading SlayDown wordmark'));
  useEffect(() => {
    const font = new FontFace('Metal Mania', `url(${brandFont})`);
    font.load().then((loaded) => {
      document.fonts.add(loaded);
      continueRender(fontHandle);
    }).catch(cancelRender);
  }, [brandFont, fontHandle]);
  const scenes = {
    splash: Splash,
    agent: AgentPlan,
    nautilus: NautilusPlan,
    sushi: SushiPreview,
    open: OpenReader,
    features: Features,
    handoff: Handoff,
    edit: Edit,
    refresh: Refresh,
    outro: Outro,
  };
  return (
    <AbsoluteFill style={{background: paper}}>
      <Audio src={staticFile('eyesplit.m4a')} volume={1} />
      {Object.entries(scenes).map(([name, Scene]) => {
        const [from, durationInFrames] = timeline.scenes[name as keyof typeof timeline.scenes];
        return <Sequence key={name} from={from} durationInFrames={durationInFrames}><Scene /></Sequence>;
      })}
    </AbsoluteFill>
  );
}
