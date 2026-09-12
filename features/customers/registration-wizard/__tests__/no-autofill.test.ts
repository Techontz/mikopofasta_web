/**
 * The browser stays out of the registration form.
 *
 * Chrome was dropping the signed-in user's own saved postal addresses into the
 * Branch dropdown, alongside the branches the API had returned. It classifies
 * fields by name, id and label, and a form asking for a name, a phone number
 * and a street reads to it as an address form — so the Branch box, which had
 * neither a `name` nor an `autocomplete`, got classified from `id="branchId"`
 * and the label beside it.
 *
 * These assertions are on the RENDERED MARKUP rather than on the source,
 * because the attribute has to survive React to be worth anything.
 *
 * NOTE ON CASING. React emits `autoComplete="off"` into the HTML string, not
 * `autocomplete="off"`. That is not a bug: HTML attribute names are
 * case-insensitive, and a real Chrome parses it to the `autocomplete`
 * attribute with `el.autocomplete === "off"` — verified against Chrome 152
 * before this test was written. The regexes are therefore case-insensitive on
 * the attribute NAME, and would still catch the attribute going missing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Combobox } from "@/components/settings/combobox";
import { Input } from "@/components/ui/input";
import { NO_AUTOFILL } from "@/features/customers/registration-wizard/no-autofill";

const branchBox = (id = "branchId") =>
  renderToStaticMarkup(
    createElement(Combobox, {
      id,
      value: null,
      onChange: () => {},
      options: [{ value: "1", label: "Kakonko Branch" }],
      placeholder: "Select Branch",
    })
  );

test("the Branch dropdown tells the browser and the password managers to keep out", () => {
  const html = branchBox();

  assert.match(html, /autocomplete="off"/i);
  assert.match(html, /spellcheck="false"/i);
  assert.match(html, /data-1p-ignore/i, "1Password");
  assert.match(html, /data-lpignore="true"/i, "LastPass");
  assert.match(html, /data-bwignore/i, "Bitwarden");

  /* Still the application's own control, showing the application's own data. */
  assert.match(html, /Select Branch/);
});

test("the Branch input carries a name Chrome's classifier cannot match", () => {
  /* `autocomplete="off"` alone is not enough — Chrome disregards it on fields
     it has decided belong to an address form. An unrecognisable name is the
     part that actually stops the classification, so it must never be derived
     from the id or the label. */
  const name = branchBox().match(/name="([^"]+)"/)?.[1];

  assert.ok(name, "the input has a name at all");
  assert.doesNotMatch(name, /branch|address|street|region|district|ward/i);
});

test("two dropdowns on one page do not share a name", () => {
  /* Rendered in ONE tree on purpose: `useId` is unique within a render, and
     two separate `renderToStaticMarkup` calls each restart the counter — which
     would make this pass or fail for a reason that has nothing to do with the
     page the officer is looking at. */
  const box = (id: string) =>
    createElement(Combobox, { key: id, id, value: null, onChange: () => {}, options: [] });

  const html = renderToStaticMarkup(
    createElement("div", null, box("branchId"), box("addr-street"))
  );

  const names = [...html.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(names.length, 2, "both boxes rendered");
  assert.notEqual(names[0], names[1]);
});

test("the wizard's text inputs carry the same suppression", () => {
  const html = renderToStaticMarkup(createElement(Input, { ...NO_AUTOFILL, id: "firstName" }));

  assert.match(html, /autocomplete="off"/i);
  assert.match(html, /spellcheck="false"/i);
  assert.match(html, /data-lpignore="true"/i);
});
