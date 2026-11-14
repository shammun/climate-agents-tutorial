import { AbsoluteFill, Series, Audio, staticFile } from 'remotion';
import { TitleScene } from './scenes/TitleScene.jsx';
import { AgentLoopScene } from './scenes/AgentLoopScene.jsx';
import { SubagentsScene } from './scenes/SubagentsScene.jsx';
import { PipelineScene } from './scenes/PipelineScene.jsx';
import { CTAScene } from './scenes/CTAScene.jsx';

export const Explainer = () => (
  <AbsoluteFill style={{ background: '#060d1f', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <Audio src={staticFile('ambient.mp3')} volume={0.7} />
    <Series>
      <Series.Sequence durationInFrames={150}>
        <TitleScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <AgentLoopScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={180}>
        <SubagentsScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={210}>
        <PipelineScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={120}>
        <CTAScene />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
