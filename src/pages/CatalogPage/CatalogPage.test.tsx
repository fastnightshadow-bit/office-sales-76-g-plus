import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import CatalogPage from "./CatalogPage";
import { appRoutes } from "../../app/routes";

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Текущий URL">{location.pathname}{location.search}</output>;
}

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)} type="button">Назад в истории</button>;
}

function renderCatalog(initialEntry = "/catalog") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CatalogPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function resultCount() {
  return screen.getByRole("status", { name: "Количество найденных проектов" });
}

afterEach(cleanup);

describe("CatalogPage", () => {
  it("filters by district chip and persists the selection in the URL", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("button", { name: "Центр" }));

    expect(resultCount()).toHaveTextContent("Найдено 12 проектов");
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("/catalog?district=%D0%A6%D0%B5%D0%BD%D1%82%D1%80");
    expect(screen.getAllByRole("article")).toHaveLength(12);
  });

  it("supports room, maximum price, completion and sort controls", async () => {
    const user = userEvent.setup();
    renderCatalog();
    const filters = screen.getByRole("complementary", { name: "Фильтры каталога" });

    await user.click(within(filters).getByRole("checkbox", { name: "4+ комнаты" }));
    expect(resultCount()).toHaveTextContent("Найдено 4 проекта");

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    await user.selectOptions(within(filters).getByRole("combobox", { name: "Максимальная цена" }), "5000000");
    expect(resultCount()).toHaveTextContent("Найден 61 проект");

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    await user.selectOptions(within(filters).getByRole("combobox", { name: "Срок сдачи" }), "ready");
    expect(resultCount()).toHaveTextContent("Найдено 29 проектов");

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Сортировка" }), "price-asc");
    expect(within(screen.getAllByRole("article")[0]!).getByRole("heading", { level: 2 }))
      .toHaveTextContent("ЖК Барвиха кор. 4");
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("sort=price-asc");
  });

  it("hydrates controls from the URL and resets all filters", async () => {
    const user = userEvent.setup();
    renderCatalog("/catalog?district=%D0%A6%D0%B5%D0%BD%D1%82%D1%80&rooms=2&completion=2027&maximumPrice=10000000&sort=price-desc");
    const filters = screen.getByRole("complementary", { name: "Фильтры каталога" });

    expect(screen.getByRole("button", { name: "Центр" })).toHaveAttribute("aria-pressed", "true");
    expect(within(filters).getByRole("checkbox", { name: "2 комнаты" })).toBeChecked();
    expect(within(filters).getByRole("combobox", { name: "Максимальная цена" })).toHaveValue("10000000");
    expect(within(filters).getByRole("combobox", { name: "Срок сдачи" })).toHaveValue("2027");
    expect(screen.getByRole("combobox", { name: "Сортировка" })).toHaveValue("price-desc");

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));

    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("/catalog");
    expect(resultCount()).toHaveTextContent("Найдено 92 проекта");
  });

  it("debounces text search before changing the URL and results", async () => {
    const user = userEvent.setup();
    renderCatalog();
    const search = screen.getByRole("searchbox", { name: "Поиск по каталогу" });

    await user.type(search, "Салтыкова");
    expect(resultCount()).toHaveTextContent("Найдено 92 проекта");
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("/catalog");

    await waitFor(() => expect(resultCount()).toHaveTextContent("Найден 1 проект"), { timeout: 1_000 });
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("text=%D0%A1%D0%B0%D0%BB%D1%82%D1%8B%D0%BA%D0%BE%D0%B2%D0%B0");
    expect(screen.getByRole("heading", { level: 2, name: "Дом на Салтыкова Щедрина" })).toBeVisible();
  });

  it("restores the search field and results during browser history navigation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={["/catalog?text=%D0%90%D1%82%D0%BB%D0%B0%D1%81", "/catalog?text=%D0%A1%D0%B0%D0%BB%D1%82%D1%8B%D0%BA%D0%BE%D0%B2%D0%B0"]}
        initialIndex={1}
      >
        <CatalogPage />
        <BackButton />
      </MemoryRouter>,
    );

    expect(screen.getByRole("searchbox", { name: "Поиск по каталогу" })).toHaveValue("Салтыкова");
    await user.click(screen.getByRole("button", { name: "Назад в истории" }));

    expect(screen.getByRole("searchbox", { name: "Поиск по каталогу" })).toHaveValue("Атлас");
    expect(screen.getByRole("heading", { level: 2, name: "ЖК Атлас" })).toBeVisible();
  });

  it("renders 18 projects at first, loads 18 more, and resets the window after filtering", async () => {
    const user = userEvent.setup();
    renderCatalog();

    expect(screen.getAllByRole("article")).toHaveLength(18);
    await user.click(screen.getByRole("button", { name: "Показать ещё" }));
    expect(screen.getAllByRole("article")).toHaveLength(36);

    await user.click(screen.getByRole("button", { name: "Заволжский" }));
    expect(screen.getAllByRole("article")).toHaveLength(18);
  });

  it("shows a useful empty state and never renders malformed price labels", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const firstRealCard = screen.getAllByRole("article")[0]!;
    expect(within(firstRealCard).getByText(/^от \d+(?:[,.]\d+)? млн ₽$/)).toBeVisible();
    expect(within(firstRealCard).queryByText(/млн ₽\/м²/)).not.toBeInTheDocument();
    expect(within(firstRealCard).queryByText(/^от\s*$/)).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Поиск по каталогу" }), "несуществующий проект xyz");
    expect(await screen.findByRole("heading", { name: "Ничего не нашли" }, { timeout: 1_000 })).toBeVisible();
    expect(screen.getByRole("button", { name: "Сбросить фильтры" })).toBeVisible();
    expect(screen.queryByText(/млн ₽\/м²/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^от\s*$/)).not.toBeInTheDocument();
  });

  it("keeps mobile filter changes as a draft until they are applied", async () => {
    const user = userEvent.setup();
    renderCatalog("/catalog?district=%D0%A6%D0%B5%D0%BD%D1%82%D1%80");

    await user.click(screen.getByRole("button", { name: "Открыть фильтры" }));
    let dialog = screen.getByRole("dialog", { name: "Фильтры каталога" });
    await user.click(within(dialog).getByRole("checkbox", { name: "4+ комнаты" }));
    await user.click(within(dialog).getByRole("button", { name: "Закрыть фильтры" }));
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("/catalog?district=%D0%A6%D0%B5%D0%BD%D1%82%D1%80");

    await user.click(screen.getByRole("button", { name: "Открыть фильтры" }));
    dialog = screen.getByRole("dialog", { name: "Фильтры каталога" });
    await user.click(within(dialog).getByRole("checkbox", { name: "4+ комнаты" }));
    await user.click(within(dialog).getByRole("button", { name: /Показать \d+ проект/ }));

    expect(screen.queryByRole("dialog", { name: "Фильтры каталога" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Текущий URL")).toHaveTextContent("rooms=4%2B");
  });

  it("moves focus into the mobile sheet and restores it after Escape", async () => {
    const user = userEvent.setup();
    renderCatalog();
    const trigger = screen.getByRole("button", { name: "Открыть фильтры" });

    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Закрыть фильтры" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Фильтры каталога" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("prevents assistive technologies from reaching the page behind the mobile sheet", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <button type="button">Действие оболочки</button>
        <CatalogPage />
      </MemoryRouter>,
    );
    const search = screen.getByRole("searchbox", { name: "Поиск по каталогу" });
    const shellAction = screen.getByRole("button", { name: "Действие оболочки" });

    await user.click(screen.getByRole("button", { name: "Открыть фильтры" }));
    expect(search.closest("[inert]")).toHaveAttribute("aria-hidden", "true");
    expect(shellAction.closest("[inert]")).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button", { name: "Закрыть фильтры" }));
    expect(search.closest("[inert]")).toBeNull();
    expect(shellAction.closest("[inert]")).toBeNull();
  });

  it("closes the mobile filter sheet and removes its modal effects when the desktop breakpoint starts", async () => {
    const user = userEvent.setup();
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const media = {
      matches: true,
      media: "(max-width: 1023px)",
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    } as unknown as MediaQueryList;
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => media });
    renderCatalog();

    await user.click(screen.getByRole("button", { name: "Открыть фильтры" }));
    expect(document.body.style.overflow).toBe("hidden");

    Object.assign(media, { matches: false });
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Фильтры каталога" })).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe("");
    expect(document.querySelector("[inert]")).toBeNull();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });
});

describe("catalog routes", () => {
  it.each([
    ["/catalog", "Каталог проектов"],
    ["/favorites", "Избранное"],
  ])("renders the complete page at %s", async (path, heading) => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
});
