import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../../app/routes";
import { getProjects } from "../../features/catalog/catalog-repository";
import { selectFeaturedProjects } from "./components/FeaturedProjects";

function renderRoute(initialEntry = "/") {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
  render(<RouterProvider router={router} />);
  return router;
}

function useViewport(width: number) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: (() => {
      const maximum = /max-width:\s*(\d+)px/.exec(query)?.[1];
      const minimum = /min-width:\s*(\d+)px/.exec(query)?.[1];
      return (maximum === undefined || width <= Number(maximum))
        && (minimum === undefined || width >= Number(minimum));
    })(),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
  window.localStorage.clear();
});

describe("G+ home page", () => {
  it("renders the approved hero immediately from the local source-backed image", async () => {
    renderRoute();

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Весь город. Один правильный выбор.",
    })).toBeVisible();
    expect(screen.getByText("Отобранные новостройки Ярославля")).toBeVisible();
    expect(screen.getByRole("img", { name: "Современная архитектура Ярославля" })).toHaveAttribute(
      "src",
      "/media/site/hero-g-plus.webp",
    );
  });

  it("uses the real inventory count and never shows the rejected figure", async () => {
    renderRoute();

    expect(await screen.findByText("92 проекта")).toBeVisible();
    expect(screen.queryByText(/184/)).not.toBeInTheDocument();
    expect(screen.getByText(/5 категорий районов в каталоге/)).toBeVisible();
    expect(screen.queryByText(/районов города/)).not.toBeInTheDocument();
  });

  it("uses a curated deterministic featured set without malformed campaign copy", () => {
    const featured = selectFeaturedProjects(getProjects());

    expect(featured.map(({ slug }) => slug)).toEqual([
      "zhk-novatsiya",
      "zhk-yaroslavl-siti-1-ztap",
      "zhk-granat",
    ]);
    expect(featured.map(({ shortDescription }) => shortDescription).join(" ")).not.toMatch(/кв\\м|Акция ограничена/i);
  });

  it("serializes all desktop hero filters into catalog URL state", async () => {
    const user = userEvent.setup();
    const router = renderRoute();

    await screen.findByRole("heading", { level: 1 });
    await user.selectOptions(screen.getByLabelText("Комнаты"), "2");
    await user.selectOptions(screen.getByLabelText("Максимальная цена"), "7000000");
    await user.selectOptions(screen.getByLabelText("Район"), "Центр");
    await user.click(screen.getByRole("button", { name: /Показать \d+ проект/ }));

    expect(router.state.location.pathname).toBe("/catalog");
    const params = new URLSearchParams(router.state.location.search);
    expect(params.getAll("rooms")).toEqual(["2"]);
    expect(params.get("maximumPrice")).toBe("7000000");
    expect(params.get("district")).toBe("Центр");
  });

  it("keeps mobile changes as a draft until apply and cancels without leaking state", async () => {
    useViewport(390);
    const user = userEvent.setup();
    const router = renderRoute();

    const trigger = await screen.findByRole("button", { name: "Комнаты · Цена · Район" });
    await user.click(trigger);
    let dialog = screen.getByRole("dialog", { name: "Фильтры поиска" });
    await user.selectOptions(within(dialog).getByLabelText("Комнаты"), "2");
    await user.selectOptions(within(dialog).getByLabelText("Район"), "Центр");
    expect(router.state.location.search).toBe("");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Фильтры поиска" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    dialog = screen.getByRole("dialog", { name: "Фильтры поиска" });
    expect(within(dialog).getByLabelText("Комнаты")).toHaveValue("");
    expect(within(dialog).getByLabelText("Район")).toHaveValue("");

    await user.selectOptions(within(dialog).getByLabelText("Комнаты"), "2");
    await user.selectOptions(within(dialog).getByLabelText("Максимальная цена"), "7000000");
    await user.selectOptions(within(dialog).getByLabelText("Район"), "Центр");
    const apply = within(dialog).getByRole("button", { name: "Показать 3 проекта" });
    await user.click(apply);

    expect(router.state.location.pathname).toBe("/catalog");
    const params = new URLSearchParams(router.state.location.search);
    expect(params.getAll("rooms")).toEqual(["2"]);
    expect(params.get("maximumPrice")).toBe("7000000");
    expect(params.get("district")).toBe("Центр");
    expect(document.body.style.overflow).toBe("");
  });

  it("uses the full hero search from the 768px tablet boundary", async () => {
    useViewport(768);
    renderRoute();

    expect(await screen.findByRole("form", { name: "Поиск новостроек" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Комнаты · Цена · Район" })).not.toBeInTheDocument();
  });

  it("renders deterministic featured cards with valid total-price labels", async () => {
    renderRoute();

    await screen.findByRole("heading", { name: "Проекты, с которых стоит начать" });
    const cards = screen.getAllByRole("article").filter((card) => card.dataset.variant === "featured");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(within(card).getByText(/^от \d+(?:[,.]\d+)? млн ₽$/)).toBeVisible();
      expect(within(card).getByRole("link", { name: /Подробнее о проекте/ })).toHaveAttribute(
        "href",
        expect.stringMatching(/^\/catalog\//),
      );
    }
    expect(screen.queryByText(/млн ₽\/м²/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^от\s*$/)).not.toBeInTheDocument();
  });

  it("opens honest local lead dialogs for presentation and consultation CTAs", async () => {
    const user = userEvent.setup();
    renderRoute();

    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getByRole("button", { name: "Запросить презентацию" }));
    expect(screen.getByRole("dialog", { name: "Заказать звонок" })).toBeVisible();
    expect(screen.getByText(/данные никуда не отправляются/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Закрыть" }));

    await user.click(screen.getByRole("button", { name: "Получить подборку" }));
    expect(screen.getByRole("dialog", { name: "Получить подборку" })).toBeVisible();
  });

  it("shows verified compact company contacts", async () => {
    renderRoute();

    const company = await screen.findByRole("region", { name: "О компании" });
    expect(within(company).getByText("Михаил Валерьевич Рыжков")).toBeVisible();
    expect(within(company).getByRole("link", { name: "+7 (4852) 95-55-55" })).toHaveAttribute(
      "href",
      "tel:+74852955555",
    );
    expect(within(company).getByRole("link", { name: "yar.vibor@mail.ru" })).toHaveAttribute(
      "href",
      "mailto:yar.vibor@mail.ru",
    );
    expect(within(company).getByText("Ярославль, ул. Победы, д. 38/27, офис 501")).toBeVisible();
  });

  it("switches the shared shell from overlay home mode to solid internal mode", async () => {
    const router = renderRoute();

    expect(await screen.findByRole("banner")).toHaveAttribute("data-mode", "overlay");
    await router.navigate("/catalog");
    expect(await screen.findByRole("heading", { name: "Каталог проектов" })).toBeVisible();
    expect(await screen.findByRole("banner")).toHaveAttribute("data-mode", "solid");
  });

  it("keeps the mobile filter sheet scrollable and safe-area aware", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/pages/HomePage/components/HeroSearch.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.sheet\s*\{[\s\S]*overflow-y:\s*auto;[\s\S]*overscroll-behavior:\s*contain;/);
    expect(css).toMatch(/\.sheet\s*\{[\s\S]*safe-area-inset-bottom/);
  });
});
