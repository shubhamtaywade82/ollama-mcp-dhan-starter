import axios from "axios";
import { cfg } from "../util/env.js";

export class DhanClient {
  async funds() {
    if (cfg.MODE === "rails") return this.railsGet("/llm/funds");
    return this.dhanGet("/funds");
  }
  async positions() {
    if (cfg.MODE === "rails") return this.railsGet("/llm/positions");
    return this.dhanGet("/positions");
  }
  async orders() {
    if (cfg.MODE === "rails") return this.railsGet("/llm/orders");
    return this.dhanGet("/orders");
  }
  async spot(underlying: string) {
    if (cfg.MODE === "rails") return this.railsGet("/llm/spot", { underlying });
    return this.dhanGet("/spot", { underlying });
  }
  async quote(securityId: number) {
    if (cfg.MODE === "rails")
      return this.railsGet("/llm/quote", { securityId });
    return this.dhanGet("/quote", { securityId });
  }
  async optionChain(underlying: string, expiry: string) {
    if (cfg.MODE === "rails")
      return this.railsGet("/llm/option_chain", { underlying, expiry });
    return this.dhanGet("/option_chain", { underlying, expiry });
  }
  async placeBracketOrder(params: any) {
    if (cfg.MODE === "rails")
      return this.railsPost("/llm/place_bracket_order", params);
    return this.dhanPost("/orders/bracket", params);
  }
  async modifyOrder(params: any) {
    if (cfg.MODE === "rails")
      return this.railsPost("/llm/modify_order", params);
    return this.dhanPost("/orders/modify", params);
  }
  async cancelOrder(params: any) {
    if (cfg.MODE === "rails")
      return this.railsPost("/llm/cancel_order", params);
    return this.dhanPost("/orders/cancel", params);
  }

  // --- Helpers ---
  private async railsGet(path: string, params?: any) {
    const r = await axios.get(cfg.RAILS_EXECUTOR_URL + path, {
      headers: { "X-API-KEY": cfg.RAILS_API_KEY },
      params,
    });
    return r.data;
  }
  private async railsPost(path: string, body: any) {
    const r = await axios.post(cfg.RAILS_EXECUTOR_URL + path, body, {
      headers: { "X-API-KEY": cfg.RAILS_API_KEY },
    });
    return r.data;
  }
  private async dhanGet(path: string, params?: any) {
    const r = await axios.get(cfg.DHAN_BASE_URL + path, {
      headers: { "access-token": cfg.DHAN_ACCESS_TOKEN },
      params,
    });
    return r.data;
  }
  private async dhanPost(path: string, body: any) {
    const r = await axios.post(cfg.DHAN_BASE_URL + path, body, {
      headers: { "access-token": cfg.DHAN_ACCESS_TOKEN },
    });
    return r.data;
  }
}
