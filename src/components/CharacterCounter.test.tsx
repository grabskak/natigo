import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { CharacterCounter } from "./CharacterCounter";

describe("CharacterCounter component", () => {
  it("should render character count correctly", () => {
    render(<CharacterCounter current={100} max={500} />);
    expect(screen.getByText("100 / 500 characters")).toBeInTheDocument();
  });

  it("should show green color when within valid range", () => {
    render(<CharacterCounter current={250} max={500} min={100} />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveClass("text-green-600");
  });

  it("should show red color when exceeding maximum", () => {
    render(<CharacterCounter current={600} max={500} />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveClass("text-red-600");
  });

  it("should show grey color when below minimum", () => {
    render(<CharacterCounter current={50} max={500} min={100} />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveClass("text-gray-500");
  });

  it("should format numbers with thousand separators", () => {
    render(<CharacterCounter current={1234} max={5000} />);
    expect(screen.getByText("1,234 / 5,000 characters")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<CharacterCounter current={100} max={500} className="custom-class" />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveClass("custom-class");
  });

  it("should have proper aria attributes for accessibility", () => {
    render(<CharacterCounter current={100} max={500} />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveAttribute("aria-live", "polite");
  });

  it("should handle edge case at maximum", () => {
    render(<CharacterCounter current={500} max={500} min={100} />);
    const counter = screen.getByRole("status");
    expect(counter).toHaveClass("text-green-600");
  });
});
