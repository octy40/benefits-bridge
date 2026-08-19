"use client";

import { useEffect, useRef, useState } from "react";
import {
  newConversation,
  sendResidentMessage,
  switchLanguage,
  today,
  type ConversationState,
} from "@/conversation/agent-loop";
import type { ScreeningResult } from "@/rules/types";
import { copyFor, LANGUAGES, type Language } from "./copy";
import { EligibilityMapPanel } from "./EligibilityMapPanel";

/** What the Resident sees of the conversation. Separate from what the model sees. */
type Bubble = { id: number; speaker: "resident" | "benefitbridge"; text: string };

export function ConversationView() {
  const asOf = useRef(today());
  const conversation = useRef<ConversationState>(newConversation(asOf.current));
  const nextBubbleId = useRef(0);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [screening, setScreening] = useState<ScreeningResult>(conversation.current.screening);
  const [language, setLanguage] = useState<Language>(conversation.current.language);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const copy = copyFor(language);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  // A screen reader picks its pronunciation from this, so it has to follow the
  // toggle rather than stay at whatever the document was served as.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
        onAssistantText: appendToLastBubble,
        onScreening: setScreening,
      });
    } catch (error) {
      setFailure(describeFailure(error));
    } finally {
      setBusy(false);
    }
  }

  /**
   * The language toggle.
   *
   * The chrome and the eligibility map flip on the line below — synchronously,
   * from the translation table, with nothing asked of the model. Only what
   * BenefitBridge *said* has to be asked for again, because only that was
   * model-authored to begin with (ADR-0001, ADR-0013).
   */
  async function chooseLanguage(chosen: Language) {
    if (busy || chosen === language) return;

    setLanguage(chosen);
    setBusy(true);
    setFailure(null);

    // The re-narration lands where the last thing BenefitBridge said used to
    // be, so the screen is coherent the moment it arrives rather than showing
    // the same answer twice in two languages. Everything above it is left as
    // the Resident and BenefitBridge actually said it.
    let replacingLastNarration = true;

    try {
      conversation.current = await switchLanguage(conversation.current, chosen, asOf.current, {
        onAssistantTurnStart: () => {
          const bubble = newBubble("benefitbridge", "");
          const replacing = replacingLastNarration;
          setBubbles((current) => [
            ...(replacing ? withoutTrailingNarration(current) : current),
            bubble,
          ]);
          replacingLastNarration = false;
        },
        onAssistantText: appendToLastBubble,
        onScreening: setScreening,
      });
    } catch (error) {
      // The interface has already flipped and is not flipping back; it was the
      // re-narration that failed. Carry the choice onto the conversation anyway
      // so the next turn is spoken in the language on screen.
      conversation.current = { ...conversation.current, language: chosen };
      setFailure(describeFailure(error));
    } finally {
      setBusy(false);
    }
  }

  function appendToLastBubble(delta: string) {
    setBubbles((current) =>
      current.map((bubble, index) =>
        index === current.length - 1 ? { ...bubble, text: bubble.text + delta } : bubble,
      ),
    );
  }

  function describeFailure(error: unknown): string {
    return error instanceof Error ? error.message : copy.genericFailure;
  }

  // Ids are minted outside the state updater: React invokes updaters more than
  // once in development, so an updater that mutates anything is a bug.
  function newBubble(speaker: Bubble["speaker"], text: string): Bubble {
    return { id: nextBubbleId.current++, speaker, text };
  }

  return (
    <main className="layout">
      <section className="conversation" aria-label={copy.conversationLabel}>
        <header className="conversation-header">
          <div className="conversation-title">
            <h1>{copy.appName}</h1>
            <div className="languages" role="group" aria-label={copy.languageChooserLabel}>
              {LANGUAGES.map(({ code, endonym }) => (
                <button
                  key={code}
                  type="button"
                  className="language"
                  // Named in its own language, and marked up as such, so a
                  // screen reader says "Español" rather than sounding it out in
                  // the language the Resident is trying to leave.
                  lang={code}
                  aria-pressed={code === language}
                  disabled={busy}
                  onClick={() => void chooseLanguage(code)}
                >
                  {endonym}
                </button>
              ))}
            </div>
          </div>
          <p>{copy.intro}</p>
        </header>

        <div className="transcript">
          {bubbles.length === 0 ? <p className="opener">{copy.opener}</p> : null}

          {bubbles
            .filter((bubble) => bubble.text !== "")
            .map((bubble) => (
              <p key={bubble.id} className={`bubble bubble-${bubble.speaker}`}>
                {bubble.text}
              </p>
            ))}

          {busy ? (
            <p className="bubble bubble-benefitbridge thinking" aria-live="polite">
              {copy.working}
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
            placeholder={copy.composerPlaceholder}
            aria-label={copy.composerLabel}
            disabled={busy}
            autoFocus
          />
          <button type="submit" disabled={busy || draft.trim() === ""}>
            {busy ? copy.working : copy.send}
          </button>
        </form>
      </section>

      <EligibilityMapPanel screening={screening} language={language} />
    </main>
  );
}

/**
 * Everything up to, but not including, the run of bubbles BenefitBridge last
 * spoke. One answer can occupy more than one bubble — the model speaks before
 * calling the tool and again after seeing the result — and re-narrating half of
 * it would leave the other half stranded in the language the Resident just left.
 */
function withoutTrailingNarration(bubbles: Bubble[]): Bubble[] {
  let end = bubbles.length;
  while (end > 0 && bubbles[end - 1].speaker === "benefitbridge") end--;
  return bubbles.slice(0, end);
}
