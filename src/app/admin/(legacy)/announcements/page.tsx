"use client";

import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { analytics } from "@/lib/analytics";
import { onAuthChange } from "@/lib/auth-client";
import { ClientGuard } from "@/components/ClientGuard";

type TodayRead = {
  title: string;
  snippetHTML: string;
  sourceUrl: string;
};

type NoticeBoard = {
  contentHTML: string;
};

const defaultTodayRead: TodayRead = {
  title: "",
  snippetHTML: "",
  sourceUrl: "",
};

const defaultNoticeBoard: NoticeBoard = {
  contentHTML: "",
};

function normalizeTodayRead(data: Partial<TodayRead> | undefined): TodayRead {
  return {
    title: data?.title ?? "",
    snippetHTML: data?.snippetHTML ?? "",
    sourceUrl: data?.sourceUrl ?? "",
  };
}

function normalizeNoticeBoard(
  data: Partial<NoticeBoard> | undefined
): NoticeBoard {
  return {
    contentHTML: data?.contentHTML ?? "",
  };
}

export default function AdminAnnouncementsPage() {
  const [todayRead, setTodayRead] = useState<TodayRead>(defaultTodayRead);
  const [noticeBoard, setNoticeBoard] = useState<NoticeBoard>(
    defaultNoticeBoard
  );
  const [savingToday, setSavingToday] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
    });

    const loadTodayRead = async () => {
      try {
        const docRef = doc(db, "articles", "today");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTodayRead(normalizeTodayRead(docSnap.data() as Partial<TodayRead>));
        } else {
          setTodayRead(defaultTodayRead);
        }
      } catch (err) {
        console.error("Error loading today's read:", err);
      }
    };

    const loadNoticeBoard = async () => {
      try {
        const docRef = doc(db, "announcements", "notice");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setNoticeBoard(
            normalizeNoticeBoard(docSnap.data() as Partial<NoticeBoard>)
          );
        } else {
          setNoticeBoard(defaultNoticeBoard);
        }
      } catch (err) {
        console.error("Error loading notice board:", err);
      }
    };

    void loadTodayRead();
    void loadNoticeBoard();

    return () => unsubscribe();
  }, []);

  const handleSaveTodayRead = async () => {
    if (!user) return;

    try {
      setSavingToday(true);
      setError(null);

      if (!todayRead.title.trim()) {
        setError("Title is required for Today&apos;s AI Read");
        setSavingToday(false);
        return;
      }

      const docRef = doc(db, "articles", "today");
      await updateDoc(docRef, {
        ...todayRead,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      analytics.track("admin_update_today_read");

      alert("Today&apos;s AI Read updated successfully");
    } catch (err) {
      console.error("Error saving today&apos;s read:", err);
      setError("Failed to save Today&apos;s AI Read");
    } finally {
      setSavingToday(false);
    }
  };

  const handleSaveNoticeBoard = async () => {
    if (!user) return;

    try {
      setSavingNotice(true);
      setError(null);

      const docRef = doc(db, "announcements", "notice");
      await updateDoc(docRef, {
        contentHTML: noticeBoard.contentHTML,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      analytics.track("admin_update_notice");

      alert("Notice Board updated successfully");
    } catch (err) {
      console.error("Error saving notice board:", err);
      setError("Failed to save Notice Board");
    } finally {
      setSavingNotice(false);
    }
  };

  return (
    <ClientGuard>
      <div>
        <PageHeader
          title="Announcements"
          subtitle="Manage Today&apos;s AI Read & Notice Board"
        />

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Today&apos;s AI Read
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="todayTitle"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="todayTitle"
                  type="text"
                  value={todayRead.title}
                  onChange={(event) =>
                    setTodayRead({ ...todayRead, title: event.target.value })
                  }
                  className="w-full"
                  placeholder="Article Title"
                />
              </div>

              <div>
                <label
                  htmlFor="todaySnippet"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Snippet HTML
                </label>
                <textarea
                  id="todaySnippet"
                  value={todayRead.snippetHTML}
                  onChange={(event) =>
                    setTodayRead({
                      ...todayRead,
                      snippetHTML: event.target.value,
                    })
                  }
                  className="w-full h-32 p-3"
                  placeholder="<p>HTML content goes here...</p>"
                />
              </div>

              <div>
                <label
                  htmlFor="todaySource"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Source URL (Optional)
                </label>
                <input
                  id="todaySource"
                  type="text"
                  value={todayRead.sourceUrl}
                  onChange={(event) =>
                    setTodayRead({
                      ...todayRead,
                      sourceUrl: event.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="https://example.com/article"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <PrimaryButton onClick={handleSaveTodayRead} disabled={savingToday}>
                {savingToday ? "Saving..." : "Save Changes"}
              </PrimaryButton>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Notice Board
            </h2>

            <div>
              <label
                htmlFor="noticeContent"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Content HTML
              </label>
              <textarea
                id="noticeContent"
                value={noticeBoard.contentHTML}
                onChange={(event) =>
                  setNoticeBoard({
                    ...noticeBoard,
                    contentHTML: event.target.value,
                  })
                }
                className="w-full h-48 p-3"
                placeholder="<div>HTML content goes here...</div>"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <PrimaryButton
                onClick={handleSaveNoticeBoard}
                disabled={savingNotice}
              >
                {savingNotice ? "Saving..." : "Save Changes"}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </ClientGuard>
  );
}
