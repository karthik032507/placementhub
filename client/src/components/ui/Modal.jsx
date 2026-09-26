import { useEffect } from "react";
import { X } from "lucide-react";

// Generic modal. Closes on backdrop click or Escape unless `locked` is true (e.g. while submitting).
export default function Modal({ title, subtitle, onClose, children, footer, size = "", locked = false }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !locked) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, locked]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !locked && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        {(title || subtitle) && (
          <div className="modal-header">
            <div>
              {title && <h3 className="modal-title">{title}</h3>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={locked} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
