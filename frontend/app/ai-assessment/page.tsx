import { AppShell } from "@/app/components/app-shell";
import { AssessmentContent } from "@/app/components/assessment-content";

export default function AIAssessmentPage() {
  return (
    <AppShell active="AI Assessment">
      <AssessmentContent />
    </AppShell>
  );
}
