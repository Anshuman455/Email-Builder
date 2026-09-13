import { useCallback, useRef, useState } from "react";
import { EmailBuilder } from "@email-builder/react";
import { SYNTAX } from "@email-builder/core";
import { GENERIC_FIELDS, CUSTOM_BLOCKS, adapter, SEED } from "demo-shared";
import "@email-builder/styles";
import "./demo.css";

const STORAGE_KEY = "email-builder.react.demo.v3";

/* Host buttons in the command bar. Wire onClick to your own file picker or AI assistant. */
const TOOLBAR_ACTIONS = [
  { id: "attach", label: "Attach file", icon: "attach_file", onClick: () => window.alert("Open your app's file picker here.") },
  { id: "ai", label: "Write with AI", icon: "auto_awesome", onClick: () => window.alert("Open your AI assistant here.") },
];

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
        theme={theme}
        blocks={CUSTOM_BLOCKS}
        mergeFields={GENERIC_FIELDS}
        mergeSyntax={SYNTAX.handlebars}
        adapter={adapter}
        toolbarActions={TOOLBAR_ACTIONS}
        onSave={onSave}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        autosave={{ debounceMs: 2000, maxWaitMs: 10000 }}
      />
    </div>
  );
}
