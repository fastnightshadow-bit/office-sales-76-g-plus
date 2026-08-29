import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { appRoutes } from "../../app/routes";

afterEach(cleanup);

describe("AboutPage", () => {
  it("presents the verified public and legal company identity", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/about"] })} />);

    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("heading", { level: 1, name: "Офис продаж 76" })).toBeVisible();
    expect(within(main).getByText(/ООО «Ваш выбор»/)).toBeVisible();
    expect(within(main).getByText(/ИНН 7602067446/)).toBeVisible();
    expect(within(main).getByText(/Михаил Валерьевич Рыжков/)).toBeVisible();
  });

  it("exposes the introductory composition as one named region", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/about"] })} />);

    const main = await screen.findByRole("main");
    const hero = await within(main).findByRole("region", { name: "Офис продаж 76" });
    expect(within(hero).getByRole("heading", { level: 1, name: "Офис продаж 76" })).toBeVisible();
    expect(within(hero).getByText(/Помогаем ориентироваться на рынке новостроек/)).toBeVisible();
  });

  it("attributes experience and service figures to the company instead of guaranteeing them", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/about"] })} />);

    const main = await screen.findByRole("main");
    const claims = await within(main).findByRole("region", { name: "Заявления компании" });
    expect(within(claims).getByText("7 лет", { exact: false })).toBeVisible();
    expect(within(claims).getByText("1000+", { exact: false })).toBeVisible();
    expect(within(claims).getByText("до 90%", { exact: false })).toBeVisible();
    expect(within(claims).getByText(/официальных отношениях с застройщиками/i)).toBeVisible();
    expect(within(claims).getByText(/помогает с ипотекой/i)).toBeVisible();
    expect(within(claims).getByText(/консультации 24\/7/i)).toBeVisible();
    expect(within(claims).getByText(/по данным компании/i)).toBeVisible();
  });
});
