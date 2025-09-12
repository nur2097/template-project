import { Transform } from "class-transformer";
import * as sanitizeHtml from "sanitize-html";

/**
 * Sanitizes HTML input to prevent XSS attacks
 * @param options - sanitize-html options
 */
export function Sanitize(options?: sanitizeHtml.IOptions): PropertyDecorator {
  const defaultOptions: sanitizeHtml.IOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    allowedIframeHostnames: [],
  };

  return Transform(({ value }) => {
    if (typeof value === "string") {
      return sanitizeHtml(value, { ...defaultOptions, ...options });
    }
    return value;
  });
}

/**
 * Sanitizes text input by removing HTML tags completely
 */
export function SanitizeText(): PropertyDecorator {
  return Sanitize({
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitizes rich text input by allowing safe HTML tags
 */
export function SanitizeRichText(): PropertyDecorator {
  return Sanitize({
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * Trims whitespace from string inputs
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  });
}
