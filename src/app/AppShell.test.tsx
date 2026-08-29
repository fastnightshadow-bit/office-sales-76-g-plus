import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../components/Button/Button";
import { DemoNotice } from "../components/DemoNotice/DemoNotice";
import { MobileBottomNav } from "../components/MobileBottomNav/MobileBottomNav";
import { PageSkeleton } from "../components/PageSkeleton/PageSkeleton";
import { ResponsiveImage } from "../components/ResponsiveImage/ResponsiveImage";
import { Reveal } from "../components/Reveal/Reveal";
import { SiteFooter } from "../components/SiteFooter/SiteFooter";
import { SiteHeader } from "../components/SiteHeader/SiteHeader";
import type { ImageAsset } from "../features/catalog/catalog.types";

const imageAsset: ImageAsset = {
  src: "/media/projects/example/cover-960.webp",
  variants: [
    { url: "/media/projects/example/cover-480.avif", width: 480, format: "avif" },
    { url: "/media/projects/example/cover-960.avif", width: 960, format: "avif" },
    { url: "/media/projects/example/cover-480.webp", width: 480, format: "webp" },
    { url: "/media/projects/example/cover-960.webp", width: 960, format: "webp" },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("G+ application shell", () => {
  it("opens and closes the mobile menu button with restored focus", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SiteHeader mode="overlay" forceMobileForTest />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Открыть меню" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Навигация" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Закрыть меню" }));

    expect(screen.queryByRole("dialog", { name: "Навигация" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("traps focus, closes from navigation, and prevents background interaction", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <SiteHeader forceMobileForTest />
        <main>Фоновое содержимое</main>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Открыть меню" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Навигация" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(document.body.style.overflow).toBe("hidden");
    expect(container).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Закрыть меню" })).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(within(dialog).getByRole("link", { name: companyPhonePattern })).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "Закрыть меню" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Навигация" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const reopenedDialog = screen.getByRole("dialog", { name: "Навигация" });

    await user.click(within(reopenedDialog).getByRole("link", { name: "Каталог" }));
    expect(screen.queryByRole("dialog", { name: "Навигация" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(container).not.toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
  });

  it("restores body and background state when an open header unmounts", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(
      <MemoryRouter>
        <SiteHeader forceMobileForTest />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(document.body.style.overflow).toBe("hidden");
    expect(container).toHaveAttribute("aria-hidden", "true");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(container).not.toHaveAttribute("inert");
  });

  it("can render on the server without reading browser globals at import time", () => {
    expect(() => renderToString(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    )).not.toThrow();
  });

  it("marks active mobile navigation and exposes a real contact action", () => {
    render(
      <MemoryRouter initialEntries={["/catalog"]}>
        <MobileBottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Каталог" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Связаться" })).toHaveAttribute(
      "href",
      "tel:+79109773737",
    );
  });

  it("uses verified company links and identifies the dated private demo", () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "+7 (4852) 95-55-55" })).toHaveAttribute(
      "href",
      "tel:+74852955555",
    );
    expect(within(footer).getByRole("link", { name: "yar.vibor@mail.ru" })).toHaveAttribute(
      "href",
      "mailto:yar.vibor@mail.ru",
    );
    expect(within(footer).getByText("Частная демонстрация")).toBeVisible();
    expect(within(footer).getByText(/29 августа 2026/)).toHaveAttribute(
      "datetime",
      "2026-08-29",
    );
  });

  it("renders the standalone demo notice from the source report", () => {
    render(<DemoNotice />);
    expect(screen.getByText("Частная демонстрация")).toBeVisible();
    expect(screen.getByText(/29 августа 2026/)).toBeVisible();
  });

  it("builds responsive AVIF and WebP sources and prioritizes an eager hero", () => {
    const { container } = render(
      <ResponsiveImage
        alt="Фасад жилого комплекса"
        asset={imageAsset}
        eager
        ratio="16 / 9"
        sizes="100vw"
      />,
    );

    const image = screen.getByRole("img", { name: "Фасад жилого комплекса" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image.parentElement).toHaveStyle({ aspectRatio: "16 / 9" });
    const sources = container.querySelectorAll("source");
    expect(sources).toHaveLength(2);
    expect(sources[0]).toHaveAttribute(
      "srcset",
      "/media/projects/example/cover-480.avif 480w, /media/projects/example/cover-960.avif 960w",
    );
    expect(sources[1]).toHaveAttribute(
      "srcset",
      "/media/projects/example/cover-480.webp 480w, /media/projects/example/cover-960.webp 960w",
    );
  });

  it("replaces a failed image with a neutral labelled fallback", () => {
    const { container } = render(
      <ResponsiveImage alt="Фасад жилого комплекса" asset={imageAsset} />,
    );
    const image = screen.getByRole("img", { name: "Фасад жилого комплекса" });

    fireEvent.error(image);

    expect(image).not.toBeInTheDocument();
    expect(screen.getByLabelText("Изображение недоступно: Фасад жилого комплекса")).toBeVisible();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("keeps reveal content visible for reduced-motion users", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<Reveal><p>Спокойное содержимое</p></Reveal>);

    expect(screen.getByText("Спокойное содержимое").parentElement).toHaveAttribute(
      "data-reveal-state",
      "visible",
    );
  });

  it("labels route loading state and disables a loading button", () => {
    render(
      <>
        <PageSkeleton label="Загружаем каталог" />
        <Button isLoading loadingLabel="Подождите">Отправить</Button>
      </>,
    );

    expect(screen.getByRole("status", { name: "Загружаем каталог" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Подождите" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Подождите" })).toHaveAttribute("aria-busy", "true");
  });
});

const companyPhonePattern = /\+7 \(4852\) 95-55-55/;
