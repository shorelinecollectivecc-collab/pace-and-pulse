import { useEffect, type Dispatch, type SetStateAction } from "react";
import { TRANSLATION_CACHE_PREFIX } from "../constants/settings";
import { translateTextBatch } from "../services/settings/translationService";
import { readJsonStorage, writeJsonStorage } from "../services/storage/localStorageService";
import type { AsyncStatus } from "../types/settings";

const originalTextValues = new WeakMap<Text, string>();
const originalAttributeValues = new WeakMap<Element, Record<string, string>>();

export function usePageTranslation(
  language: string,
  setStatus: Dispatch<SetStateAction<AsyncStatus>>
) {
  useEffect(() => {
    const root = document.querySelector(".app-layout");
    if (!root) return;

    const appRoot: Element = root;
    let stopped = false;
    let timer = 0;
    const cacheKey = `${TRANSLATION_CACHE_PREFIX}${language}`;
    const cache = readJsonStorage<Record<string, string>>(cacheKey, {});

    function shouldSkip(node: Text) {
      const parent = node.parentElement;
      return (
        !parent ||
        parent.closest("script, style, [data-no-translate], .theme-option-copy") !== null ||
        !/[a-zA-Z]/.test(node.textContent ?? "")
      );
    }

    function collect() {
      const walker = document.createTreeWalker(appRoot, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let current = walker.nextNode();

      while (current) {
        const textNode = current as Text;
        if (!shouldSkip(textNode)) textNodes.push(textNode);
        current = walker.nextNode();
      }

      const attributeElements = Array.from(
        appRoot.querySelectorAll("input[placeholder], textarea[placeholder], [title]")
      );
      return { textNodes, attributeElements };
    }

    async function translatePage() {
      if (stopped) return;
      const { textNodes, attributeElements } = collect();

      if (language === "en") {
        textNodes.forEach((node) => {
          const original = originalTextValues.get(node);
          if (original !== undefined && node.textContent !== original) {
            node.textContent = original;
          }
        });
        attributeElements.forEach((element) => {
          const originals = originalAttributeValues.get(element);
          Object.entries(originals ?? {}).forEach(([attribute, value]) => {
            if (element.getAttribute(attribute) !== value) {
              element.setAttribute(attribute, value);
            }
          });
        });
        setStatus("ready");
        return;
      }

      const jobs: Array<{ source: string; apply: (translated: string) => void }> = [];

      textNodes.forEach((node) => {
        const fullText = node.textContent ?? "";
        const source = (originalTextValues.get(node) ?? fullText).trim();
        if (!originalTextValues.has(node)) originalTextValues.set(node, fullText);

        if (source) {
          jobs.push({
            source,
            apply: (translated) => {
              const leading = fullText.match(/^\s*/)?.[0] ?? "";
              const trailing = fullText.match(/\s*$/)?.[0] ?? "";
              const nextText = `${leading}${translated}${trailing}`;
              if (node.textContent !== nextText) node.textContent = nextText;
            },
          });
        }
      });

      attributeElements.forEach((element) => {
        const originals = originalAttributeValues.get(element) ?? {};

        ["placeholder", "title"].forEach((attribute) => {
          const currentValue = element.getAttribute(attribute);
          if (!currentValue || !/[a-zA-Z]/.test(currentValue)) return;

          const source = originals[attribute] ?? currentValue;
          originals[attribute] = source;
          jobs.push({
            source,
            apply: (translated) => {
              if (element.getAttribute(attribute) !== translated) {
                element.setAttribute(attribute, translated);
              }
            },
          });
        });

        originalAttributeValues.set(element, originals);
      });

      const missing = [...new Set(jobs.map((job) => job.source).filter((source) => !cache[source]))];

      try {
        setStatus("working");
        for (let index = 0; index < missing.length; index += 80) {
          const texts = missing.slice(index, index + 80);
          const translated = await translateTextBatch(language, texts);
          texts.forEach((source, textIndex) => {
            cache[source] = translated[textIndex] ?? source;
          });
        }

        writeJsonStorage(cacheKey, cache);
        jobs.forEach((job) => job.apply(cache[job.source] ?? job.source));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    function scheduleTranslation() {
      window.clearTimeout(timer);
      timer = window.setTimeout(translatePage, 180);
    }

    const observer = new MutationObserver(scheduleTranslation);
    observer.observe(appRoot, { childList: true, subtree: true, characterData: true });
    scheduleTranslation();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language, setStatus]);
}
