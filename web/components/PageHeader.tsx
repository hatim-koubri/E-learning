import {ReactNode} from "react";

export function Breadcrumb({items}: {items: Array<{label: string; href?: string}>}) {
  return (
    <nav className="breadcrumb" aria-label="Fil d’Ariane">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{label: string; href?: string}>;
}) {
  return (
    <header className="page-heading">
      <div>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
