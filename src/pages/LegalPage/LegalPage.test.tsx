import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { appRoutes } from "../../app/routes";

afterEach(cleanup);

const warning = "Материал перенесён из действующего сайта и требует подтверждения оператора перед публикацией.";

describe.each([
  {
    path: "/privacy",
    title: "Политика в отношении обработки персональных данных",
    sourceUrl: "https://офиспродаж76.рф/policy/",
    sourceText: /Настоящая Политика конфиденциальности персональных данных/,
  },
  {
    path: "/consent",
    title: "Согласие на обработку персональных данных",
    sourceUrl: "https://офиспродаж76.рф/agreement/",
    sourceText: /В соответствии с Федеральным законом «О персональных данных»/,
  },
])("LegalPage $path", ({ path, sourceText, sourceUrl, title }) => {
  it("renders reviewed source material as readable text without a submission form", async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: [path] })} />);

    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(within(main).getByText(warning)).toBeVisible();
    expect(within(main).getByText(sourceText)).toBeVisible();
    expect(within(main).getByText(/юридической проверки/i)).toBeVisible();
    expect(within(main).getByRole("link", { name: "Открыть исходный документ" })).toHaveAttribute("href", sourceUrl);
    expect(within(main).queryByRole("form")).not.toBeInTheDocument();
    expect(within(main).queryByRole("textbox")).not.toBeInTheDocument();
  });
});
