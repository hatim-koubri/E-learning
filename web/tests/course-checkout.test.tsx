import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {CourseCheckout, PaymentResultModal, validateExpiry} from "@/components/CourseCheckout";

function renderCheckout() {
  render(
    <CourseCheckout
      open
      courseTitle="Docker avancé"
      trainer="Rayan"
      withClasses
      amount={780}
      currency="DH"
      busy={false}
      onClose={vi.fn()}
      onConfirm={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe("paiement interactif", () => {
  it("refuse un mois impossible et accepte une année réelle sur un chiffre", () => {
    const today = new Date(2026, 7, 24);

    expect(validateExpiry("20/20", today)).toBe("Le mois doit être compris entre 01 et 12.");
    expect(validateExpiry("12/6", today)).toBe("");
    expect(validateExpiry("07/6", today)).toBe("Cette carte est expirée.");
    expect(validateExpiry("12/5", today)).toBe("Cette carte est expirée.");
  });

  it("formate les champs et met à jour le recto de la carte", async () => {
    const user = userEvent.setup();
    renderCheckout();

    const name = screen.getByLabelText("Nom sur la carte");
    const number = screen.getByLabelText("Numéro de carte");
    const expiry = screen.getByLabelText("Date d’expiration");

    await user.type(name, "Hatim Alaoui");
    await user.type(number, "5471a2588-8123-4567");
    await user.type(expiry, "12555");

    expect(number).toHaveValue("5471 2588 8123 4567");
    expect(expiry).toHaveValue("12/55");
    expect(screen.getByTestId("card-name-preview")).toHaveTextContent("HATIM ALAOUI");
    expect(screen.getByTestId("card-number-preview")).toHaveTextContent("5471 •••• •••• 4567");
    expect(screen.getByTestId("card-expiry-preview")).toHaveTextContent("12/55");
  });

  it("retourne la carte pendant la saisie du CVC et limite celui-ci à quatre chiffres", async () => {
    const user = userEvent.setup();
    renderCheckout();

    const cvc = screen.getByLabelText("CVC");
    const card = document.querySelector(".card-visual-inner");
    await user.type(cvc, "12a345");

    expect(cvc).toHaveValue("1234");
    expect(card).toHaveClass("flipped");
    expect(screen.getByTestId("card-cvc-preview")).toHaveTextContent("1234");

    await user.click(screen.getByLabelText("Nom sur la carte"));
    expect(card).not.toHaveClass("flipped");
  });

  it("bloque la confirmation lorsque le mois d’expiration n’existe pas", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <CourseCheckout
        open courseTitle="Docker avancé" trainer="Rayan" withClasses amount={780}
        currency="DH" busy={false} onClose={vi.fn()} onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText("Date d’expiration"), "20/20");
    await user.click(screen.getByRole("button", {name: /Confirmer le paiement simulé/}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Le mois doit être compris entre 01 et 12.");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("affiche clairement le succès ou l’échec du paiement", () => {
    const {rerender} = render(
      <PaymentResultModal
        result={{status: "success", message: "Votre inscription est confirmée."}}
        courseTitle="Docker avancé" amount={780} currency="DH"
        onClose={vi.fn()} onContinue={vi.fn()} onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Paiement réussi");
    expect(screen.getByRole("status")).toHaveTextContent("780 DH");

    rerender(
      <PaymentResultModal
        result={{status: "error", message: "Carte refusée."}}
        courseTitle="Docker avancé" amount={780} currency="DH"
        onClose={vi.fn()} onContinue={vi.fn()} onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Le paiement a échoué");
    expect(screen.getByRole("button", {name: /Réessayer le paiement/})).toBeInTheDocument();
  });
});
