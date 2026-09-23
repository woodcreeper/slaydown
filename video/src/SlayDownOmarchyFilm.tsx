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

function Brand({dark = false}: {dark?: boolean}) {
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
    </div>
  );
}

function Copy({
  title,
  subtitle,
  dark = false,
  y = 270,
  size = 78,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dark?: boolean;
  y?: number;
  size?: number;
}) {
  return (
    <div style={{position: 'absolute', left: 104, top: y, width: 500}}>
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

function Splash() {
  return (
    <Base dark>
      <div style={{position: 'absolute', left: 108, top: 230, width: 1380}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 27}}>
          <Mark size={86} color="#d6c5e9" />
          <div style={{fontFamily: metal, fontSize: 128, textTransform: 'uppercase', transform: 'skewX(-5deg)', lineHeight: 1.1}}>
            SlayDown<span style={{color: amber}}>.</span>
          </div>
        </div>
        <div style={{fontFamily: serif, fontSize: 88, lineHeight: 1.04, letterSpacing: -2.5, marginTop: 41}}>
          Your agent makes .md files<br />like a boss.
        </div>
        <div style={{fontSize: 27, color: '#d6c5e9', marginTop: 42}}>Now read them like one too.</div>
      </div>
    </Base>
  );
}

function AgentPlan() {
  const frame = useCurrentFrame();
  return (
    <Base dark>
      <Brand dark />
      <Copy title={<>PLAN.md,<br />ready.</>} subtitle="Written locally by your agent on Omarchy." dark y={316} size={88} />
      <Screen name="agent-plan" style={{left: 650, top: 180, opacity: tween(frame, 0, 10, 0, 1), transform: `translateY(${tween(frame, 0, 14, 14, 0)}px)`}} />
    </Base>
  );
}

function NautilusPlan() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand />
      <Copy title={<>Find it.<br />Select it.</>} subtitle="The original PLAN.md is already in Nautilus." y={306} size={88} />
      <Screen name="nautilus-plan" style={{left: 650, top: 180, transform: `translateY(${tween(frame, 0, 18, 12, 0)}px)`}} />
      <div style={{position: 'absolute', left: 108, top: 730}}><Key label="Space  ␣" pressed={frame >= 48} /></div>
    </Base>
  );
}

function SushiPreview() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand />
      <Copy title={<>Quick View<br />with Space.</>} subtitle="Start reading without leaving Nautilus." y={292} size={84} />
      <div style={{position: 'absolute', left: 108, top: 805}}><Key label="Space  ␣" pressed={frame < 16} /></div>
      <Screen name="sushi-preview" style={{left: 650, top: 180, opacity: tween(frame, 0, 12, 0, 1), transform: `scale(${tween(frame, 0, 18, 0.985, 1)})`}} />
    </Base>
  );
}

function OpenReader() {
  const frame = useCurrentFrame();
  const mix = tween(frame, 22, 42, 0, 1);
  return (
    <Base>
      <Brand />
      <Copy title={<>Double-click<br />to go deeper.</>} subtitle="The same file opens in the full SlayDown reader." y={302} size={78} />
      <Screen name="sushi-preview" style={{left: 650, top: 180, opacity: 1 - mix}} />
      <Screen name="reader-outline" style={{left: 650, top: 180, opacity: mix}} />
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
      <Brand />
      <Copy title={<>Read it<br />like a boss.</>} y={280} size={82} />
      <div style={{position: 'absolute', left: 108, top: 540, width: 435}}>
        {labels.map((label, index) => (
          <div key={label} style={{display: 'flex', alignItems: 'center', gap: 17, padding: '20px 0', borderBottom: '1px solid #ddd7e5', color: index === active ? ink : '#a59ead', fontSize: 23}}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: index === active ? (index === 1 ? amber : violet) : 'transparent'}} />
            {label}
          </div>
        ))}
      </div>
      <Screen name={names[active]} style={{left: 650, top: 180}} />
    </Base>
  );
}

function Handoff() {
  const frame = useCurrentFrame();
  const mix = tween(frame, 32, 47, 0, 1);
  return (
    <Base>
      <Brand />
      <Copy title={<>Open in your<br />favorite editor.</>} subtitle="The original PLAN.md goes straight to Zed." y={300} size={74} />
      <Screen name="reader-outline" style={{left: 650, top: 180, opacity: 1 - mix}} />
      <Screen name="zed-before" style={{left: 650, top: 180, opacity: mix}} />
    </Base>
  );
}

function Edit() {
  const frame = useCurrentFrame();
  const state = frame < 25 ? 'zed-before' : frame < 50 ? 'zed-selected' : frame < 75 ? 'zed-typed-1' : frame < 100 ? 'zed-typed-2' : 'zed-typed-3';
  const heading = frame < 25 ? 'Select the heading' : frame < 50 ? 'Ready to replace' : frame < 75 ? '# A plan' : frame < 100 ? '# A plan worth' : '# A plan worth sharing';
  return (
    <Base dark>
      <Brand dark />
      <Copy title={<>Make it<br />worth sharing.</>} subtitle={heading} dark y={300} size={82} />
      <Screen name={state} crop={[0, 35, 2800, 1120]} style={{left: 650, top: 245}} />
      {frame >= 125 ? <div style={{position: 'absolute', left: 108, top: 735}}><Key label="Ctrl  +  S    Saved" pressed={frame < 140} /></div> : null}
    </Base>
  );
}

function Refresh() {
  const frame = useCurrentFrame();
  return (
    <Base>
      <Brand />
      <Copy title={<>SlayDown<br />remembers.</>} subtitle="Save once. The heading and outline update before your eyes." y={306} size={82} />
      <Screen name="reader-refreshed" style={{left: 650, top: 180, opacity: tween(frame, 0, 12, 0, 1), transform: `translateY(${tween(frame, 0, 16, 10, 0)}px)`}} />
    </Base>
  );
}

function Outro() {
  return (
    <Base dark>
      <div style={{position: 'absolute', left: 106, top: 224, width: 1500}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 25}}>
          <Mark size={86} color="#d6c5e9" />
          <div style={{fontFamily: metal, fontSize: 132, textTransform: 'uppercase', transform: 'skewX(-5deg)', lineHeight: 1.1}}>SlayDown<span style={{color: amber}}>.</span></div>
        </div>
        <div style={{fontFamily: serif, fontSize: 88, lineHeight: 1.08, letterSpacing: -2, color: '#e5ddeb', marginTop: 38}}>Don’t Markdown.<br />SlayDown.</div>
        <div style={{fontSize: 27, color: '#d6c5e9', marginTop: 38}}>SlayDown for Omarchy / Linux</div>
        <div style={{fontSize: 27, color: '#f2edf8', marginTop: 64}}>github.com/woodcreeper/slaydown</div>
      </div>
    </Base>
  );
}

function SceneTransition({children, duration}: {children: React.ReactNode; duration: number}) {
  const frame = useCurrentFrame();
  const reveal = duration === 0 ? 0 : tween(frame, 0, duration, 100, 0);
  return <AbsoluteFill style={{clipPath: `inset(0 ${reveal}% 0 0)`}}>{children}</AbsoluteFill>;
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
      {Object.entries(scenes).map(([name, Scene], index) => {
        const [from, durationInFrames] = timeline.scenes[name as keyof typeof timeline.scenes];
        const overlap = index === 0 ? 0 : 10;
        return (
          <Sequence key={name} from={from - overlap} durationInFrames={durationInFrames + overlap}>
            <SceneTransition duration={overlap}><Scene /></SceneTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
