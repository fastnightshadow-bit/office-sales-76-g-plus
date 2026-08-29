import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the approved public brand", () => {
    render(<App />);
    expect(screen.getByText("Офис продаж 76")).toBeInTheDocument();
  });
});
