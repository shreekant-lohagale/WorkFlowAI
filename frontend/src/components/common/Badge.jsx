export default function Badge({ children, icon: Icon }) {
  return (
    <span className="badge">
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}
