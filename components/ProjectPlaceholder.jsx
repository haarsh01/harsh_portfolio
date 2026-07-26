import React from 'react';
import { WindowControls } from '#components';
import ShareButton from '#components/ShareButton.jsx';

// Shared body for any project window that intentionally shows only a
// neutral "under development" placeholder rather than product detail (see
// src/constants/nexai.js / auditlm.js for why) — one honest, identical
// shape for every such project rather than a hand-copied window per one.
const ProjectPlaceholder = ({ project, windowKey }) => (
  <>
    <div id="window-header">
      <WindowControls target={windowKey} />
      <h2 className="flex-1 text-center font-bold text-sm">{project.name}</h2>
      <ShareButton destination={{ app: windowKey }} className="icon" label={`Share ${project.name}`} />
    </div>

    <div className="placeholder-app">
      <p className="placeholder-app__title">{project.name}</p>
      <p className="placeholder-app__body">{project.body}</p>
      <p className="placeholder-app__support">{project.supportingLine}</p>
    </div>
  </>
);

export default ProjectPlaceholder;
