import { z } from "zod";

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

export const TOOLS = [
  {
    name: "get_page_state",
    description: "Return a fresh snapshot of the current page: URL, interactive elements with ids, and visible text. Call this after a page changes, or to verify fields you filled.",
    input_schema: obj({}, []),
  },
  {
    name: "navigate",
    description: "Load a URL in the current tab. Returns the new page state.",
    input_schema: obj({ url: { type: "string", description: "Absolute URL" } }, ["url"]),
  },
  {
    name: "click",
    description: "Click an element by its snapshot id (buttons, links, tabs, radio options, dropdown triggers). Returns the new page state.",
    input_schema: obj({ id: { type: "integer" } }, ["id"]),
  },
  {
    name: "fill",
    description: "Type a value into a text input, textarea, date field, rich-text box or autocomplete/combobox (for comboboxes the best matching suggestion is selected). Replaces existing content.",
    input_schema: obj({ id: { type: "integer" }, value: { type: "string" } }, ["id", "value"]),
  },
  {
    name: "select_option",
    description: "Choose an option in a <select> or custom dropdown by its visible text (case-insensitive, partial match allowed).",
    input_schema: obj({ id: { type: "integer" }, option: { type: "string", description: "Option text" } }, ["id", "option"]),
  },
  {
    name: "set_checkbox",
    description: "Check or uncheck a checkbox, radio button or switch.",
    input_schema: obj({ id: { type: "integer" }, checked: { type: "boolean" } }, ["id", "checked"]),
  },
  {
    name: "upload_file",
    description: "Attach the candidate's resume or cover letter PDF to a file input, or to a button that opens a file chooser.",
    input_schema: obj(
      { id: { type: "integer" }, file: { type: "string", enum: ["resume", "cover_letter"] } },
      ["id", "file"],
    ),
  },
  {
    name: "press_key",
    description: "Press a keyboard key such as Enter, Escape, Tab or ArrowDown. Returns the new page state.",
    input_schema: obj({ key: { type: "string" } }, ["key"]),
  },
  {
    name: "scroll",
    description: "Scroll the page up or down (rarely needed; snapshots include off-screen elements). Returns the new page state.",
    input_schema: obj({ direction: { type: "string", enum: ["up", "down"] } }, ["direction"]),
  },
  {
    name: "wait",
    description: "Wait for the page to finish loading or processing (max 15 seconds). Returns the new page state.",
    input_schema: obj({ seconds: { type: "number" } }, ["seconds"]),
  },
  {
    name: "look_at_screenshot",
    description: "Return a screenshot of the current viewport as an image. Use only when the text snapshot is ambiguous (e.g. to confirm a submission succeeded or detect a CAPTCHA).",
    input_schema: obj({}, []),
  },
  {
    name: "finish",
    description: "End the task with a final status and a short summary of what happened and what, if anything, the candidate still needs to do.",
    input_schema: obj(
      {
        status: { type: "string", enum: ["submitted", "ready_for_review", "needs_human", "skipped", "failed"] },
        summary: { type: "string" },
      },
      ["status", "summary"],
    ),
  },
].map((t) => ({ ...t, strict: true, eager_input_streaming: true }));

export const ToolInputs = {
  get_page_state: z.object({}),
  navigate: z.object({ url: z.string() }),
  click: z.object({ id: z.number().int() }),
  fill: z.object({ id: z.number().int(), value: z.string() }),
  select_option: z.object({ id: z.number().int(), option: z.string() }),
  set_checkbox: z.object({ id: z.number().int(), checked: z.boolean() }),
  upload_file: z.object({ id: z.number().int(), file: z.enum(["resume", "cover_letter"]) }),
  press_key: z.object({ key: z.string() }),
  scroll: z.object({ direction: z.enum(["up", "down"]) }),
  wait: z.object({ seconds: z.number() }),
  look_at_screenshot: z.object({}),
  finish: z.object({
    status: z.enum(["submitted", "ready_for_review", "needs_human", "skipped", "failed"]),
    summary: z.string(),
  }),
};
export type ToolName = keyof typeof ToolInputs;
