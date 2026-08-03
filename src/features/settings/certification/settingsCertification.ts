import { runFinalChecklist } from './settingsChecklist';
import { checkCompliance } from './settingsCompliance';
import { validateCoreInfrastructure } from './settingsValidator';
import { generateReadinessReport } from './settingsReadiness';
import { buildCertificationReport, EnterpriseSettingsCertification } from './settingsReport';

export const runEnterpriseCertification = (): EnterpriseSettingsCertification => {
  const validation = validateCoreInfrastructure();
  const compliance = checkCompliance();
  const readiness = generateReadinessReport();
  const checklist = runFinalChecklist();

  return buildCertificationReport(validation, compliance, readiness, checklist);
};