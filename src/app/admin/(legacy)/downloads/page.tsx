"use client";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";

export default function AdminDownloadsPage() {
  return (
    <div>
      <PageHeader
        title="Downloads Management"
        subtitle="Manage downloadable resources"
        action={
          <PrimaryButton onClick={() => alert("Not implemented in MVP")}>
            Upload Resource
          </PrimaryButton>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Global Resources
        </h2>

        <EmptyState
          emoji="📄"
          title="No global resources yet"
          description="Upload files for students to download"
          ctaText="Upload Resource"
          onCtaClick={() => alert("Not implemented in MVP")}
        />
      </Card>

      <div className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Course Resources
          </h2>

          <EmptyState
            emoji="📄"
            title="No course resources yet"
            description="Upload files specific to your courses"
            ctaText="Upload Resource"
            onCtaClick={() => alert("Not implemented in MVP")}
          />
        </Card>
      </div>
    </div>
  );
}
