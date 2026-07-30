"use client";

import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="spin" size={17} />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  variant = "ghost",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Button className="icon-button" variant={variant} aria-label={label} title={label} {...props}>
      {children}
    </Button>
  );
}

export function Card({className, ...props}: HTMLAttributes<HTMLElement>) {
  return <section className={cn("surface-card", className)} {...props} />;
}

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "primary" | "success" | "warning" | "danger" | "live";
}) {
  return <span className={cn("status-badge", `badge-${variant}`, className)} {...props} />;
}

export function ProgressBar({
  value,
  label = "Progression",
  showValue = true,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="progress-wrap">
      {showValue && (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{safeValue}%</strong>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <span style={{width: `${safeValue}%`}} />
      </div>
    </div>
  );
}

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "error";
  children: ReactNode;
  className?: string;
}) {
  const Icon =
    variant === "success" ? CheckCircle2 : variant === "warning" ? TriangleAlert : AlertCircle;
  return (
    <div className={cn("alert", `alert-${variant}`, className)} role={variant === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" size={19} />
      <div>{children}</div>
    </div>
  );
}

export function Toast({
  message,
  variant = "success",
  onClose,
}: {
  message: string;
  variant?: "success" | "error";
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className={cn("toast", `toast-${variant}`)} role={variant === "error" ? "alert" : "status"}>
      {variant === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
      {onClose && (
        <IconButton label="Fermer la notification" onClick={onClose}>
          <X size={17} />
        </IconButton>
      )}
    </div>
  );
}

export function Skeleton({className}: {className?: string}) {
  return <span className={cn("skeleton", className)} aria-hidden="true" />;
}

export function PageSkeleton({cards = 3}: {cards?: number}) {
  return (
    <div className="skeleton-grid" aria-label="Chargement en cours" role="status">
      {Array.from({length: cards}, (_, index) => (
        <div className="surface-card skeleton-card" key={index}>
          <Skeleton className="skeleton-cover" />
          <Skeleton className="skeleton-line short" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line medium" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-card empty-state">
      <span className="state-icon"><Inbox aria-hidden="true" size={25} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Impossible de charger le contenu",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-card error-state" role="alert">
      <span className="state-icon"><TriangleAlert aria-hidden="true" size={25} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Réessayer</Button>}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="Fermer" onClick={onClose}><X size={19} /></IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} description={description} onClose={onCancel}>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: Array<{id: string; label: string}>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist" aria-label="Sections">
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={cn("tab", active === item.id && "active")}
          key={item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Table({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("table-wrap", className)} {...props} />;
}

export function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" disabled={page === 0} onClick={onPrevious}>Précédent</Button>
      <span>Page <strong>{page + 1}</strong> sur {Math.max(totalPages, 1)}</span>
      <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={onNext}>Suivant</Button>
    </nav>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("form-control", props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("form-control", props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("form-control", props.className)} {...props} />;
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {label: ReactNode}) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
