import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadDialog } from "./LeadDialog";

afterEach(() => {
  document.body.innerHTML = "<div id=\"root\"></div>";
  document.body.style.overflow = "";
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Имя"), "Илья");
  await user.type(screen.getByLabelText("Телефон"), "+7 910 000-00-00");
  await user.click(screen.getByRole("checkbox", { name: /согласие/i }));
}

describe("LeadDialog", () => {
  it("shows demo success without transmitting data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<LeadDialog open kind="viewing" projectTitle="ЖК Новация" onClose={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Проверить заявку" }));

    expect(await screen.findByText(/Демо-форма проверена/)).toBeVisible();
    expect(screen.getByText(/Сейчас данные никуда не отправляются и не сохраняются/)).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders project context and kind-specific copy", () => {
    render(<LeadDialog open kind="selection" projectTitle="ЖК Новация" onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Получить подборку" })).toBeInTheDocument();
    expect(screen.getByText(/ЖК Новация/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /обработкой персональных данных/i })).toHaveAttribute("href", "/consent");
  });

  it("focuses the first invalid field and describes its error", async () => {
    const user = userEvent.setup();
    render(<LeadDialog open kind="callback" onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Проверить заявку" }));

    const name = screen.getByLabelText("Имя");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", expect.stringContaining("error"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("masks typed and pasted phones while allowing controlled deletion", async () => {
    const user = userEvent.setup();
    render(<LeadDialog open kind="callback" onClose={vi.fn()} />);
    const phone = screen.getByLabelText("Телефон");

    await user.type(phone, "9100000000");
    expect(phone).toHaveValue("+7 (910) 000-00-00");

    await user.clear(phone);
    fireEvent.change(phone, { target: { value: "+79100000000" } });
    expect(phone).toHaveValue("+7 (910) 000-00-00");

    await user.keyboard("{Backspace}");
    expect(phone).toHaveValue("+7 (910) 000-00-0");

    await user.clear(phone);
    await user.type(phone, "+79100000000");
    expect(phone).toHaveValue("+7 (910) 000-00-00");

    await user.clear(phone);
    await user.type(phone, "89100000000");
    expect(phone).toHaveValue("+7 (910) 000-00-00");
  });

  it("traps keyboard focus and closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LeadDialog open kind="viewing" onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getByRole("button", { name: "Закрыть" });

    closeButton.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Проверить заявку" }));

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the page and restores the external trigger focus and attributes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Открыть";
    document.body.append(trigger);
    trigger.focus();

    const { rerender, unmount } = render(<LeadDialog open kind="viewing" onClose={onClose} />);
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    expect(document.getElementById("root")).toHaveAttribute("aria-hidden", "true");
    expect(document.getElementById("root")).toHaveAttribute("inert");

    rerender(<LeadDialog open={false} kind="viewing" onClose={onClose} />);
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(trigger).toHaveFocus();
    expect(document.getElementById("root")).not.toHaveAttribute("aria-hidden");
    expect(document.getElementById("root")).not.toHaveAttribute("inert");

    unmount();
    expect(document.body.style.overflow).toBe("");
    void user;
  });

  it("keeps the modal locked and focused when an inline close callback changes", async () => {
    const firstClose = vi.fn();
    const latestClose = vi.fn();
    const { rerender } = render(
      <LeadDialog kind="viewing" onClose={() => firstClose()} open projectTitle="ЖК Новация" />,
    );
    const dialog = await screen.findByRole("dialog");
    const phone = screen.getByLabelText("Телефон");
    phone.focus();
    rerender(<LeadDialog kind="viewing" onClose={() => latestClose()} open projectTitle="ЖК Новация" />);

    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.getElementById("root")).toHaveAttribute("inert");
    expect(phone).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
  });

  it("clears a draft when the dialog is closed and reopened", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<LeadDialog open kind="viewing" onClose={onClose} />);
    await fillValidForm(user);
    rerender(<LeadDialog open={false} kind="viewing" onClose={onClose} />);
    rerender(<LeadDialog open kind="viewing" onClose={onClose} />);

    expect(screen.getByLabelText("Имя")).toHaveValue("");
    expect(screen.getByLabelText("Телефон")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: /согласие/i })).not.toBeChecked();
  });

  it("clears the draft after the local success panel is closed", async () => {
    const user = userEvent.setup();
    render(<LeadDialog open kind="viewing" onClose={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Проверить заявку" }));
    await screen.findByText(/Демо-форма проверена/);
    await user.click(screen.getByRole("button", { name: "Закрыть результат" }));

    expect(screen.getByLabelText("Имя")).toHaveValue("");
    expect(screen.getByLabelText("Телефон")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: /согласие/i })).not.toBeChecked();
  });

  it("restores no stale focus when the trigger has been removed", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { rerender } = render(<LeadDialog open kind="viewing" onClose={vi.fn()} />);
    trigger.remove();

    rerender(<LeadDialog open={false} kind="viewing" onClose={vi.fn()} />);
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(document.activeElement).not.toBe(trigger);
  });
});
