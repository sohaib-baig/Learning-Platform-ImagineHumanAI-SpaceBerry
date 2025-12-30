"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { ClubProvider, useClub } from "@/context/ClubContext";
import { HostGate } from "@/components/host/HostGate";
import type { Club } from "@/types/club";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import { toast } from "@/lib/toast";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FormState {
  name: string;
  description: string;
  mission: string;
  vision: string;
  videoUrl: string;
  profileImageUrl: string;
  price: string;
  currency: string;
  benefits: string[];
  recommendedClubs: string[];
}

const supportedCurrencies = ["AUD"];
const PRICE_LOCK_MESSAGE =
  "Once a club has a price, it cannot be reverted to free.";
const NEGATIVE_PRICE_MESSAGE = "Price cannot be negative.";
const PRICE_LOCK_TOAST_MESSAGE =
  "Paid clubs cannot revert to free. Please adjust pricing instead.";

function formatPriceInput(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  const centsRounded = Math.round(value * 100) / 100;
  return centsRounded.toFixed(2);
}

function createInitialFormState(clubData?: Club | null): FormState {
  return {
    name: clubData?.info.name ?? "",
    description: clubData?.info.description ?? "",
    mission: clubData?.info.mission ?? "",
    vision: clubData?.info.vision ?? "",
    videoUrl: clubData?.info.videoUrl?.trim() ?? "",
    profileImageUrl: clubData?.info.profileImageUrl ?? "",
    price: formatPriceInput(clubData?.info.price ?? 0),
    currency: clubData?.info.currency ?? "AUD",
    benefits: [...(clubData?.info.benefits ?? [])],
    recommendedClubs: [...(clubData?.info.recommendedClubs ?? [])],
  };
}

function arraysEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
}

function ClubEditorContent() {
  const router = useRouter();
  const { clubId, clubData, isHost, hostEnabled, loading, error, refetch } =
    useClub();

  const baseline = useMemo(() => createInitialFormState(clubData), [clubData]);
  const [formState, setFormState] = useState<FormState>(baseline);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [newBenefit, setNewBenefit] = useState("");
  const [benefitError, setBenefitError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasPaidPrice = (clubData?.info.price ?? 0) > 0;
  const parsedPriceValue = Number.parseFloat(
    formState.price === "" ? "0" : formState.price
  );
  const priceInputInvalid =
    formState.price !== "" && Number.isNaN(parsedPriceValue);
  const priceValue = Number.isNaN(parsedPriceValue) ? 0 : parsedPriceValue;
  const negativePriceAttempt = priceValue < 0;
  const paidRevertAttempt = hasPaidPrice && priceValue <= 0;
  const priceValidationMessage = negativePriceAttempt
    ? NEGATIVE_PRICE_MESSAGE
    : paidRevertAttempt
      ? PRICE_LOCK_MESSAGE
      : null;
  const trimmedVideoUrl = formState.videoUrl.trim();
  const invalidVideoUrl =
    trimmedVideoUrl.length > 0 && !isValidYouTubeUrl(trimmedVideoUrl);
  const unsavedChangesMessage =
    "You have unsaved changes. Leave this page without saving?";

  useEffect(() => {
    setFormState(baseline);
  }, [baseline]);

  useEffect(() => {
    if (!formSuccess) {
      return;
    }
    const timeout = setTimeout(() => setFormSuccess(null), 4000);
    return () => {
      clearTimeout(timeout);
    };
  }, [formSuccess]);

  const isDirty = useMemo(() => {
    return (
      formState.name !== baseline.name ||
      formState.description !== baseline.description ||
      formState.mission !== baseline.mission ||
      formState.vision !== baseline.vision ||
      formState.videoUrl !== baseline.videoUrl ||
      formState.profileImageUrl !== baseline.profileImageUrl ||
      formState.price !== baseline.price ||
      formState.currency !== baseline.currency ||
      !arraysEqual(formState.benefits, baseline.benefits) ||
      !arraysEqual(formState.recommendedClubs, baseline.recommendedClubs)
    );
  }, [formState, baseline]);

  useEffect(() => {
    const handleInternalLinkClick = (event: MouseEvent) => {
      if (!isDirty || showUnsavedDialog) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (
        url.href === window.location.href ||
        url.origin !== window.location.origin
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const relativeHref = `${url.pathname}${url.search}${url.hash}`;
      setPendingNavigation(relativeHref);
      setShowUnsavedDialog(true);
    };

    window.addEventListener("click", handleInternalLinkClick, true);
    return () => {
      window.removeEventListener("click", handleInternalLinkClick, true);
    };
  }, [isDirty, showUnsavedDialog]);

  const handleConfirmNavigation = () => {
    const destination = pendingNavigation;
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
    if (destination) {
      router.push(destination);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = unsavedChangesMessage;
      return unsavedChangesMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, unsavedChangesMessage]);

  const disableSaveButton =
    saving ||
    !isDirty ||
    priceInputInvalid ||
    negativePriceAttempt ||
    paidRevertAttempt ||
    invalidVideoUrl;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#212529]">
        <div className="flex items-center gap-3 text-zinc-300">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading club editor…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-[#212529]">
        <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl px-6 py-5 text-sm text-red-300 shadow-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!clubId || !clubData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-[#212529]">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl px-6 py-5 text-sm text-zinc-300 shadow-xl">
          We couldn&apos;t load that club. Please return to the dashboard.
        </div>
      </div>
    );
  }

  if (!isHost) {
    router.replace(`/club/${clubData.info.slug}/dashboard`);
    return null;
  }

  const handleAddBenefit = () => {
    setBenefitError(null);
    const trimmed = newBenefit.trim();

    if (!trimmed) {
      setBenefitError("Add some text before adding a benefit.");
      return;
    }

    if (formState.benefits.length >= 10) {
      setBenefitError("You can highlight up to ten benefits.");
      return;
    }

    if (
      formState.benefits.some(
        (benefit) => benefit.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setBenefitError("That benefit is already listed.");
      return;
    }

    setFormState((prev) => ({
      ...prev,
      benefits: [...prev.benefits, trimmed],
    }));
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, idx) => idx !== index),
    }));
  };

  const handleBenefitChange = (index: number, value: string) => {
    setFormState((prev) => {
      const nextBenefits = [...prev.benefits];
      nextBenefits[index] = value;
      return {
        ...prev,
        benefits: nextBenefits,
      };
    });
  };

  const handleReset = () => {
    setFormState(baseline);
    setFormError(null);
    setFormSuccess(null);
    setNewBenefit("");
    setBenefitError(null);
    setImageError(null);
  };

  const handlePriceChange: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    const rawValue = event.target.value;

    if (rawValue === "") {
      setFormState((prev) => ({
        ...prev,
        price: rawValue,
      }));
      return;
    }

    const numericValue = Number.parseFloat(rawValue);

    if (Number.isNaN(numericValue)) {
      return;
    }

    if (numericValue < 0) {
      setFormState((prev) => ({
        ...prev,
        price: "",
      }));
      return;
    }

    if (hasPaidPrice && numericValue <= 0) {
      setFormState((prev) => ({
        ...prev,
        price: "",
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      price: rawValue,
    }));
  };

  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    setImageError(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5MB or smaller.");
      return;
    }

    if (!clubId) {
      setImageError("Club ID missing. Please reload and try again.");
      return;
    }

    try {
      setUploadingImage(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("You must be signed in to upload an image.");
      }

      const idToken = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/clubs/${clubId}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error ?? "We couldn't upload that image. Please try again.";
        throw new Error(message);
      }

      const data = (await response.json()) as { url: string };

      setFormState((prev) => ({
        ...prev,
        profileImageUrl: data.url,
      }));
      setFormSuccess("Club image uploaded.");
      await refetch();
    } catch (err) {
      console.error("Failed to upload club image:", err);
      setImageError(
        err instanceof Error
          ? err.message
          : "We couldn't upload that image. Please try again."
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Give your club a name before saving.");
      return;
    }

    const currency = formState.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      setFormError("Currency must be a three-letter ISO code (e.g. AUD).");
      return;
    }

    const priceValue = Number.parseFloat(formState.price || "0");
    if (Number.isNaN(priceValue)) {
      setFormError("Price must be a valid number.");
      return;
    }

    if (priceValue < 0) {
      setFormError(NEGATIVE_PRICE_MESSAGE);
      toast.error(NEGATIVE_PRICE_MESSAGE);
      return;
    }

    if (hasPaidPrice && priceValue <= 0) {
      setFormError(PRICE_LOCK_MESSAGE);
      toast.error(PRICE_LOCK_TOAST_MESSAGE);
      return;
    }

    const videoUrl = formState.videoUrl.trim();
    if (videoUrl && !isValidYouTubeUrl(videoUrl)) {
      const message =
        "Please enter a valid YouTube URL for the overview video.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const cleanedBenefits = Array.from(
      new Set(
        formState.benefits
          .map((benefit) => benefit.trim())
          .filter((benefit) => benefit.length > 0)
      )
    ).slice(0, 10);

    const payload = {
      name: trimmedName,
      description: formState.description.trim(),
      mission: formState.mission.trim(),
      vision: formState.vision.trim(),
      benefits: cleanedBenefits,
      price: Math.round(priceValue * 100) / 100,
      currency,
      recommendedClubs: formState.recommendedClubs,
      profileImageUrl: formState.profileImageUrl.trim() || undefined,
      videoUrl,
    };

    try {
      setSaving(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("You must be signed in to update this club.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/clubs/${clubId}/info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error ?? "We couldn’t save your changes. Please try again.";
        if (response.status === 400) {
          if (message === PRICE_LOCK_MESSAGE) {
            toast.error(PRICE_LOCK_TOAST_MESSAGE);
          } else if (message === NEGATIVE_PRICE_MESSAGE) {
            toast.error(NEGATIVE_PRICE_MESSAGE);
          }
        }
        throw new Error(message);
      }

      const data = (await response.json()) as { club: Club };
      const nextBaseline = createInitialFormState(data.club);

      setFormState(nextBaseline);
      setFormSuccess("Club details saved.");
      setLastSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      await refetch();
    } catch (err) {
      console.error("Failed to save club info:", err);
      const fallbackMessage =
        err instanceof Error
          ? err.message
          : "We couldn’t save your changes. Please try again.";
      setFormError(fallbackMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212529] text-zinc-300 py-12 relative overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-8 relative z-10">
        <div className="space-y-3 mb-10 animate-fade-in">
          <BackToHomeButton
            clubSlug={clubData.info.slug}
            className="text-zinc-400 hover:text-white transition-colors"
          />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Club Editor
          </p>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            {clubData.info.name}
          </h1>
          <p className="text-sm text-zinc-400">
            Shape how members experience your club. Changes go live as soon as
            you save.
          </p>
          {lastSavedAt && (
            <p className="text-xs text-zinc-500 font-mono">
              Last saved at {lastSavedAt}
            </p>
          )}
          {!hostEnabled && (
            <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-xl px-4 py-3 text-sm text-amber-200 shadow-xl">
              Your host account is currently disabled. Updates are read-only
              until it is re-enabled.
            </div>
          )}
        </div>

        {formError && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl px-6 py-4 text-sm text-red-300 shadow-xl">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl px-6 py-4 text-sm text-emerald-300 shadow-xl">
            {formSuccess}
          </div>
        )}

        <HostGate>
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
              <div className="border-b border-white/[0.05] px-6 py-5">
                <h2 className="text-lg font-semibold text-white">
                  Identity & Story
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Update the headline, story, and purpose members see before
                  joining.
                </p>
              </div>
              <div className="space-y-6 px-6 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="h-28 w-28 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1f24]/80 flex items-center justify-center">
                    {formState.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formState.profileImageUrl}
                        alt={`${clubData.info.name} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-zinc-500 text-center px-2">
                        No image yet
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-zinc-400">
                      Upload a square image for your club profile. Max 5MB.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || !hostEnabled}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? "Uploading…" : "Upload image"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {formState.profileImageUrl && (
                        <a
                          href={formState.profileImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-sky-400 hover:text-sky-300"
                        >
                          View current image
                        </a>
                      )}
                    </div>
                    {imageError && (
                      <p className="text-xs font-medium text-red-400">
                        {imageError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="club-name"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Club name
                  </label>
                  <input
                    id="club-name"
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                    placeholder="Give your club a clear, memorable name"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="club-description"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Description
                  </label>
                  <textarea
                    id="club-description"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={15}
                    className="w-full min-h-[100px] rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner resize-none"
                    placeholder="A short summary that helps curious visitors understand what makes this club unique."
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="club-vision"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Vision
                  </label>
                  <textarea
                    id="club-vision"
                    value={formState.vision}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        vision: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full min-h-[100px] rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner resize-none"
                    placeholder="Paint the picture of what members can become through this club."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
              <div className="border-b border-white/[0.05] px-6 py-5">
                <h2 className="text-lg font-semibold text-white">
                  Club overview settings
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Control the hero video members see on the public overview
                  page.
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-200">
                      Preview overview
                    </p>
                    <p className="text-xs text-zinc-500">
                      Opens the public overview in a new tab.
                    </p>
                  </div>
                  <a
                    href={`/club/${clubData.info.slug}/overview`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#212529]/60 px-4 py-2 text-sm font-semibold text-white hover:border-white/15 hover:bg-white/[0.05] transition-all"
                  >
                    Preview
                  </a>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="club-video-url"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    YouTube video URL
                  </label>
                  <input
                    id="club-video-url"
                    type="url"
                    value={formState.videoUrl}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        videoUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                    placeholder="https://www.youtube.com/watch?v=abcdefghijk"
                  />
                  <p className="text-xs text-zinc-500">
                    Paste an unlisted or public YouTube link. Leave blank to
                    hide the video.
                  </p>
                  {invalidVideoUrl && (
                    <p className="text-xs font-medium text-red-400">
                      Please enter a valid YouTube URL.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
              <div className="border-b border-white/[0.05] px-6 py-5">
                <h2 className="text-lg font-semibold text-white">Benefits</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Highlight up to ten outcomes members can expect.
                </p>
              </div>
              <div className="space-y-5 px-6 py-6">
                {formState.benefits.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No benefits yet. Add your first one below.
                  </p>
                )}
                <div className="space-y-3">
                  {formState.benefits.map((benefit, index) => (
                    <div
                      key={`benefit-${index}`}
                      className="flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-[#212529]/40 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Benefit {index + 1}
                      </span>
                      <input
                        type="text"
                        value={benefit}
                        onChange={(event) =>
                          handleBenefitChange(index, event.target.value)
                        }
                        className="flex-1 rounded-xl border border-white/[0.05] bg-[#212529]/60 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(index)}
                        className="inline-flex items-center justify-center rounded-xl border border-white/[0.05] bg-[#212529]/60 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:border-white/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#212529]/40 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={newBenefit}
                      onChange={(event) => setNewBenefit(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddBenefit();
                        }
                      }}
                      className="flex-1 rounded-xl border border-white/[0.05] bg-[#212529]/60 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                      placeholder="Add a new benefit"
                      maxLength={160}
                    />
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={formState.benefits.length >= 10}
                    >
                      Add benefit
                    </button>
                  </div>
                  {benefitError && (
                    <p className="mt-2 text-xs font-medium text-red-400">
                      {benefitError}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
              <div className="border-b border-white/[0.05] px-6 py-5">
                <h2 className="text-lg font-semibold text-white">Pricing</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Set the monthly price members pay for access.
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <label
                      htmlFor="club-price"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      Membership price
                    </label>
                    <input
                      id="club-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formState.price}
                      onChange={handlePriceChange}
                      className="w-full rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="club-currency"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      Currency
                    </label>
                    <input
                      id="club-currency"
                      type="text"
                      value={formState.currency}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          currency: event.target.value.toUpperCase(),
                        }))
                      }
                      maxLength={3}
                      className="w-28 rounded-xl border border-white/[0.05] bg-[#212529]/60 px-3 py-2 text-sm uppercase text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all shadow-inner"
                      list="currency-options"
                    />
                    <datalist id="currency-options">
                      {supportedCurrencies.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">
                    {hasPaidPrice
                      ? "Once your set a Membership price, it cannot revert back to free."
                      : "Tip: setting the price above 0 makes the club paid. Switching back to free isn&apos;t allowed later."}
                  </p>
                  {priceValidationMessage && (
                    <p className="text-xs font-medium text-red-400">
                      {priceValidationMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3 rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl px-6 py-4 shadow-xl">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || !isDirty}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.05] bg-[#212529]/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.05] hover:border-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={disableSaveButton}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : isDirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </form>
        </HostGate>
      </div>
      <ConfirmDialog
        open={showUnsavedDialog}
        title="Leave without saving?"
        message={unsavedChangesMessage}
        confirmLabel="Discard changes"
        cancelLabel="Stay on page"
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
}

export default function ClubEditorPage() {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-[#212529]">
        <div className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl px-6 py-5 text-sm text-zinc-300 shadow-xl">
          Invalid club URL.
        </div>
      </div>
    );
  }

  return (
    <ClubProvider slug={slug}>
      <ClubEditorContent />
    </ClubProvider>
  );
}
