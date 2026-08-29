import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the approved home message", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", {
      level: 1,
      name: "Весь город. Один правильный выбор.",
    })).toBeInTheDocument();
  });
});
