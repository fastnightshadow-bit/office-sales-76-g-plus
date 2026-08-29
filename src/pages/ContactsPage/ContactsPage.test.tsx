import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { appRoutes } from "../../app/routes";

afterEach(cleanup);

describe("ContactsPage", () => {
  it("renders only verified primary contacts and their actionable links", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/contacts"] })} />);

    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("heading", { level: 1, name: "Контакты" })).toBeVisible();
    expect(within(main).getByRole("link", { name: "+7 (4852) 95-55-55" })).toHaveAttribute("href", "tel:+74852955555");
    expect(within(main).getByRole("link", { name: "+7 (910) 977-37-37" })).toHaveAttribute("href", "tel:+79109773737");
    expect(within(main).getByRole("link", { name: "yar.vibor@mail.ru" })).toHaveAttribute("href", "mailto:yar.vibor@mail.ru");
    expect(within(main).getByText("Ярославль, ул. Победы, д. 38/27, офис 501")).toBeVisible();
    expect(within(main).queryByText(/8 \(902\) 333-59-69/)).not.toBeInTheDocument();
  });

  it("uses verified messenger and encoded map destinations", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/contacts"] })} />);

    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("link", { name: "Telegram" })).toHaveAttribute("href", "https://t.me/+79109773737");
    expect(within(main).getByRole("link", { name: "MAX" })).toHaveAttribute("href", "https://max.ru/u/f9LHodD0cOL7QHpM5nPSUAlIVbnrGc7gpielYP7szl5zexEwFiy0aGxow40");
    expect(within(main).getByRole("link", { name: /Открыть в Яндекс Картах/ })).toHaveAttribute(
      "href",
      "https://yandex.ru/maps/?text=%D0%AF%D1%80%D0%BE%D1%81%D0%BB%D0%B0%D0%B2%D0%BB%D1%8C%2C%20%D0%9F%D0%BE%D0%B1%D0%B5%D0%B4%D1%8B%2038%2F27%2C%20%D0%BE%D1%84%D0%B8%D1%81%20501",
    );
  });

  it("opens the honest local-only callback dialog", async () => {
    const user = userEvent.setup();
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/contacts"] })} />);

    await user.click(await screen.findByRole("button", { name: "Заказать звонок" }));
    const dialog = await screen.findByRole("dialog", { name: "Заказать звонок" });
    expect(within(dialog).getByText(/данные никуда не отправляются и не сохраняются/i)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog", { name: "Заказать звонок" })).not.toBeInTheDocument();
  });
});
