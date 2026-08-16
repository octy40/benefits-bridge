"use client";

import { useEffect, useRef, useState } from "react";
import {
  newConversation,
  sendResidentMessage,
  today,
  type ConversationState,
} from "@/conversation/agent-loop";
import type { ScreeningResult } from "@/rules/types";
import { EligibilityMapPanel } from "./EligibilityMapPanel";

/** What the Resident sees of the conversation. Separate from what the model sees. */
type Bubble = { id: number; speaker: "resident" | "benefitbridge"; text: string };

export function ConversationView() {
  const asOf = useRef(today());
  const conversation = useRef<ConversationState>(newConversation(asOf.current));
  const nextBubbleId = useRef(0);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [screening, setScreening] = useState<ScreeningResult>(conversation.current.screening);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  async function send(text: string) {
    if (busy || text.trim() === "") return;

    setBusy(true);
    setFailure(null);
    setDraft("");
    setBubbles((current) => [...current, newBubble("resident", text)]);

    try {
      conversation.current = await sendResidentMessage(conversation.current, text, asOf.current, {
        // The model speaks once before calling the tool and again after seeing
        // the result, and those are two separate things to say. Each turn opens
        // its own bubble; one that only calls the tool stays empty and is
        // dropped at render, so nothing blank is left behind.
        onAssistantTurnStart: () => {
          const bubble = newBubble("benefitbridge", "");
          setBubbles((current) => [...current, bubble]);
        },
        onAssistantText: (delta) =>
          setBubbles((current) =>
            current.map((bubble, index) =>
              index === current.length - 1 ? { ...bubble, text: bubble.text + delta } : bubble,
            ),
          ),
        onScreening: setScreening,
      });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Ids are minted outside the state updater: React invokes updaters more than
  // once in development, so an updater that mutates anything is a bug.
  function newBubble(speaker: Bubble["speaker"], text: string): Bubble {
    return { id: nextBubbleId.current++, speaker, text };
  }

  return (
    <main className="layout">
      <section className="conversation" aria-label="Conversation">
        <header className="conversation-header">
          <h1>BenefitBridge</h1>
          <p>
            Tell us about your household in your own words. Nothing is saved — close this tab and it is
            all gone.
          </p>
        </header>

        <div className="transcript">
          {bubbles.length === 0 ? (
            <p className="opener">
              Hi — I can help you find benefits your household may be missing. To start: who lives with you?
            </p>
          ) : null}

          {bubbles
            .filter((bubble) => bubble.text !== "")
            .map((bubble) => (
              <p key={bubble.id} className={`bubble bubble-${bubble.speaker}`}>
                {bubble.text}
              </p>
            ))}

          {busy ? (
            <p className="bubble bubble-benefitbridge thinking" aria-live="polite">
              …
            </p>
          ) : null}

          {failure ? <p className="failure">{failure}</p> : null}
          <div ref={transcriptEnd} />
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell us about your household…"
            aria-label="Your message"
            disabled={busy}
            autoFocus
          />
          <button type="submit" disabled={busy || draft.trim() === ""}>
            {busy ? "…" : "Send"}
          </button>
        </form>
      </section>

      <EligibilityMapPanel screening={screening} />
    </main>
  );
}
