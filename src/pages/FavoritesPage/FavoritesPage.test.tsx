import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PropertyCard } from "../../components/PropertyCard/PropertyCard";
import { getProjects } from "../../features/catalog/catalog-repository";
import { favoritesStore } from "../../features/favorites/favorites-store";
import FavoritesPage from "./FavoritesPage";

const project = getProjects()[0]!;

beforeEach(() => {
  window.localStorage.clear();
  favoritesStore.clear();
});

afterEach(() => {
  cleanup();
  favoritesStore.clear();
  window.localStorage.clear();
});

describe("FavoritesPage", () => {
  it("persists a card toggle across remounts and lists the project in favorites", async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <MemoryRouter><PropertyCard project={project} /></MemoryRouter>,
    );
    const toggle = screen.getByRole("button", { name: `Добавить ${project.title} в избранное` });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("office-sales-76:favorites")).toBe(JSON.stringify([project.slug]));
    firstRender.unmount();

    const secondRender = render(
      <MemoryRouter><PropertyCard project={project} /></MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: `Убрать ${project.title} из избранного` }))
      .toHaveAttribute("aria-pressed", "true");
    secondRender.unmount();

    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { level: 2, name: project.title })).toBeVisible();
  });

  it("removes a project immediately from the favorites page", async () => {
    const user = userEvent.setup();
    favoritesStore.toggle(project.slug);
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: `Убрать ${project.title} из избранного` }));

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "В избранном пока пусто" })).toBeVisible();
  });

  it("offers a catalog CTA when there are no favorites", () => {
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "Избранное" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "В избранном пока пусто" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Перейти в каталог" })).toHaveAttribute("href", "/catalog");
  });
});
