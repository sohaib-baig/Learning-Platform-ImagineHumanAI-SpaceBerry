"use client";

import React, { useState } from "react";
import type { ClubReview } from "@/types/club";

interface ReviewsCarouselProps {
  reviews: ClubReview[];
}

/**
 * ReviewsCarousel Component
 * Displays club reviews in a carousel format
 */
export function ReviewsCarousel({ reviews }: ReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const currentReview = reviews[currentIndex];

  return (
    <div className="bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">What Members Say</h2>

        <div className="relative bg-white rounded-lg shadow-lg p-8">
          {/* Stars */}
          <div className="flex justify-center mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-6 h-6 ${
                  i < currentReview.rating ? "text-yellow-400" : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Review Text */}
          <p className="text-lg text-gray-700 text-center mb-6 italic">
            &ldquo;{currentReview.text}&rdquo;
          </p>

          {/* Author */}
          <p className="text-center font-semibold text-gray-900">
            {currentReview.displayName}
          </p>

          {/* Navigation */}
          {reviews.length > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={handlePrev}
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                aria-label="Previous review"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    aria-label={`Go to review ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                aria-label="Next review"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}

