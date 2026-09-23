import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {SlayDownFilm} from './SlayDownFilm';
import {SlayDownOmarchyFilm} from './SlayDownOmarchyFilm';
import timeline from './timeline.json';
import omarchyTimeline from './omarchy-timeline.json';

registerRoot(() => <>
  <Composition id="SlayDown" component={SlayDownFilm} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1920} height={1080}/>
  <Composition id="SlayDownOmarchy" component={SlayDownOmarchyFilm} durationInFrames={omarchyTimeline.durationInFrames} fps={omarchyTimeline.fps} width={1920} height={1080}/>
</>);
