"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  joinWaitlist,
  type WaitlistFormState,
} from "@/app/platform/waitlist/actions";

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: WaitlistFormState = {};
  const [state, formAction] = useFormState<WaitlistFormState, FormData>(
    joinWaitlist,
    initialState
  );

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  const nameErrors = state?.errors?.name;
  const emailErrors = state?.errors?.email;
  const formErrors = state?.errors?.form;
  const hasErrors =
    Boolean(nameErrors?.length) ||
    Boolean(emailErrors?.length) ||
    Boolean(formErrors?.length);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 rounded-[28px] border border-white/70 bg-white/90 p-8 shadow-[0_45px_140px_-110px_rgba(20,20,40,0.55)] backdrop-blur"
    >
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#2a2257]/70">
          Join The Waitlist
        </p>
        <h2 className="text-2xl font-semibold text-[#2a2257]">
          Share your details and we&apos;ll keep you in the loop
        </h2>
        <p className="text-sm text-slate-600">
          We&apos;ll send gentle updates about the ImagineHumans platform and
          early invitations once spaces open.
        </p>
      </header>

      {state?.success ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          Thank you! You&apos;re on the waitlist. We&apos;ll reach out as soon as
          new spaces open.
        </div>
      ) : null}

      {hasErrors ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-[#ff5f59]/30 bg-[#ffefef]/80 px-4 py-3 text-sm text-[#a32320]"
        >
          {formErrors?.[0] ??
            "Please double check the highlighted fields and try again."}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="waitlist-name"
          className="text-sm font-semibold uppercase tracking-[0.3em] text-[#2a2257]/70"
        >
          Name
        </label>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          aria-invalid={nameErrors ? true : undefined}
          aria-describedby={nameErrors ? "waitlist-name-error" : undefined}
          placeholder="How should we address you?"
          className="w-full rounded-2xl border border-[#2a2257]/10 bg-white px-4 py-3 text-sm text-[#2a2257] shadow-inner focus:border-[#59b8f5] focus:outline-none focus:ring-2 focus:ring-[#59b8f5]/40"
        />
        {nameErrors?.length ? (
          <p
            id="waitlist-name-error"
            className="text-sm font-medium text-[#ff5f59]"
          >
            {nameErrors[0]}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            We love keeping things personal. A name is the perfect start.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="waitlist-email"
          className="text-sm font-semibold uppercase tracking-[0.3em] text-[#2a2257]/70"
        >
          Email
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          aria-invalid={emailErrors ? true : undefined}
          aria-describedby={emailErrors ? "waitlist-email-error" : undefined}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-[#2a2257]/10 bg-white px-4 py-3 text-sm text-[#2a2257] shadow-inner focus:border-[#59b8f5] focus:outline-none focus:ring-2 focus:ring-[#59b8f5]/40"
        />
        {emailErrors?.length ? (
          <p
            id="waitlist-email-error"
            className="text-sm font-medium text-[#ff5f59]"
          >
            {emailErrors[0]}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            We&apos;ll only send calm, intentional updates—no noise.
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a2257] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-[#2a2257]/30 transition hover:bg-[#211a43] disabled:cursor-not-allowed disabled:bg-[#2a2257]/70 disabled:shadow-none"
    >
      {pending ? "Adding you..." : "Join The Waitlist"}
    </button>
  );
}

