import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ProjectPlaceholder from '#components/ProjectPlaceholder.jsx';
import { AUDITLM } from '#constants/auditlm.js';

const AuditLM = () => <ProjectPlaceholder project={AUDITLM} windowKey="auditlm" />;

const AuditLMWindow = WindowWrapper(AuditLM, 'auditlm');
export default AuditLMWindow;
