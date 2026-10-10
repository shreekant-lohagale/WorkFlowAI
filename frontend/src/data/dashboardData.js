import {
  ClipboardList,
  FileChartColumnIncreasing,
  FileText,
  Mail,
  MessageSquareText,
  Users,
} from "lucide-react";

export const workflows = [
  {
    title: "Email Assistant",
    category: "Communication",
    description: "Turn rough points into clear, professional workplace communication.",
    path: "/email",
    icon: Mail,
  },
  {
    title: "Meeting Summarizer",
    category: "Meetings",
    description: "Convert meeting notes into decisions, actions, risks and concise summaries.",
    path: "/meetings",
    icon: MessageSquareText,
  },
  {
    title: "Action Item Extractor",
    category: "Operations",
    description: "Extract tasks, owners, deadlines, dependencies and missing information.",
    path: "/actions",
    icon: ClipboardList,
  },
  {
    title: "Weekly Report Generator",
    category: "Reporting",
    description: "Transform activity logs into consistent stakeholder-ready reports.",
    path: "/reports",
    icon: FileChartColumnIncreasing,
  },
  {
    title: "Executive Summary",
    category: "Leadership",
    description: "Compress detailed updates into clear management-level insights.",
    path: "/executive",
    icon: FileText,
  },
];

export const activity = [
  { type: "Meeting Summary", title: "Project Sync", status: "Reviewed", time: "2 min ago", icon: Users },
  { type: "Email Draft", title: "Client Follow-up", status: "Approved", time: "18 min ago", icon: Mail },
  { type: "Weekly Report", title: "Sprint 08", status: "Draft", time: "Yesterday", icon: FileChartColumnIncreasing },
];
