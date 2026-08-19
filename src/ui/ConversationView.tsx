"use client";

import { useEffect, useRef, useState } from "react";
import {
  newConversation,
  sendResidentMessage,
  switchLanguage,
  today,
  type ConversationState,
} from "@/conversation/agent-loop";
import { LANGUAGES, type Language } from "@/language";
import type { ScreeningResult } from "@/rules/types";
import { copyFor } from "./copy";
import { EligibilityMapPanel } from "./EligibilityMapPanel";
import { withoutTrailingNarration, type Bubble } from "./transcript";

export function ConversationView() {
  const asOf = useRef(today());
  const conversation = useRef<ConversationState>(newConversation(asOf.current));
  const nextBubbleId = useRef(0);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  /**
   * The map on screen, and the one it replaced.
   *
   * Both are held because the panel renders the *difference* between them: a
   * Program appearing and another Program's figure moving are the demo's
   * central beat, and a panel handed only the latest map can show that
   * happening but cannot show that it happened (ADR-0007). The previous map is
   * the last one a Resident actually saw: only a turn that records new facts
   * replaces it, so a language flip — which re-renders the same map from the
   * translation table and asks the rules module nothing — leaves the pair
   * alone and the badges where they were (ADR-0013).
   */
  const [maps, setMaps] = useState<{ current: ScreeningResult; previous?: ScreeningResult }>({
    current: conversation.current.screening,
  });
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
        onScreening: showScreening,
      });
    } catch (error) {
      setFailure(describeFailure(error));
    } finally {
      setBusy(false);
    }
  }

  /**
   * A new eligibility map arrives and the one it replaces becomes the thing it
   * is read against. Written as a functional update because the map on screen
   * is the only honest answer to "previous", and a turn that calls the facts
   * tool twice must pair each map with the one just before it rather than with
   * whatever was there when the turn started.
   */
  function showScreening(screening: ScreeningResult) {
    setMaps((shown) => ({ current: screening, previous: shown.current }));
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
    //
    // The swap waits for the first word of the replacement rather than
    // happening when the turn opens. A request that fails — or one the Resident
    // walks away from — must not leave a hole where BenefitBridge's answer was:
    // until there is something to put there, what is on screen stays on screen.
    let awaitingReplacement = true;

    try {
      conversation.current = await switchLanguage(conversation.current, chosen, asOf.current, {
        onAssistantTurnStart: () => {
          if (awaitingReplacement) return;
          setBubbles((current) => [...current, newBubble("benefitbridge", "")]);
        },
        onAssistantText: (delta) => {
          if (!awaitingReplacement) return appendToLastBubble(delta);

          const bubble = newBubble("benefitbridge", delta);
          awaitingReplacement = false;
          setBubbles((current) => [...withoutTrailingNarration(current), bubble]);
        },
        onScreening: showScreening,
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

  /**
   * Upstream failures — the proxy's and the API's alike — are written in English
   * and nowhere else. Showing one to a Resident who just asked for Spanish is
   * the flow not really being in Spanish, which is the whole of what this
   * ticket is about, so they get the one sentence BenefitBridge can actually
   * say in their language instead.
   */
  function describeFailure(error: unknown): string {
    if (language !== "en") return copy.genericFailure;
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

      <EligibilityMapPanel screening={maps.current} previous={maps.previous} language={language} />
    </main>
  );
}
