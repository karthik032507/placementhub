// Friendly placeholder for empty lists and error states.
export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-icon">
          <Icon size={28} />
        </div>
      )}
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageLoading({ text = "Loading…" }) {
  return (
    <div className="page-loading">
      <span className="spinner" /> {text}
    </div>
  );
}
