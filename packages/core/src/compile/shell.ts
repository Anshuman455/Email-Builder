/* ══════════════════════════════ Document shell ══════════════════════════════
 *
 * The `<html>` wrapper and the one `<style>` block an email is allowed. Everything else is inline.
 *
 * Three things earn their place in the head and nothing else does:
 *   · client resets that cannot be expressed inline (Outlook's table spacing, iOS link colouring)
 *   · the media query — the only way to change anything at mobile width
 *   · `@font-face`, when the author chose a web font
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { DocumentSettings } from "../types";
import { escapeAttr, escapeHtml } from "../util/html";

export interface ShellOptions {
  title?: string;
  preheader?: string;
  headExtra?: string;
  /** Below this width the mobile rules apply. */
  mobileBreakpoint?: number;
}

export function resetCss(settings: DocumentSettings, breakpoint: number): string {
  return [
    "body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}",
    "table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}",
    "img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}",
    "a{color:" + settings.linkColor + "}",
    /* iOS turns dates, addresses and phone numbers into blue links. This is the only reliable way
       to take them back. */
    "a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}",
    ".eb-hide-desktop{display:none;font-size:0;max-height:0;line-height:0;overflow:hidden}",
    "#outlook a{padding:0}",
    ".ExternalClass{width:100%}",
    ".ExternalClass,.ExternalClass p,.ExternalClass td,.ExternalClass div,.ExternalClass span,.ExternalClass font{line-height:100%}",
    `@media only screen and (max-width:${breakpoint}px){`,
    "  .eb-container{width:100%!important;max-width:100%!important}",
    "  .eb-stack>tbody>tr>td,.eb-stack>tr>td{display:block!important;width:100%!important;max-width:100%!important;padding-left:0!important;padding-right:0!important}",
    "  .eb-stack img{width:100%!important;height:auto!important;max-width:100%!important}",
    "  .eb-hide-mobile{display:none!important;max-height:0!important;overflow:hidden!important}",
    "  .eb-hide-desktop{display:block!important;max-height:none!important;line-height:inherit!important;font-size:inherit!important;overflow:visible!important}",
    "  .eb-pad{padding-left:16px!important;padding-right:16px!important}",
    "}",
  ].join("");
}

/** Hidden text that becomes the inbox-list snippet. Padded with zero-width joiners so the client
 *  does not fall back to the first visible line when the preheader is short. */
export function preheaderHtml(text: string): string {
  if (!text) return "";
  const pad = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(text)}${pad}</div>`;
}

export function wrapDocument(body: string, settings: DocumentSettings, options: ShellOptions = {}): string {
  const breakpoint = options.mobileBreakpoint ?? 600;
  return [
    "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">",
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="${escapeAttr(settings.language || "en")}" dir="${settings.direction === "rtl" ? "rtl" : "ltr"}">`,
    "<head>",
    '<meta charset="utf-8" />',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge" />',
    '<meta name="viewport" content="width=device-width,initial-scale=1" />',
    '<meta name="format-detection" content="telephone=no,address=no,email=no,date=no" />',
    '<meta name="color-scheme" content="light" />',
    '<meta name="supported-color-schemes" content="light" />',
    `<title>${escapeHtml(options.title ?? "")}</title>`,
    /* Outlook reads DPI from the OS and scales everything up unless told not to. */
    "<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->",
    `<style type="text/css">${resetCss(settings, breakpoint)}</style>`,
    options.headExtra ?? "",
    "</head>",
    `<body style="margin:0;padding:0;background-color:${escapeAttr(settings.backgroundColor)};">`,
    preheaderHtml(options.preheader ?? ""),
    body,
    "</body></html>",
  ].join("");
}
