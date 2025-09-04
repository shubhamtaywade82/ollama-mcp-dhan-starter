import EventEmitter from "events";
import WebSocket from "ws";
import { cfg } from "../util/env.js";
import { DhanClient } from "./client.js";

/** Emits 'tick' events: { securityId:number, ltp:number, ts:number } */
export class LtpFeed extends EventEmitter {
  private ws?: WebSocket | undefined;
  private pollTimer?: NodeJS.Timeout | undefined;
  private client = new DhanClient();

  subscribe(securityId: number) {
    if (cfg.DHAN_WS_URL) {
      this.startWs(securityId);
    } else {
      this.startPolling(securityId);
    }
  }
  unsubscribe() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private startWs(securityId: number) {
    this.ws = new WebSocket(cfg.DHAN_WS_URL!);
    this.ws.on("open", () => {
      // TODO: send auth/subscription frame for securityId according to Dhan docs
      // this.ws.send(JSON.stringify({ action:'subscribe', securityId }));
    });
    this.ws.on("message", (buf: any) => {
      try {
        const m = JSON.parse(buf.toString());
        // TODO: map to real packet fields
        if (m.securityId === securityId && m.ltp) {
          this.emit("tick", { securityId, ltp: m.ltp, ts: Date.now() });
        }
      } catch {}
    });
    this.ws.on("close", () => {});
  }

  private startPolling(securityId: number) {
    const tick = async () => {
      try {
        const q = await this.client.quote(securityId);
        const ltp = q.ltp ?? q.last_price ?? q.price;
        if (ltp != null)
          this.emit("tick", { securityId, ltp: Number(ltp), ts: Date.now() });
      } catch {}
    };
    tick();
    this.pollTimer = setInterval(tick, 1000);
  }
}
