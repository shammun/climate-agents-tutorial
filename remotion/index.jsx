import { Composition, registerRoot } from 'remotion';
import { Explainer } from './Explainer.jsx';
import { BuildingAgents } from './BuildingAgents.jsx';

export const RemotionRoot = () => (
  <>
    <Composition
      id="Explainer"
      component={Explainer}
      durationInFrames={900}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="BuildingAgents"
      component={BuildingAgents}
      durationInFrames={1950}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  </>
);

registerRoot(RemotionRoot);
