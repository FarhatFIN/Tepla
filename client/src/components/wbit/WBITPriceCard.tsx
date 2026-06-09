"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface PriceData {
  price: string;
  change24h: string;
  volume24h: string;
  currency: string;
}

export default function WBITPriceCard() {
  const t = useTranslation();
  const [price, setPrice] = useState<PriceData | null>(null);

  const loadPrice = useCallback(async () => {
    try {
      const res = await api.get<{ data: PriceData }>("/wbit/price");
      setPrice(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadPrice, 0);
    const interval = window.setInterval(loadPrice, 60000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadPrice]);

  if (!price) return null;

  const isPositive = price.change24h.startsWith("+");

  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--bg-card)] px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-500">
          <span className="text-xs font-black text-white">W</span>
        </div>
        <div>
          <p className="text-sm font-medium">WBIT</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">{t("wbit_price")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">${price.price}</p>
        <p className={`text-[10px] font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {price.change24h}
        </p>
      </div>
    </div>
  );
}
