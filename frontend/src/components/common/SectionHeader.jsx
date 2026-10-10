export default function SectionHeader({ title, description, meta }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {meta && <span className="section-meta">{meta}</span>}
    </div>
  );
}
