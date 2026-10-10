import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../common/Badge";

export default function WorkflowCard({ workflow }) {
  const Icon = workflow.icon;

  return (
    <Link className="workflow-card" to={workflow.path}>
      <div className="workflow-card-top">
        <div className="workflow-icon"><Icon size={20} aria-hidden="true" /></div>
        <Badge>{workflow.category}</Badge>
      </div>
      <div>
        <h3>{workflow.title}</h3>
        <p>{workflow.description}</p>
      </div>
      <span className="workflow-link">
        Open workflow <ArrowUpRight size={17} aria-hidden="true" />
      </span>
    </Link>
  );
}
