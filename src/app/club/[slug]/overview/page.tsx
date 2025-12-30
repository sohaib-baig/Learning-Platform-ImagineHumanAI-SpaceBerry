"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ClubProvider, useClub } from "@/context/ClubContext";
import { JoinButton } from "@/components/JoinButton";
import { useAuth } from "@/hooks/useAuth";
import { startClubCheckout } from "@/lib/stripe";
import { toast } from "@/lib/toast";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { ArrowLeft, Check, Star, Users, Telescope } from "lucide-react";
import Link from "next/link";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { doc, getDoc } from "firebase/firestore";
import type { UserDoc } from "@/types/club";

/**
 * Club Overview Content Component
 */
function ClubOverviewContent() {
  const { clubId, clubData, isHost, isMember, loading, error } = useClub();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [paymentCtaLoading, setPaymentCtaLoading] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hostProfile, setHostProfile] = useState<{
    displayName?: string;
    photoURL?: string;
  } | null>(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(false);
  const paymentQuery = searchParams.get("payment");
  const showPaymentBanner = paymentQuery === "required" && !isHost;
  const overviewVideoUrl = clubData?.info.videoUrl?.trim() ?? "";
  const embedVideoUrl = getYouTubeEmbedUrl(overviewVideoUrl);
  const shouldUseVideoTag = Boolean(overviewVideoUrl && !embedVideoUrl);

  // Auto-rotate reviews
  useEffect(() => {
    if (!clubData?.info.reviews || clubData.info.reviews.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) =>
        prev === clubData.info.reviews!.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [clubData?.info.reviews]);

  // Auto-play video when component mounts
  useEffect(() => {
    if (videoRef.current && shouldUseVideoTag) {
      videoRef.current.play().catch((error) => {
        // Auto-play may be blocked by browser, but video will play on user interaction
        console.log("Video autoplay prevented:", error);
      });
    }
  }, [shouldUseVideoTag]);

  useEffect(() => {
    const hostId = clubData?.hostId;
    if (!hostId) {
      setHostProfile(null);
      return;
    }

    let isMounted = true;
    setHostProfile(null);
    setHostProfileLoading(true);

    const fetchHostProfile = async () => {
      try {
        const hostDoc = await getDoc(doc(db, "users", hostId));
        if (!isMounted) return;
        if (hostDoc.exists()) {
          const hostData = hostDoc.data() as UserDoc;
          setHostProfile({
            displayName: hostData.displayName || "Club host",
            photoURL: hostData.photoURL || undefined,
          });
        } else {
          setHostProfile(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[Overview] Failed to load host profile", err);
          setHostProfile(null);
        }
      } finally {
        if (isMounted) {
          setHostProfileLoading(false);
        }
      }
    };

    fetchHostProfile();

    return () => {
      isMounted = false;
    };
  }, [clubData?.hostId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212529]">
        <div className="flex items-center gap-3 text-zinc-300">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading club...
        </div>
      </div>
    );
  }

  if (error || !clubData || !clubId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212529] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Club Not Found</h1>
          <p className="text-zinc-400">
            {error || "The club you&apos;re looking for doesn&apos;t exist."}
          </p>
          <Link
            href="/your-clubs"
            className="inline-flex items-center gap-2 mt-6 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to your clubs
          </Link>
        </div>
      </div>
    );
  }

  const reviews = clubData.info.reviews || [];
  const hasReviews = reviews.length > 0;
  const currentReview = hasReviews ? reviews[currentReviewIndex] : null;
  const hostDisplayName = hostProfile?.displayName || "Club host";
  const hostInitial = (hostProfile?.displayName || "H").charAt(0).toUpperCase();
  const alreadyInClub = isHost || isMember;

  return (
    <div className="min-h-screen bg-[#212529] text-zinc-300 relative overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Payment Banner */}
      {showPaymentBanner && (
        <div className="relative z-50 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-4 md:px-8 md:py-5">
          <div className="max-w-6xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-amber-100">
                This club now requires a paid membership.
              </p>
              <p className="text-sm md:text-base text-amber-200/80 mt-1">
                Support the creator to regain dashboard access and keep your
                progress in sync.
              </p>
            </div>
            <button
              onClick={async () => {
                if (!clubId || !clubData) {
                  return;
                }

                if (!user) {
                  router.push(
                    `/signin?redirect=/club/${clubData.info.slug}/overview`
                  );
                  return;
                }

                setPaymentCtaLoading(true);
                try {
                  await startClubCheckout(clubId);
                } catch (err) {
                  console.error("[Overview] Failed to start checkout", err);
                  toast.error("Unable to open checkout. Please try again.");
                } finally {
                  setPaymentCtaLoading(false);
                }
              }}
              disabled={paymentCtaLoading}
              className="w-full md:w-auto bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {paymentCtaLoading ? "Preparing checkout..." : "Subscribe Now"}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link
            href="/your-clubs"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span>Back to spaces</span>
          </Link>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-6">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                  {clubData.info.name}
                </h1>
                {clubData.info.description && (
                  <p className="text-xl text-zinc-400 leading-relaxed">
                    {clubData.info.description}
                  </p>
                )}
                {(hostProfileLoading || hostProfile) && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-[#11141a]/80 px-3 py-2 shadow-lg shadow-black/30">
                      {hostProfileLoading ? (
                        <>
                          <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
                          <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse" />
                        </>
                      ) : (
                        <>
                          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/[0.08]">
                            {hostProfile?.photoURL ? (
                              <Image
                                src={hostProfile.photoURL}
                                alt={`${hostDisplayName} avatar`}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-sky-500/20 text-sky-100 flex items-center justify-center text-sm font-semibold">
                                {hostInitial}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Hosted by
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {hostDisplayName}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats - Pill UI Elements */}
              <div className="flex items-center gap-3 pt-4 flex-wrap">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#272b2f]/60 border border-white/[0.05] backdrop-blur-sm">
                  <Users size={16} className="text-sky-400" />
                  <span className="text-sm font-medium text-zinc-300">
                    {clubData.membersCount}{" "}
                    {clubData.membersCount === 1 ? "member" : "members"}
                  </span>
                </div>
                {clubData.info.price > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#272b2f]/60 border border-white/[0.05] backdrop-blur-sm">
                    <span className="text-sm font-medium text-zinc-300">
                      {clubData.info.currency} ${clubData.info.price.toFixed(2)}
                      /mo
                    </span>
                  </div>
                )}
                {clubData.info.price === 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                    <span className="text-sm font-semibold text-emerald-400">
                      Free to join
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Banner Video/Image or Gradient */}
            <div className="relative h-80 lg:h-96 rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
              {/* Video takes precedence over image */}
              {embedVideoUrl ? (
                <iframe
                  title={`${clubData.info.name} overview video`}
                  src={embedVideoUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : shouldUseVideoTag ? (
                <video
                  ref={videoRef}
                  src={overviewVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : clubData.info.bannerUrl ? (
                <Image
                  src={clubData.info.bannerUrl}
                  alt={`${clubData.info.name} banner`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600/20 via-sky-500/10 to-zinc-900/20" />
              )}
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#212529]/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-20 space-y-16">
        {/* Vision & Benefits Section - 2 Column Layout */}
        {(clubData.info.vision ||
          (clubData.info.benefits && clubData.info.benefits.length > 0)) && (
          <section className="grid lg:grid-cols-2 gap-6">
            {/* Vision Block */}
            {clubData.info.vision && (
              <div className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl p-8 shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Telescope size={24} className="text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      Our Vision
                    </h2>
                    <p className="text-lg text-zinc-300 leading-relaxed">
                      {clubData.info.vision}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits Block */}
            {clubData.info.benefits && clubData.info.benefits.length > 0 && (
              <div className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl p-8 shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  What You&apos;ll Get
                </h2>
                <div className="space-y-3">
                  {clubData.info.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-[#212529]/40 p-4 hover:border-white/10 hover:bg-[#212529]/60 transition-all group"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors mt-0.5">
                        <Check size={14} className="text-sky-400" />
                      </div>
                      <p className="text-zinc-200 leading-relaxed text-sm">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Pricing & Join Section */}
        <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl p-8 md:p-12 shadow-xl hover:border-white/10 hover:bg-[#272b2f] transition-all">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {alreadyInClub
                  ? "Continue your journey"
                  : clubData.info.price > 0
                    ? "Get started — no commitment"
                    : "Start exploring"}
              </h3>
              {clubData.info.price > 0 && !alreadyInClub && (
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-white">
                      AUD {clubData.info.price.toFixed(2)}
                    </span>
                    <span className="text-xl text-zinc-400">/month</span>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-4">
              <JoinButton
                clubId={clubId}
                clubSlug={clubData.info.slug}
                price={clubData.info.price}
                currency={clubData.info.currency}
                isMember={isMember}
                isHost={isHost}
              />
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        {hasReviews && (
          <section className="rounded-3xl border border-white/[0.08] bg-[#272b2f]/80 backdrop-blur-xl p-8 md:p-12 shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
              What Members Say
            </h2>

            <div className="max-w-3xl mx-auto">
              <div className="relative bg-[#212529]/60 border border-white/[0.05] rounded-2xl p-8 md:p-12 min-h-[280px] flex flex-col justify-center">
                {/* Stars */}
                {currentReview && (
                  <>
                    <div className="flex justify-center mb-6">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={24}
                          className={`${
                            i < currentReview.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-zinc-600"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-xl md:text-2xl text-zinc-200 text-center mb-8 leading-relaxed italic">
                      &ldquo;{currentReview.text}&rdquo;
                    </p>

                    {/* Author */}
                    <p className="text-center font-semibold text-white text-lg">
                      {currentReview.displayName}
                    </p>
                  </>
                )}

                {/* Navigation */}
                {reviews.length > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() =>
                        setCurrentReviewIndex((prev) =>
                          prev === 0 ? reviews.length - 1 : prev - 1
                        )
                      }
                      className="p-2 rounded-xl bg-[#212529] border border-white/[0.05] text-zinc-400 hover:text-white hover:border-white/10 transition-all"
                      aria-label="Previous review"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <div className="flex gap-2">
                      {reviews.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentReviewIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentReviewIndex
                              ? "bg-sky-500 w-8"
                              : "bg-zinc-600 hover:bg-zinc-500"
                          }`}
                          aria-label={`Go to review ${i + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentReviewIndex((prev) =>
                          prev === reviews.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="p-2 rounded-xl bg-[#212529] border border-white/[0.05] text-zinc-400 hover:text-white hover:border-white/10 transition-all"
                      aria-label="Next review"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * Club Overview Page
 */
export default function ClubOverviewPage() {
  const params = useParams();
  const slug = params?.slug as string;

  if (!slug) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212529]">
        <p className="text-zinc-400">Invalid club URL</p>
      </div>
    );
  }

  return (
    <ClubProvider slug={slug}>
      <ClubOverviewContent />
    </ClubProvider>
  );
}
