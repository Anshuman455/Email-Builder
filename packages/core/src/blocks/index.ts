import type { BlockDefinition } from "../types";
import { headingBlock, listBlock, textBlock } from "./text";
import { imageBlock, videoBlock } from "./media";
import { buttonBlock, socialBlock } from "./action";
import { cardBlock } from "./card";
import { contentSlotBlock, dividerBlock, footerBlock, htmlBlock, spacerBlock } from "./structure";

/** The primitives registered by default. Nothing here knows what industry it is being used in.
 *
 *  Composite, opinionated blocks — `cardBlock`, `footerBlock` — are exported but not registered:
 *  most apps want their own version, and a palette full of someone else's compositions is noise.
 *  Opt in with `setup({ blocks: [cardBlock, footerBlock] })`, or build your own with
 *  `defineBlock` (see docs/EXTENDING.md). */
export const BUILTIN_BLOCKS: BlockDefinition[] = [
  contentSlotBlock,
  textBlock,
  headingBlock,
  listBlock,
  imageBlock,
  videoBlock,
  buttonBlock,
  socialBlock,
  dividerBlock,
  spacerBlock,
  htmlBlock,
];

export const BLOCK_GROUP_ORDER = ["Content", "Media", "Layout", "Advanced"];

export {
  textBlock,
  headingBlock,
  listBlock,
  imageBlock,
  videoBlock,
  buttonBlock,
  cardBlock,
  socialBlock,
  dividerBlock,
  spacerBlock,
  htmlBlock,
  footerBlock,
  contentSlotBlock,
};
export { CONTENT_SLOT_PLACEHOLDER } from "./structure";
export { SOCIAL_PLATFORMS } from "./action";
export { CARD_LAYOUTS } from "./card";
export { ICONS } from "./icons";
export * from "./common";
