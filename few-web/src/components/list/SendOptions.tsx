"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { amazonCartItems, sendText, type SendLine } from "@/lib/grocery/lines";

export function SendOptions({
  lines,
  amazonTag,
  walmartEnabled,
  instacartEnabled,
  instacartUrl,
}: {
  lines: SendLine[];
  amazonTag: string;
  walmartEnabled: boolean;
  instacartEnabled: boolean;
  instacartUrl: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const text = lines.length > 0 ? sendText(lines) : "Your shopping list is empty.";
  const amazon = amazonCartItems(lines);
  const tag = amazonTag.trim();

  async function copyList() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied. Paste it into Notes, a text, or an email.");
    } catch {
      setStatus("Copy did not work in this browser. Select the list below and copy it yourself.");
    }
  }

  async function shareList() {
    if (!navigator.share) {
      setStatus("This browser cannot open the share sheet. Copy the list instead.");
      return;
    }
    try {
      await navigator.share({ title: "Families Eat Well shopping list", text });
      setStatus("Share sheet opened.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("The share sheet did not open. Copy the list instead.");
    }
  }

  return (
    <section className="sticky top-0 z-20 rounded-[20px] border-2 border-rose bg-white p-4 shadow-sm">
      <h2 className="font-display text-2xl font-bold">Send to a store</h2>
      <p className="mt-1 text-base">{lines.length === 1 ? "1 item ready" : `${lines.length} items ready`}. You pay on the store site.</p>
      <div className="no-print mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-blush p-4">
          <h3 className="font-display text-xl font-bold">Amazon cart</h3>
          {!tag ? (
            <p className="mt-2 text-base">Add NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG before sending items to Amazon.</p>
          ) : amazon.items.length === 0 ? (
            <p className="mt-2 text-base">
              None of the items to send have an ASIN yet. Add real product codes in src/data/asins.ts. The recipe amount is not used as the Amazon quantity.
            </p>
          ) : (
            <form className="mt-3" method="GET" action="https://www.amazon.com/gp/aws/cart/add.html" target="_blank">
              <input type="hidden" name="AssociateTag" value={tag} />
              {amazon.items.map((item, index) => (
                <span key={item.asin}>
                  <input type="hidden" name={`ASIN.${index + 1}`} value={item.asin} />
                  <input type="hidden" name={`Quantity.${index + 1}`} value={item.quantity} />
                </span>
              ))}
              <Button type="submit">Add mapped items to your Amazon cart</Button>
              <p className="mt-2 text-base">Amazon quantity comes from the ASIN table, not from cups or ounces. You pay on Amazon.</p>
            </form>
          )}
          {tag && amazon.items.length > 0 && amazon.missing.length > 0 ? (
            <p className="mt-2 text-base">Not sent to Amazon, because there is no ASIN: {amazon.missing.join("; ")}.</p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-blush p-4">
          <h3 className="font-display text-xl font-bold">Walmart cart</h3>
          <p className="mt-2 text-base">
            {walmartEnabled
              ? "Walmart is switched on, but this app cannot build a Walmart cart yet."
              : "Not connected. This app cannot send the list to Walmart yet."}
          </p>
        </div>

        {instacartEnabled ? (
          <div>
            <h3 className="font-display text-xl font-bold">Instacart</h3>
            {instacartUrl ? (
              <a className="mt-2 inline-flex min-h-11 items-center underline" href={instacartUrl} target="_blank" rel="noreferrer">
                Open the Instacart page
              </a>
            ) : (
              <p className="mt-2 text-base">Instacart is turned on, but INSTACART_PAGE_URL is not set.</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={copyList}>
          Copy
        </Button>
        <Button type="button" variant="secondary" onClick={shareList}>
          Send to Notes
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      {status ? (
        <p role="status" className="no-print mt-3 text-base">
          {status}
        </p>
      ) : null}
    </section>
  );
}
