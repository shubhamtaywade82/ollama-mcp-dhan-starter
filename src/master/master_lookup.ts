import fs from "fs";
import { parse } from "csv-parse/sync";

export type StrikeSelector = {
  mode: "ATM" | "OTM" | "ITM" | "ABSOLUTE" | "DELTA";
  value?: number;
};
export type Row = {
  security_id: number;
  trading_symbol: string;
  exchange_segment: number;
  instrument_type: string;
  underlying_symbol: string;
  expiry: string;
  strike: number;
  option_type: "CE" | "PE";
  lot_size: number;
  tick_size: number;
};

export class MasterLookup {
  private rows: Row[] = [];
  private byKey = new Map<string, Row[]>();

  constructor(csvPath: string) {
    const csv = fs.readFileSync(csvPath, "utf8");
    const recs = parse(csv, { columns: true, skip_empty_lines: true });
    this.rows = recs.map((r: any) => ({
      security_id: Number(r.security_id),
      trading_symbol: r.trading_symbol,
      exchange_segment: Number(r.exchange_segment),
      instrument_type: r.instrument_type,
      underlying_symbol: r.underlying_symbol,
      expiry: r.expiry,
      strike: Number(r.strike),
      option_type: r.option_type,
      lot_size: Number(r.lot_size),
      tick_size: Number(r.tick_size),
    }));
    for (const row of this.rows) {
      const k = this.key(
        row.underlying_symbol,
        row.expiry,
        row.option_type,
        row.strike
      );
      const arr = this.byKey.get(k) || [];
      arr.push(row);
      this.byKey.set(k, arr);
    }
  }

  resolve(params: {
    underlying: "NIFTY" | "BANKNIFTY" | "FINNIFTY";
    expiry_kind: "current_week" | "next_week" | "monthly";
    option_type: "CE" | "PE";
    strike_selector: StrikeSelector;
    spot?: number;
  }): Row {
    const expiry = this.pickExpiry(params.underlying, params.expiry_kind);
    const strike = this.pickStrike(
      params.underlying,
      expiry,
      params.strike_selector,
      params.spot
    );
    const k = this.key(params.underlying, expiry, params.option_type, strike!);
    const candidates = this.byKey.get(k) || [];
    if (!candidates.length)
      throw new Error("No instrument in Master CSV for " + k);
    // TODO: apply liquidity (OI/volume) via external endpoint if needed
    return candidates[0]!;
  }

  private key(u: string, e: string, o: string, s: number) {
    return `${u}|${e}|${o}|${s}`;
  }

  private pickExpiry(
    underlying: string,
    kind: "current_week" | "next_week" | "monthly"
  ): string {
    const exps = Array.from(
      new Set(
        this.rows
          .filter((r) => r.underlying_symbol === underlying)
          .map((r) => r.expiry)
      )
    ).sort();
    const today = new Date().toISOString().slice(0, 10);
    if (kind === "monthly") {
      const monthly = exps.find((d) => d >= today && this.isMonthEnd(d));
      return monthly || exps[exps.length - 1]!;
    }
    const curr = exps.find((d) => d >= today) || exps[0]!;
    if (kind === "current_week") return curr;
    const idx = exps.indexOf(curr);
    return exps[Math.min(idx + 1, exps.length - 1)]!;
  }

  private isMonthEnd(iso: string) {
    const d = new Date(iso + "T00:00:00Z");
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return next.getUTCDate() === 1;
  }

  private pickStrike(
    underlying: string,
    expiry: string,
    sel: StrikeSelector,
    spot?: number
  ) {
    const strikes = Array.from(
      new Set(
        this.rows
          .filter(
            (r) => r.underlying_symbol === underlying && r.expiry === expiry
          )
          .map((r) => r.strike)
      )
    ).sort((a, b) => a - b);
    const step = this.inferStep(strikes);
    const atm = spot
      ? Math.round(spot / step) * step
      : strikes[Math.floor(strikes.length / 2)]!;
    switch (sel.mode) {
      case "ATM":
        return atm;
      case "OTM":
        return atm! + step * Math.round(sel.value ?? 1);
      case "ITM":
        return atm! - step * Math.round(sel.value ?? 1);
      case "ABSOLUTE":
        return Math.round((sel.value ?? atm!) / step) * step;
      case "DELTA":
        return atm; // stub; wire greeks/chain analyzer here
      default:
        return atm;
    }
  }

  private inferStep(strikes: number[]) {
    if (strikes.length < 2) return 50;
    const diffs: number[] = [];
    for (let i = 1; i < strikes.length; i++)
      diffs.push(Math.abs(strikes[i]! - strikes[i - 1]!));
    diffs.sort((a, b) => a - b);
    return diffs[0] || 50;
  }
}
