import { Composition } from 'remotion';
import { Explainer } from './Explainer.jsx';

export const RemotionRoot = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    durationInFrames={900}
    fps={30}
    width={1280}
    height={720}
    defaultProps={{}}
  />
);
