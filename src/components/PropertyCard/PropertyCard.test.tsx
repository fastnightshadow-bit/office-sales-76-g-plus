import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { getProjects } from "../../features/catalog/catalog-repository";
import type { Project } from "../../features/catalog/catalog.types";
import { PropertyCard } from "./PropertyCard";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("PropertyCard", () => {
  it("keeps the favorite action separate from project navigation", async () => {
    const user = userEvent.setup();
    const project = getProjects().find(({ coverImage, minimumPrice }) => coverImage && minimumPrice);
    if (!project) throw new Error("Expected a project with a cover and trusted price");

    render(<MemoryRouter><PropertyCard project={project} variant="featured" /></MemoryRouter>);

    const card = screen.getByRole("article");
    const projectLink = within(card).getByRole("link", { name: `Подробнее о проекте ${project.title}` });
    const favorite = within(card).getByRole("button", { name: `Добавить ${project.title} в избранное` });
    expect(projectLink).not.toContainElement(favorite);
    expect(favorite).toHaveAttribute("aria-pressed", "false");

    await user.click(favorite);
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(favorite).toHaveAccessibleName(`Убрать ${project.title} из избранного`);
  });

  it("renders an honest fallback when total price is unknown", () => {
    const source = getProjects()[0];
    if (!source) throw new Error("Expected imported projects");
    const project: Project = { ...source };
    delete project.minimumPrice;

    render(<MemoryRouter><PropertyCard project={project} /></MemoryRouter>);

    expect(screen.getByText("Цена по запросу")).toBeVisible();
    expect(screen.queryByText(/₽\/м²/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^от\s*$/)).not.toBeInTheDocument();
  });
});
