import { describe, expect, it } from "vitest";
import { CHALLENGE_DECKS, QUESTION_LEVELS } from "@/lib/fun/cards-data";

const numbers = (decks: { cards: { n: number }[] }[]) => decks.flatMap((deck) => deck.cards.map((card) => card.n));
const range = (to: number) => Array.from({ length: to }, (_, i) => i + 1);

describe("cartes Fun", () => {
  it("contient les 520 questions, numérotées sans trou, en 10 niveaux de 52", () => {
    expect(QUESTION_LEVELS).toHaveLength(10);
    expect(QUESTION_LEVELS.every((level) => level.cards.length === 52)).toBe(true);
    expect(numbers(QUESTION_LEVELS)).toEqual(range(520));
    expect(QUESTION_LEVELS.every((level) => level.cards.every((card) => card.text.length > 5 && !card.text.includes("**")))).toBe(true);
  });

  it("contient les 270 défis, numérotés sans trou", () => {
    expect(numbers(CHALLENGE_DECKS)).toEqual(range(270));
    expect(CHALLENGE_DECKS.find((deck) => deck.id === "positions")?.cards.every((card) => card.title && card.group)).toBe(true);
  });

  it("le contenu intime est marqué 18+", () => {
    expect(QUESTION_LEVELS.filter((level) => level.adult).map((level) => level.id)).toEqual(["q7", "q8", "q9", "q10"]);
    expect(CHALLENGE_DECKS.filter((deck) => deck.adult).map((deck) => deck.id)).toEqual(["c11", "positions", "modifiers"]);
  });
});
