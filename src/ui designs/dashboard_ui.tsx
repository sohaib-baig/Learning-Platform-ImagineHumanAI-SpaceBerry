import React, { useState } from "react";
import {
  ChevronDown,
  User,
  MessageCircle,
  Target,
  Sparkles,
  Brain,
  PartyPopper,
  MoreHorizontal,
  LayoutGrid,
  Map,
  Download,
  Users,
  LogOut,
  Bell,
} from "lucide-react";

const App = () => {
  const [activeTab, setActiveTab] = useState("Community");
  const [postText, setPostText] = useState("");

  const navItems = [
    { name: "Community", icon: <LayoutGrid size={20} /> },
    { name: "Journeys", icon: <Map size={20} /> },
    { name: "Downloads", icon: <Download size={20} /> },
    { name: "Recommended Clubs", icon: <Users size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#212529] text-zinc-300 font-sans selection:bg-sky-500/30 overflow-x-hidden relative flex">
      {/* --- Ambient Background Effects (Subtle Lighting) --- */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />

      {/* --- LEFT SIDEBAR --- */}
      <aside className="w-72 hidden lg:flex flex-col border-r border-white/[0.05] bg-[#272b2f]/60 backdrop-blur-xl sticky top-0 h-screen z-50">
        {/* Logo / Brand Area */}
        <div className="p-6 border-b border-white/[0.05]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/90 text-[#212529] flex items-center justify-center font-bold text-xl shadow-lg shadow-white/5">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[10px] border-b-[#212529] border-r-[6px] border-r-transparent"></div>
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              My little tings
            </h1>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#212529]/50 border border-white/10 text-zinc-400 text-[10px] font-medium tracking-wide">
            3 MEMBERS
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Menu
          </div>

          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden ${
                activeTab === item.name
                  ? "bg-[#212529]/40 text-white border border-white/10"
                  : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {/* Active Indicator Glow */}
              {activeTab === item.name && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-sky-500 rounded-full shadow-[0_0_12px_#38bdf8]" />
              )}

              <span
                className={`transition-colors duration-300 ${activeTab === item.name ? "text-sky-400" : "text-zinc-500 group-hover:text-white"}`}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/[0.05]">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors">
            <LogOut size={20} />
            <span>Leave the space</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 min-w-0 relative z-10">
        {/* Top Header (User Actions) */}
        <div className="sticky top-0 z-40 h-20 flex items-center justify-between px-8 backdrop-blur-sm bg-[#212529]/20">
          {/* Mobile Menu Trigger (Visible only on small screens) */}
          <div className="lg:hidden text-white font-bold">My little tings</div>

          {/* Spacer to push content right on desktop */}
          <div className="flex-1"></div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-6">
            <button className="text-zinc-500 hover:text-white transition-colors relative hover:scale-105 duration-200">
              <Bell size={20} />
              <span className="absolute top-[-2px] right-[-2px] w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></span>
            </button>

            <div className="h-6 w-px bg-white/[0.05]"></div>

            <div className="flex items-center gap-4 pl-2 group cursor-pointer">
              <button className="hidden sm:flex items-center gap-2 text-sm font-medium text-zinc-400 group-hover:text-white transition-colors px-3 py-1.5 rounded-lg group-hover:bg-white/[0.03]">
                <span>My little tings</span>
                <ChevronDown
                  size={14}
                  className="text-zinc-600 group-hover:text-zinc-300"
                />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/5 group-hover:ring-white/20 transition-all border border-white/10">
                K
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 pb-12">
          {/* Page Title Section */}
          <div className="mb-10 animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
              {activeTab}
            </h2>
            <p className="text-zinc-500 text-sm">
              Welcome back to your dashboard.
            </p>
          </div>

          {/* Layout Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* LEFT COLUMN (Feed) */}
            <div className="xl:col-span-2 space-y-6">
              {/* Create Post Card - Updated Frosty Color */}
              <div className="group rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] p-6 shadow-2xl transition-all hover:border-white/10 hover:bg-[#272b2f]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Sparkles size={12} className="text-sky-400" />
                      Create New
                    </h3>
                    <h4 className="text-xl font-semibold text-white">
                      Keep the conversation flowing
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-500 hidden sm:block px-3 py-1 rounded-full bg-[#212529]/60 border border-white/[0.05]">
                    Visible to members
                  </span>
                </div>

                {/* Input Area */}
                <div className="relative mb-4 group-focus-within:scale-[1.01] transition-transform duration-300">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="What would you like to explore together?"
                    className="w-full bg-[#212529]/60 border border-white/[0.05] rounded-2xl p-5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 resize-none min-h-[120px] transition-all shadow-inner"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-zinc-600 font-medium font-mono">
                    {postText.length}/800
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  {/* Intent Tags */}
                  <div className="flex-1">
                    <p className="text-[11px] text-zinc-500 mb-3 font-medium uppercase tracking-wide">
                      Select Intent
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <IntentTag
                        icon={<MessageCircle size={13} />}
                        label="Discuss"
                        active
                      />
                      <IntentTag
                        icon={<Target size={13} className="text-rose-400" />}
                        label="Host Input"
                      />
                      <IntentTag
                        icon={<Sparkles size={13} className="text-amber-400" />}
                        label="Recommendations"
                      />
                      <IntentTag
                        icon={<Brain size={13} className="text-fuchsia-400" />}
                        label="Reflecting"
                      />
                    </div>
                  </div>

                  {/* Post Button */}
                  <button className="px-8 py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all transform active:scale-95 flex items-center justify-center gap-2">
                    Post
                  </button>
                </div>
              </div>

              {/* Feed Item Card - Updated Frosty Color */}
              <div className="rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] p-6 shadow-xl hover:bg-[#272b2f] transition-all hover:border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-[#212529] border border-white/[0.05] flex items-center justify-center shadow-lg">
                      <User size={24} className="text-zinc-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">
                          Club member
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                          <Target size={10} /> Host Input
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">20 hours ago</p>
                    </div>
                  </div>
                  <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                <div className="pl-[60px] pr-4">
                  <p className="text-zinc-300 text-lg mb-6 leading-relaxed font-light">
                    yoooo
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.05] flex justify-between items-center pl-[60px]">
                  <span className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-sky-400 cursor-pointer transition-colors group">
                    <MessageCircle
                      size={14}
                      className="group-hover:scale-110 transition-transform"
                    />
                    View comments
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">
                    0 comments
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (Widgets) */}
            <div className="xl:col-span-1 space-y-6">
              <div className="rounded-3xl bg-[#272b2f]/80 backdrop-blur-xl border border-white/[0.08] p-8 shadow-xl min-h-[240px] flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-white/10 hover:bg-[#272b2f] transition-all">
                {/* Subtle sheen animation */}
                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent transform group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <PartyPopper size={32} className="text-sky-400" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Welcome to
                  <br />
                  My little tings
                </h3>
                <p className="text-sm text-zinc-500 max-w-[200px] leading-relaxed">
                  Your exclusive space to connect, share, and grow together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper Component for the Intent Tags
type IntentTagProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

const IntentTag = ({ icon, label, active = false }: IntentTagProps) => (
  <button
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
      active
        ? "bg-[#272b2f] border-zinc-700 text-zinc-200 shadow-sm"
        : "bg-[#212529]/40 border-white/[0.05] text-zinc-500 hover:bg-white/[0.05] hover:border-white/10 hover:text-zinc-300"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default App;
