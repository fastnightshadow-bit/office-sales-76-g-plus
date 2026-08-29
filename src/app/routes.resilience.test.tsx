import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "./routes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("resilient route states", () => {
  it("renders a shell-preserving 404 with routes to catalog search and home", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/missing-route"] });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    expect(screen.getByRole("banner")).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(screen.getByRole("link", { name: "Искать в каталоге" })).toHaveAttribute("href", "/catalog");
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  });

  it("keeps the shell and offers real retry/navigation controls after a route error", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const router = createMemoryRouter([
      {
        element: appRoutes[0]!.element,
        children: [{
          errorElement: appRoutes[0]!.children![0]!.errorElement,
          children: [{ path: "/broken", loader: () => { throw new Error("fixture failure"); }, element: <p>unreachable</p> }],
        }],
      },
    ], { initialEntries: ["/broken"] });
    vi.stubGlobal("location", { ...window.location, reload });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Страница временно недоступна" })).toBeVisible();
    expect(screen.getByText(/Интерфейс столкнулся с технической ошибкой/)).toBeVisible();
    expect(screen.getByRole("banner")).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
    const retry = screen.getByRole("button", { name: "Повторить попытку" });
    retry.focus();
    await user.keyboard("{Enter}");
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Открыть каталог" })).toHaveAttribute("href", "/catalog");
  });
});
