import type { BlockDefinition } from "../types";
import { headingBlock, listBlock, textBlock } from "./text";
import { imageBlock, videoBlock } from "./media";
import { buttonBlock, socialBlock } from "./action";
import { cardBlock } from "./card";
import { contentSlotBlock, dividerBlock, footerBlock, htmlBlock, spacerBlock } from "./structure";

/** Everything the library ships with. Nothing here knows what industry it is being used in. */
export const BUILTIN_BLOCKS: BlockDefinition[] = [
  contentSlotBlock,
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
