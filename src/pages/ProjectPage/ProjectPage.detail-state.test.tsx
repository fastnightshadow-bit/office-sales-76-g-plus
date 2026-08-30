import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import projectDetail from "../../data/project-details/zhk-novatsiya.json";
import type { Project } from "../../features/catalog/catalog.types";
import { appRoutes } from "../../app/routes";

const { getProjectDetailBySlug } = vi.hoisted(() => ({
  getProjectDetailBySlug: vi.fn<(slug: string) => Promise<Project | undefined>>(),
}));

vi.mock("../../features/catalog/project-detail-repository", () => ({ getProjectDetailBySlug }));

function renderProject() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/catalog/zhk-novatsiya"] });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => getProjectDetailBySlug.mockReset());
afterEach(cleanup);

describe("ProjectPage detail loading state", () => {
  it("keeps summary content visible while details load and replaces the loading state on success", async () => {
    let resolveDetail: ((project: Project) => void) | undefined;
    getProjectDetailBySlug.mockReturnValue(new Promise((resolve) => {
      resolveDetail = resolve;
    }));

    renderProject();

    expect(await screen.findByRole("heading", { level: 1, name: "ЖК Новация" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Загрузка подробностей проекта" })).toBeVisible();
    expect(screen.getByText("Ярославль, Республиканский проезд д.1")).toBeVisible();

    await act(async () => resolveDetail?.(projectDetail as Project));

    expect(screen.queryByRole("status", { name: "Загрузка подробностей проекта" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "О проекте" })).toBeVisible();
  });

  it("catches a detail failure and retries without hiding the summary", async () => {
    const user = userEvent.setup();
    getProjectDetailBySlug
      .mockRejectedValueOnce(new Error("detail unavailable"))
      .mockResolvedValueOnce(projectDetail as Project);

    renderProject();

    const error = await screen.findByRole("alert", { name: "Ошибка загрузки подробностей проекта" });
    expect(error).toHaveTextContent("Не удалось загрузить подробности проекта");
    expect(screen.getByRole("heading", { level: 1, name: "ЖК Новация" })).toBeVisible();
    expect(screen.getByText("Ярославль, Республиканский проезд д.1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(getProjectDetailBySlug).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { level: 2, name: "О проекте" })).toBeVisible();
    expect(screen.queryByRole("alert", { name: "Ошибка загрузки подробностей проекта" })).not.toBeInTheDocument();
  });
});
