// Centralized registry for the Hello intro's rotating second greeting.
// Every entry is a real, verified everyday greeting. Scoped to Latin-
// script languages only — these are drawn as original animated SVG
// handwriting (see src/utils/handwritingLetters.js), and hand-authoring
// correct joined-script paths for Arabic, Devanagari, or Japanese is not
// something that can be done to a trustworthy standard here.
export const HELLO_WORD = "hello";

export const HELLO_GREETINGS = [
  { id: "spanish", text: "hola", language: "Spanish", locale: "es", direction: "ltr" },
  { id: "portuguese", text: "olá", language: "Portuguese", locale: "pt", direction: "ltr" },
  { id: "french", text: "bonjour", language: "French", locale: "fr", direction: "ltr" },
  { id: "italian", text: "ciao", language: "Italian", locale: "it", direction: "ltr" },
  { id: "romanian", text: "salut", language: "Romanian", locale: "ro", direction: "ltr" },
  { id: "german", text: "hallo", language: "German", locale: "de", direction: "ltr" },
  { id: "swedish", text: "hej", language: "Swedish", locale: "sv", direction: "ltr" },
  { id: "czech", text: "ahoj", language: "Czech", locale: "cs", direction: "ltr" },
  { id: "icelandic", text: "halló", language: "Icelandic", locale: "is", direction: "ltr" },
];
