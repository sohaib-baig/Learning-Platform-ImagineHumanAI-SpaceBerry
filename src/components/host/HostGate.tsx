import React from "react";
import { useClub } from "@/context/ClubContext";

interface HostGateProps {
  children: React.ReactElement;
  /**
   * Message shown when the host account is disabled.
   */
  message?: string;
  /**
   * Render children even when the viewer is not the host.
   * Useful for cases where non-hosts see a disabled control.
   */
  showIfNotHost?: boolean;
}

/**
 * HostGate ensures host-only interactions are disabled when the host account
 * is not enabled while providing consistent tooltip messaging.
 */
export function HostGate({
  children,
  message = "Your host account is disabled. Contact support.",
  showIfNotHost = false,
}: HostGateProps) {
  const { isHost, canHostManage } = useClub();

  if (!isHost && !showIfNotHost) {
    return null;
  }

  if (canHostManage) {
    return children;
  }

  const className = [
    children.props.className,
    "cursor-not-allowed opacity-60",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick: React.MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleKeyDown: React.KeyboardEventHandler = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const cloneProps: Record<string, unknown> = {
    className,
    tabIndex: "tabIndex" in children.props ? children.props.tabIndex : -1,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    "aria-disabled": true,
    "data-host-disabled": true,
    title: message,
  };

  if ("disabled" in children.props) {
    cloneProps.disabled = true;
  }

  return (
    <div className="inline-flex w-full" title={message}>
      {React.cloneElement(children, cloneProps)}
      <span className="sr-only">{message}</span>
    </div>
  );
}

