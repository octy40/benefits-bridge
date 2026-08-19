import { describe, expect, it } from "vitest";
import { withoutTrailingNarration, type Bubble } from "./transcript";

let nextId = 0;
const said = (speaker: Bubble["speaker"], text: string): Bubble => ({
  id: nextId++,
  speaker,
  text,
});

const spoken = (bubbles: Bubble[]) => bubbles.map((bubble) => bubble.text);

describe("withoutTrailingNarration", () => {
  it("takes back the whole of BenefitBridge's last reply, not just its last bubble", () => {
    // The model speaks before calling the tool and again after seeing the
    // result. Both halves are one reply as far as the Resident is concerned, so
    // both come back — leaving one behind would strand it in the language they
    // just left.
    const transcript = [
      said("benefitbridge", "Who lives with you?"),
      said("resident", "me and my two kids"),
      said("benefitbridge", "Thank you — let me check."),
      said("benefitbridge", "You likely qualify for SNAP."),
    ];

    expect(spoken(withoutTrailingNarration(transcript))).toEqual([
      "Who lives with you?",
      "me and my two kids",
    ]);
  });

  it("leaves the Resident's own words alone", () => {
    const transcript = [said("resident", "just me")];
    expect(withoutTrailingNarration(transcript)).toEqual(transcript);
  });

  it("has nothing to take back from an empty transcript", () => {
    expect(withoutTrailingNarration([])).toEqual([]);
  });
});
