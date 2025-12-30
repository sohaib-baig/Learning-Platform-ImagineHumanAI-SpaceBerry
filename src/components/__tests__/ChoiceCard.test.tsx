import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceCard } from "../onboarding/ChoiceCard";

describe("ChoiceCard", () => {
  const baseProps = {
    title: "Create a space",
    subtitle: "Host your own club.",
    ctaLabel: "Continue",
    onSelect: vi.fn(),
  };

  it("renders the title, subtitle, and CTA", () => {
    render(<ChoiceCard {...baseProps} />);

    expect(screen.getByText("Create a space")).toBeInTheDocument();
    expect(screen.getByText("Host your own club.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" })
    ).toBeInTheDocument();
  });

  it("fires onSelect when CTA is clicked", () => {
    const handleSelect = vi.fn();
    render(<ChoiceCard {...baseProps} onSelect={handleSelect} />);

    const button = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(button);

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("disables CTA when loading", () => {
    render(<ChoiceCard {...baseProps} loading />);

    const button = screen.getByRole("button", { name: "Setting things up..." });
    expect(button).toBeDisabled();
  });
});
