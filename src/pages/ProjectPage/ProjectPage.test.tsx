import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { appRoutes } from "../../app/routes";
import { getProjects } from "../../features/catalog/catalog-repository";
import { ProjectDocuments } from "./ProjectPage";
import { ProjectFacts } from "./components/ProjectFacts";
import { RelatedProjects } from "./components/RelatedProjects";

function renderProject(slug: string, suffix = "") {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [`/catalog/${slug}${suffix}`],
  });
  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("ProjectPage", () => {
  it.each([
    ["zhk-novatsiya", "ЖК Новация"],
    ["zhk-yaroslavl-siti-1-ztap", "ЖК Ярославль СИТИ"],
    ["zhk-granat", "ЖК ГРАНАТ"],
  ])("renders imported route %s", async (slug, title) => {
    renderProject(slug);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(screen.getByText(/Актуальность и наличие уточняйте/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Записаться на показ" })).toBeVisible();
  });

  it("renders facts and room minimums from the local snapshot", async () => {
    renderProject("zhk-novatsiya");

    expect(await screen.findByText("Ярославль, Республиканский проезд д.1")).toBeVisible();
    expect(screen.getByText("Сдан!")).toBeVisible();
    expect(screen.getByText("Ипотека от 6%")).toBeVisible();
    expect(screen.getByText("1-комнатные")).toBeVisible();
    expect(screen.getByText("от 6 900 000 ₽")).toBeVisible();
    expect(screen.getByRole("link", { name: "Открыть адрес на карте" })).toHaveAttribute(
      "href",
      expect.stringContaining("query="),
    );
  });

  it("keeps detail facts limited to address, completion, mortgage, and room minimums", () => {
    const base = getProjects().find(({ slug }) => slug === "zhk-novatsiya")!;
    const project = { ...base, developer: "Тестовый застройщик" };

    render(<ProjectFacts project={project} />);

    expect(screen.getByText("Ярославль, Республиканский проезд д.1")).toBeVisible();
    expect(screen.getByText("Сдан!")).toBeVisible();
    expect(screen.getByText("Ипотека от 6%")).toBeVisible();
    expect(screen.getByText("1-комнатные")).toBeVisible();
    expect(screen.getByText("от 6 900 000 ₽")).toBeVisible();
    expect(screen.queryByText("Минимальная стоимость")).not.toBeInTheDocument();
    expect(screen.queryByText("Застройщик")).not.toBeInTheDocument();
    expect(screen.queryByText("Тестовый застройщик")).not.toBeInTheDocument();
  });

  it("omits empty values and unknown room prices instead of showing zero", async () => {
    renderProject("zhk-petropavlovskie-prudy");

    expect(await screen.findByRole("heading", { level: 1, name: 'ЖК "Петропавловские пруды"' })).toBeVisible();
    expect(screen.queryByText("1-комнатные")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 млн|от\s*$|нет руб/i)).not.toBeInTheDocument();
  });

  it("renders content as sequential sections and preserves search params in anchor links", async () => {
    renderProject("zhk-novatsiya", "?from=favorites");

    await screen.findByRole("heading", { level: 1, name: "ЖК Новация" });
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(sectionHeadings).toEqual(expect.arrayContaining([
      "О проекте",
      "Документы",
      "Фотографии",
      "Планировки",
      "Другие проекты рядом",
    ]));
    expect(screen.getByRole("link", { name: "Описание" })).toHaveAttribute(
      "href",
      "/catalog/zhk-novatsiya?from=favorites#description",
    );
    expect(screen.getByRole("link", { name: "Документы" })).toHaveAttribute(
      "href",
      "/catalog/zhk-novatsiya?from=favorites#documents",
    );
  });

  it("opens verified documents as protected external links", async () => {
    renderProject("zhk-novatsiya");

    const documentLink = await screen.findByRole("link", { name: "Смотреть презентацию ЖК" });
    expect(documentLink).toHaveAttribute("target", "_blank");
    expect(documentLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides empty document, feature, and purchase-program sections", async () => {
    renderProject("zhk-barvikha-kor-4");

    await screen.findByRole("heading", { level: 1, name: "ЖК Барвиха кор. 4" });
    expect(screen.queryByRole("heading", { level: 2, name: "Документы" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Особенности проекта" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Программы покупки" })).not.toBeInTheDocument();
  });

  it("replaces an unverified document with an honest source fallback", () => {
    const base = getProjects()[0]!;
    const project = {
      ...base,
      documents: [{ title: "Проектная декларация", url: "https://invalid.example/document.pdf", status: "unverified" as const }],
    };

    render(<ProjectDocuments project={project} />);

    expect(screen.getByText("Документ временно недоступен")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Проектная декларация" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Проверить на странице проекта" })).toHaveAttribute("href", project.sourceUrl);
  });

  it("shows only known layout values and total prices", async () => {
    renderProject("zhk-novatsiya");

    const layout = await screen.findByRole("article", { name: "Планировка 1-комнатная квартира, 44,3 м²" });
    expect(within(layout).getByText("44,3 м²")).toBeVisible();
    expect(within(layout).getByText("7 309 500 ₽")).toBeVisible();
    expect(within(layout).queryByText(/₽\/м²/)).not.toBeInTheDocument();
    expect(within(layout).queryByText("Этаж")).not.toBeInTheDocument();
    expect(within(layout).queryByText("Подъезд")).not.toBeInTheDocument();
  });

  it("opens the gallery and supports ArrowRight, ArrowLeft, Escape, and focus restoration", async () => {
    const user = userEvent.setup();
    renderProject("zhk-novatsiya");
    const trigger = await screen.findByRole("button", { name: "Открыть фотографию 1 из 4" });
    expect(screen.getByRole("img", { name: "ЖК Новация, фотография 1 из 4" })).toBeVisible();

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Фотографии ЖК Новация" });
    expect(within(dialog).getByRole("img", { name: "ЖК Новация, фотография 1 из 4" })).toBeVisible();
    expect(trigger.closest("[inert]")).toHaveAttribute("aria-hidden", "true");

    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByRole("img", { name: "ЖК Новация, фотография 2 из 4" })).toBeVisible();
    await user.keyboard("{ArrowLeft}");
    expect(within(dialog).getByRole("img", { name: "ЖК Новация, фотография 1 из 4" })).toBeVisible();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Фотографии ЖК Новация" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger.closest("[inert]")).toBeNull();
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("opens the viewing dialog with the project context", async () => {
    const user = userEvent.setup();
    renderProject("zhk-novatsiya");

    await user.click(await screen.findByRole("button", { name: "Записаться на показ" }));

    const dialog = screen.getByRole("dialog", { name: "Записаться на показ" });
    expect(within(dialog).getByText(/Объект: ЖК Новация/)).toBeVisible();
  });

  it("prioritizes explicit related projects, then fills from the same district", () => {
    const projects = getProjects();
    const base = projects.find(({ slug }) => slug === "zhk-novatsiya")!;
    const explicit = projects.find(({ slug }) => slug === "zhk-granat")!;
    const project = { ...base, relatedProjectSlugs: [explicit.slug] };

    render(
      <MemoryRouter>
        <RelatedProjects project={project} projects={projects} />
      </MemoryRouter>,
    );

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByRole("heading", { name: "ЖК ГРАНАТ" })).toBeVisible();
    expect(within(cards[1]!).getByRole("heading", { name: "Дом на Салтыкова Щедрина" })).toBeVisible();
    expect(within(cards[2]!).getByRole("heading", { name: "Ленина 28а" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "ЖК Новация" })).not.toBeInTheDocument();
  });
});

describe("all generated project routes", () => {
  it.each(getProjects().map((project) => [project.slug, project.title] as const))(
    "resolves /catalog/%s to its project page",
    async (slug, title) => {
      renderProject(slug);
      expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    },
  );
});
