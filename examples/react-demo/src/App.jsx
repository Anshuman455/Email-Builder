import { useCallback, useRef, useState } from "react";
import { EmailBuilder } from "@email-builder/react";
import { SYNTAX } from "@email-builder/core";
import { GENERIC_FIELDS, CUSTOM_BLOCKS, adapter, SEED } from "demo-shared";
import "@email-builder/styles";
import "./demo.css";

const STORAGE_KEY = "email-builder.react.demo.v2";

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : SEED;
  } catch {
    return SEED;
  }
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const editorRef = useRef(null);

  const onSave = useCallback(async (design) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
  }, []);

  return (
    <div className="app-container">
      <EmailBuilder
        document={load()}
        title="Monthly Newsletter"
        subtitle="A monthly update for our community"
        badgeLabel="EMAIL TEMPLATE"
        backLabel="Templates"
        theme={theme}
        blocks={CUSTOM_BLOCKS}
        mergeFields={GENERIC_FIELDS}
        mergeSyntax={SYNTAX.handlebars}
        adapter={adapter}
        onSave={onSave}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        autosave={{ debounceMs: 2000, maxWaitMs: 10000 }}
      />
    </div>
  );
}
