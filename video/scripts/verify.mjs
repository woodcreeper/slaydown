import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2] || path.join(root,'out/SlayDown-Final.mp4');
const timelineFile=process.env.SLAYDOWN_TIMELINE || (path.basename(input).includes('Omarchy')?'omarchy-timeline.json':'timeline.json');
const timeline=JSON.parse(readFileSync(path.join(root,`src/${timelineFile}`),'utf8'));
const ffmpeg=process.env.FFMPEG || 'ffmpeg';
const metadata=JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe',['-v','error','-show_streams','-show_format','-of','json',input],{encoding:'utf8'}));
const expectedSeconds=timeline.durationInFrames/timeline.fps;
for(const type of ['video','audio']) {
  const stream=metadata.streams.find(s=>s.codec_type===type);
  if(!stream || !Number.isFinite(Number(stream.duration)) || Math.abs(Number(stream.duration)-expectedSeconds)>.1) throw new Error(`${type} must last ${expectedSeconds} seconds.`);
}
execFileSync(ffmpeg,['-v','error','-xerror','-i',input,'-map','0:a:0','-f','null','-'],{stdio:'pipe'});
// Inspect the delivered MP4, not Remotion's preview. Small RGB frames keep this
// scan dependency-free; full-resolution review is still needed for flagged frames.
const bytesPerFrame=384*216*3;
const decoded=execFileSync(ffmpeg,['-v','error','-xerror','-i',input,'-map','0:v:0','-vf','scale=384:216','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:512*1024*1024});
const count=decoded.length/bytesPerFrame;
if(count!==timeline.durationInFrames) throw new Error(`Expected ${timeline.durationInFrames} frames; decoded ${count}.`);
function difference(a,b) {
  let sum=0;
  for(let p=0;p<bytesPerFrame;p++) sum+=Math.abs(decoded[a*bytesPerFrame+p]-decoded[b*bytesPerFrame+p]);
  return sum/bytesPerFrame;
}
const flagged=new Set();
// This edit always has visible text or a screenshot, including its dissolves.
// A flat frame is missing content, even if it occurs during a scene change.
for(let f=0;f<count;f++) {
  let low=255,high=0;
  for(let p=f*bytesPerFrame;p<(f+1)*bytesPerFrame;p+=3) {
    low=Math.min(low,decoded[p]);
    high=Math.max(high,decoded[p]);
  }
  if(high-low<16) flagged.add(f);
}
// Catch brief corruption followed by a return to the surrounding picture.
// Actual transitions change the picture persistently and do not satisfy this.
const changes=Array.from({length:count},(_,f)=>f?difference(f-1,f):0);
for(let f=1;f<count-1;f++) {
  if(changes[f]<2) continue;
  for(let length=1;length<=5 && f+length<count;length++) {
    const recovery=difference(f-1,f+length);
    if(recovery<.4 && difference(f,f+length)>2) {
      for(let n=f;n<f+length;n++) flagged.add(n);
      break;
    }
  }
}
// These intervals are intentionally motionless in SlayDownFilm.tsx. Compare every
// frame in each hold so a multi-frame flash cannot hide between spot checks.
const holds=timeline.staticHolds;
for(const [first,last] of holds) {
  for(let f=first+1;f<=last;f++) if(difference(first,f)>.4) flagged.add(f);
}
const frames=[...flagged].sort((a,b)=>a-b);
if(frames.length) {
  console.error('Unexpected visual changes in decoded frames:',frames.map(f=>`${f} (${(f/30).toFixed(3)}s)`).join(', '));
  process.exitCode=1;
} else {
  console.log(`Scanned all ${count} decoded frames: no blank frames, short corruption bursts, or changes within static holds.`);
  console.log('This targeted regression check does not replace visual review of the exported film.');
}
