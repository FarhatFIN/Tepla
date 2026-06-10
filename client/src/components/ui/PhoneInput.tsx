"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  PHONE_REGIONS,
  CONTINENT_LABELS,
  CONTINENT_ORDER,
  defaultRegion,
  digitsOnly,
  maxDigits,
  applyMask,
  type PhoneRegion,
} from "@/lib/countries";

interface PhoneInputProps {
  value: string;
  region: PhoneRegion;
  onChangePhone: (phone: string) => void;
  onChangeRegion: (region: PhoneRegion) => void;
  error?: string;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  region,
  onChangePhone,
  onChangeRegion,
  error,
}: PhoneInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const digits = digitsOnly(value);
  const max = maxDigits(region.mask);
  const formatted = applyMask(digits.slice(0, max), region.mask);

  const handleInput = (raw: string) => {
    const d = digitsOnly(raw);
    onChangePhone(d.slice(0, max));
  };

  const selectRegion = useCallback(
    (r: PhoneRegion) => {
      onChangeRegion(r);
      onChangePhone("");
      setPickerOpen(false);
      setSearch("");
    },
    [onChangeRegion, onChangePhone]
  );

  // Filter regions
  const filtered = search.trim()
    ? PHONE_REGIONS.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.phoneCode.includes(search) ||
          r.code.toLowerCase().includes(search.toLowerCase())
      )
    : PHONE_REGIONS;

  // Group by continent
  const grouped = CONTINENT_ORDER.map((c) => ({
    continent: c,
    label: CONTINENT_LABELS[c],
    regions: filtered.filter((r) => r.continent === c),
  })).filter((g) => g.regions.length > 0);

  const flatFiltered = grouped.flatMap((g) => g.regions);

  // Keyboard nav
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickerOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && focusedIndex >= 0 && flatFiltered[focusedIndex]) {
        selectRegion(flatFiltered[focusedIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, focusedIndex, flatFiltered, selectRegion]);

  // Focus search on open
  useEffect(() => {
    if (pickerOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocusedIndex(-1);
    }
  }, [pickerOpen]);

  return (
    <div className="relative">
      <div className={`flex items-stretch rounded-lg border transition-colors ${error ? "border-[#EF4444]" : "border-[#1E2D3D] focus-within:border-[#3390EC]"}`}>
        {/* Region selector */}
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-1.5 px-3 text-[14px] text-[#6B8CAE] hover:bg-[#152232] transition-colors border-r border-[#1E2D3D] shrink-0"
        >
          <span className="text-[18px] leading-none">{region.flag}</span>
          <span className="text-[#E8EDF2] font-medium">{region.phoneCode}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${pickerOpen ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Phone input */}
        <input
          type="tel"
          value={formatted}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={region.mask.replace(/#/g, "0")}
          className="flex-1 h-[54px] bg-transparent text-[#E8EDF2] placeholder:text-[#4A6480] px-3 text-[16px] outline-none"
          autoComplete="tel"
        />
      </div>

      {error && <p className="mt-1 text-[12px] text-[#EF4444]">{error}</p>}

      {/* Region picker modal */}
      {pickerOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />

          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-[#0E1621] border border-[#1E2D3D] shadow-2xl overflow-hidden max-h-[360px] flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-[#1E2D3D]">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1); }}
                placeholder="Search country or code..."
                className="w-full h-[40px] bg-[#152232] rounded-lg px-3 text-[14px] text-[#E8EDF2] placeholder:text-[#4A6480] outline-none border border-[#1E2D3D] focus:border-[#3390EC]"
              />
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
              {grouped.map((group) => (
                <div key={group.continent}>
                  <div className="sticky top-0 z-10 bg-[#0E1621]/95 backdrop-blur-sm px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#4A6480]">
                    {group.label}
                  </div>
                  {group.regions.map((r) => {
                    const idx = flatFiltered.indexOf(r);
                    const isActive = r.code === region.code;
                    const isFocused = idx === focusedIndex;
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => selectRegion(r)}
                        className={`w-full flex items-center gap-3 px-3 h-[48px] text-left transition-colors ${
                          isActive
                            ? "bg-[#3390EC]/10 border-l-2 border-l-[#3390EC]"
                            : isFocused
                            ? "bg-[#152232]"
                            : "hover:bg-[#152232]"
                        }`}
                      >
                        <span className="text-[20px] leading-none">{r.flag}</span>
                        <span className="flex-1 text-[14px] text-[#E8EDF2] truncate">{r.name}</span>
                        <span className="text-[13px] text-[#4A6480] tabular-nums">{r.phoneCode}</span>
                        {isActive && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3390EC" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {flatFiltered.length === 0 && (
                <p className="px-3 py-6 text-center text-[13px] text-[#4A6480]">No countries found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
