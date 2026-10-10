export default function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
