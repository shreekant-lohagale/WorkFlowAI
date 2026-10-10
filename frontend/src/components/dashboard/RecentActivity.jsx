import SectionHeader from "../common/SectionHeader";
import StatusBadge from "../common/StatusBadge";

export default function RecentActivity({ items }) {
  return (
    <section className="panel activity-panel">
      <SectionHeader title="Recent Activity" description="Latest outputs across your workspace." meta="Demo activity" />
      <div className="activity-list">
        {items.map(({ type, title, status, time, icon: Icon }) => (
          <div className="activity-row" key={`${type}-${title}`}>
            <div className="activity-icon"><Icon size={17} aria-hidden="true" /></div>
            <div className="activity-copy"><strong>{title}</strong><span>{type}</span></div>
            <StatusBadge status={status} />
            <time>{time}</time>
          </div>
        ))}
      </div>
    </section>
  );
}
