// lib/ansi-parser.ts

/**
 * Tailwind class mapping for ANSI foreground colors
 * Based on standard ANSI color codes
 */
const ANSI_FOREGROUND_COLORS: Record<number, string> = {
  // Regular
  30: "text-gray-900",
  31: "text-red-500",
  32: "text-green-500",
  33: "text-yellow-500",
  34: "text-blue-500",
  35: "text-purple-500",
  36: "text-cyan-500",
  37: "text-gray-200",

  // Bright
  90: "text-gray-500",
  91: "text-red-400",
  92: "text-green-400",
  93: "text-yellow-400",
  94: "text-blue-400",
  95: "text-purple-400",
  96: "text-cyan-400",
  97: "text-white",
};

/**
 * Tailwind class mapping for ANSI text styles
 */
const ANSI_TEXT_STYLES: Record<number, string> = {
  1: "font-bold",
  2: "opacity-60",
  3: "italic",
  4: "underline",
};

/**
 * Styled text segment returned by parser
 */
export interface StyledSegment {
  text: string;
  classes: string[];
}

/**
 * Regex to match ANSI escape sequences
 * Matches: \x1b[32m, \x1b[1;32m, etc.
 */
const ANSI_REGEX = /\x1b\[([0-9;]+)m/g;

/**
 * Parse ANSI escape codes into styled segments
 */
export function parseAnsiToStyledSegments(input: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

  let activeClasses: Set<string> = new Set();
  let buffer = "";
  let lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = ANSI_REGEX.exec(input)) !== null) {
    // Append text before ANSI code
    if (match.index > lastIndex) {
      buffer += input.slice(lastIndex, match.index);
    }

    // Flush buffer
    if (buffer.length > 0) {
      segments.push({
        text: buffer,
        classes: Array.from(activeClasses),
      });
      buffer = "";
    }

    // Parse ANSI codes
    const codes = match[1].split(";").map((c) => Number(c));

    for (const code of codes) {
      // Reset all
      if (code === 0) {
        activeClasses.clear();
        continue;
      }

      // Reset foreground color
      if (code === 39) {
        for (const cls of Array.from(activeClasses)) {
          if (cls.startsWith("text-")) {
            activeClasses.delete(cls);
          }
        }
        continue;
      }

      // Foreground colors
      if (ANSI_FOREGROUND_COLORS[code]) {
        // Remove existing foreground color
        for (const cls of Array.from(activeClasses)) {
          if (cls.startsWith("text-")) {
            activeClasses.delete(cls);
          }
        }
        activeClasses.add(ANSI_FOREGROUND_COLORS[code]);
        continue;
      }

      // Text styles
      if (ANSI_TEXT_STYLES[code]) {
        activeClasses.add(ANSI_TEXT_STYLES[code]);
      }
    }

    lastIndex = ANSI_REGEX.lastIndex;
  }

  // Append remaining text
  if (lastIndex < input.length) {
    buffer += input.slice(lastIndex);
  }

  if (buffer.length > 0) {
    segments.push({
      text: buffer,
      classes: Array.from(activeClasses),
    });
  }

  return segments;
}

/**
 * Remove ANSI escape codes from text
 */
export function stripAnsiCodes(text: string): string {
  return text.replace(ANSI_REGEX, "");
}
