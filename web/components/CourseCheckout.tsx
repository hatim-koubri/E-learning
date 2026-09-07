"use client";

import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import {useState, type ChangeEvent, type FormEvent} from "react";
import {Button, Modal} from "@/components/ui";

type CourseCheckoutProps = {
  open: boolean;
  courseTitle: string;
  trainer: string;
  withClasses: boolean;
  amount: number;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function money(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-MA", {maximumFractionDigits: 2}).format(amount)} ${currency}`;
}

function digits(value: string, maximum: number) {
  return value.replace(/\D/g, "").slice(0, maximum);
}

function formatCardNumber(value: string) {
  return digits(value, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const clean = digits(value, 4);
  return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
}

export function validateExpiry(value: string, today = new Date()) {
  const match = /^(\d{2})\/(\d{1,2})$/.exec(value);
  if (!match) return "Utilisez le format MM/A ou MM/AA.";
  const month = Number(match[1]);
  if (month < 1 || month > 12) return "Le mois doit être compris entre 01 et 12.";
  const yearPart = match[2];
  const currentYear = today.getFullYear();
  let year = 2000 + Number(yearPart);
  if (yearPart.length === 1) {
    year = Math.floor(currentYear / 10) * 10 + Number(yearPart);
  }
  const currentMonth = today.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return "Cette carte est expirée.";
  }
  return "";
}

function previewNumber(value: string) {
  const clean = digits(value, 16);
  const first = clean.slice(0, 4).padEnd(4, "•");
  const last = clean.length > 12 ? clean.slice(12, 16).padEnd(4, "•") : "••••";
  return `${first}  ••••  ••••  ${last}`;
}

export function CourseCheckout({
  open,
  courseTitle,
  trainer,
  withClasses,
  amount,
  currency,
  busy,
  onClose,
  onConfirm,
}: CourseCheckoutProps) {
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [showCardBack, setShowCardBack] = useState(false);
  const [expiryError, setExpiryError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateExpiry(cardExpiry);
    if (validationError) {
      setExpiryError(validationError);
      const expiryInput = event.currentTarget.elements.namedItem("cardExpiry");
      if (expiryInput instanceof HTMLElement) expiryInput.focus();
      return;
    }
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    void onConfirm();
  }

  const total = money(amount, currency);
  const previewName = cardName.trim().toLocaleUpperCase("fr") || "VOTRE NOM";

  function updateNumber(event: ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(event.target.value));
  }

  function updateExpiry(event: ChangeEvent<HTMLInputElement>) {
    setCardExpiry(formatExpiry(event.target.value));
    setExpiryError("");
  }

  function updateCvc(event: ChangeEvent<HTMLInputElement>) {
    setCardCvc(digits(event.target.value, 4));
  }

  return (
    <Modal
      open={open}
      title="Finaliser votre inscription"
      description="Une dernière étape avant de commencer votre formation."
      onClose={onClose}
      initialFocusSelector="input[name='cardName']"
      panelClassName="checkout-modal"
    >
      <div className="checkout-progress" aria-label="Étapes de l’inscription">
        <span className="done"><CheckCircle2 size={16}/> Offre choisie</span>
        <i aria-hidden="true" />
        <span className="current"><span>2</span> Paiement</span>
        <i aria-hidden="true" />
        <span><span>3</span> Accès au cours</span>
      </div>

      <div className="checkout-layout">
        <form className="checkout-main" onSubmit={submit} noValidate>
          <section className="checkout-section" aria-labelledby="payment-method-title">
            <div className="checkout-section-heading">
              <span><WalletCards size={20}/></span>
              <div><h3 id="payment-method-title">Méthode de paiement</h3><p>Choisissez comment régler votre inscription.</p></div>
            </div>
            <div className="payment-methods">
              <button type="button" className="payment-method selected" aria-pressed="true">
                <span><CreditCard size={22}/></span>
                <strong>Carte bancaire</strong>
                <small>Visa · Mastercard · CMI</small>
                <CheckCircle2 className="payment-check" size={18}/>
              </button>
              <button type="button" className="payment-method" disabled aria-label="PayPal bientôt disponible">
                <span><WalletCards size={22}/></span>
                <strong>PayPal</strong>
                <small>Bientôt disponible</small>
              </button>
            </div>
          </section>

          <section className="checkout-section" aria-labelledby="card-details-title">
            <div className="checkout-section-heading">
              <span><LockKeyhole size={20}/></span>
              <div><h3 id="card-details-title">Détails de la carte</h3><p>Mode démonstration : n’utilisez pas de vraies données bancaires.</p></div>
            </div>
            <div className="card-details-layout">
              <div className="card-visual" aria-label="Aperçu interactif de la carte">
                <div className={`card-visual-inner ${showCardBack ? "flipped" : ""}`}>
                  <div className="card-preview card-front">
                    <div className="card-preview-top"><span>Khotwa</span><span className="card-chip"/></div>
                    <strong data-testid="card-number-preview">{previewNumber(cardNumber)}</strong>
                    <div><span><small>TITULAIRE</small><b data-testid="card-name-preview">{previewName}</b></span><span><small>EXPIRE</small><b data-testid="card-expiry-preview">{cardExpiry || "MM/AA"}</b></span></div>
                  </div>
                  <div className="card-preview card-back">
                    <div className="card-magnetic-strip" />
                    <div className="card-signature-row"><span>Signature</span><strong data-testid="card-cvc-preview">{cardCvc || "•••"}</strong></div>
                    <div className="card-back-brand"><ShieldCheck size={18}/><span>Khotwa</span></div>
                    <small>Le CVC confirme que la carte est entre vos mains.</small>
                  </div>
                </div>
              </div>
              <div className="card-fields">
                <label>Nom sur la carte<input name="cardName" autoComplete="cc-name" required maxLength={30} value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="Votre nom complet" /></label>
                <label>Numéro de carte<input name="cardNumber" autoComplete="cc-number" inputMode="numeric" required maxLength={19} pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}" value={cardNumber} onChange={updateNumber} placeholder="4242 4242 4242 4242" /></label>
                <div>
                  <label>Date d’expiration<input name="cardExpiry" autoComplete="cc-exp" inputMode="numeric" required maxLength={5} aria-invalid={Boolean(expiryError)} aria-describedby="card-expiry-error" value={cardExpiry} onChange={updateExpiry} onBlur={() => setExpiryError(validateExpiry(cardExpiry))} placeholder="MM/A ou MM/AA" />{expiryError && <small className="field-error" id="card-expiry-error" role="alert">{expiryError}</small>}</label>
                  <label>CVC<input name="cardCvc" type="password" autoComplete="cc-csc" inputMode="numeric" required maxLength={4} pattern="[0-9]{3,4}" value={cardCvc} onChange={updateCvc} onFocus={() => setShowCardBack(true)} onBlur={() => setShowCardBack(false)} placeholder="123" /></label>
                </div>
              </div>
            </div>
          </section>

          <div className="checkout-secure-note">
            <ShieldCheck size={19}/>
            <p><strong>Démonstration sécurisée</strong> Les données saisies restent dans ce formulaire et ne sont ni envoyées ni enregistrées.</p>
          </div>
          <div className="checkout-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Retour</Button>
            <Button type="submit" loading={busy}><LockKeyhole size={17}/> Confirmer le paiement simulé · {total}</Button>
          </div>
        </form>

        <aside className="checkout-summary" aria-label="Résumé de la commande">
          <span className="eyebrow">Votre commande</span>
          <div className="checkout-course-icon"><BookOpen size={25}/></div>
          <h3>{courseTitle}</h3>
          <p>Par {trainer}</p>
          <dl>
            <div><dt>Formule</dt><dd>{withClasses ? "Contenu + classes" : "Contenu"}</dd></div>
            {withClasses && <div><dt>Sessions en direct</dt><dd><UsersRound size={15}/> Incluses</dd></div>}
            <div><dt>Accès</dt><dd>Immédiat</dd></div>
          </dl>
          <div className="checkout-total"><span>Total</span><strong>{total}</strong><small>Montant affiché par Khotwa</small></div>
          <div className="checkout-assurances"><span><ShieldCheck size={16}/> Paiement simulé</span><span><LockKeyhole size={16}/> Données non conservées</span></div>
        </aside>
      </div>
    </Modal>
  );
}

export type PaymentResult = {
  status: "success" | "error";
  message: string;
};

export function PaymentResultModal({
  result,
  courseTitle,
  amount,
  currency,
  onClose,
  onContinue,
  onRetry,
}: {
  result: PaymentResult;
  courseTitle: string;
  amount: number;
  currency: string;
  onClose: () => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const success = result.status === "success";
  return (
    <Modal
      open
      title={success ? "Paiement confirmé" : "Paiement non abouti"}
      description={success ? "Votre inscription est maintenant active." : "Aucun accès payant n’a été activé."}
      onClose={onClose}
      panelClassName="payment-result-modal"
    >
      <section className={`payment-result-card ${result.status}`} role="status" aria-live="polite">
        <span className="payment-result-icon">{success ? <CheckCircle2 size={34}/> : <XCircle size={34}/>}</span>
        <span className="eyebrow">{success ? "Transaction réussie" : "Transaction refusée"}</span>
        <h3>{success ? "Paiement réussi" : "Le paiement a échoué"}</h3>
        <p>{result.message}</p>
        <div className="payment-result-order"><span>{courseTitle}</span><strong>{money(amount, currency)}</strong></div>
        <div className="payment-result-actions">
          {success ? (
            <Button onClick={onContinue}>Continuer vers la formation <ArrowRight size={17}/></Button>
          ) : (
            <Button onClick={onRetry}><RefreshCcw size={17}/> Réessayer le paiement</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      </section>
    </Modal>
  );
}
