import { Check, Eye, FileSearch, ShieldCheck } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

const controls = [
  { label: "Source-aware prompting", icon: FileSearch },
  { label: "No invented missing facts", icon: Check },
  { label: "Human approval required", icon: Eye },
  { label: "Sensitive-data awareness", icon: ShieldCheck },
];

export default function ResponsibleAI() {
  return (
    <section className="panel responsible-panel">
      <SectionHeader title="Responsible AI" description="Controls designed into every future workflow." />
      <div className="responsible-statement">
        <span>Our operating principle</span>
        <h3>AI drafts.<br />Humans decide.</h3>
      </div>
      <div className="control-list">
        {controls.map(({ label, icon: Icon }) => (
          <div className="control-item" key={label}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
