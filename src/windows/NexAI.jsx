import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ProjectPlaceholder from '#components/ProjectPlaceholder.jsx';
import { NEXAI } from '#constants/nexai.js';

const NexAI = () => <ProjectPlaceholder project={NEXAI} windowKey="nexai" />;

const NexAIWindow = WindowWrapper(NexAI, 'nexai');
export default NexAIWindow;
