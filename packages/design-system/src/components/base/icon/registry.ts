// The only file allowed to import the icon library. To add an icon: find its name on
// https://phosphoricons.com, add one import and one registry entry, both in alphabetical order.
// Imported from the /ssr entry so icons render in React Server Components too.
import {
  SSRBase,
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  BellIcon,
  BookOpenIcon,
  CalendarIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CellSignalHighIcon,
  CellSignalLowIcon,
  CellSignalMediumIcon,
  ChatCircleIcon,
  ChatTeardropTextIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeIcon,
  CopyIcon,
  DotsThreeIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  FunnelIcon,
  GearIcon,
  GithubLogoIcon,
  GlobeIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoonIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  QuestionIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SpinnerIcon,
  SunIcon,
  TagIcon,
  TicketIcon,
  TrashIcon,
  TrayIcon,
  UserIcon,
  UsersIcon,
  WarningIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import { createElement, forwardRef, type ComponentProps, type ReactElement } from "react";

// The library's own types are not exported from its /ssr entry, so they are read off an icon.
type Glyph = typeof ChatCircleIcon;
type IconWeight = NonNullable<ComponentProps<Glyph>["weight"]>;

const chatWrenBird =
  "M194.8 112.8 173.5 114.9C169.2 100.3 157 90.9 142.2 90.9 124.6 90.9 107.1 99 96.2 115.2 86.8 105.8 80.1 92.2 77.3 77.4L65.2 82.8C69.2 100.3 78.7 119.2 88.2 131.4 88.2 155.7 105.7 171.9 130 173.2 155.7 174.6 175.9 154.4 175.9 130.1 175.9 127.4 175.9 125.5 175.4 123.6ZM162.7 114.4A5.7 5.7 0 1 0 151.3 114.4 5.7 5.7 0 1 0 162.7 114.4Z";
const chatWrenBubble =
  "M128 24a104 104 0 0 0-91.8 152.9L25.4 209.3a16 16 0 0 0 20.3 20.3l32.4-10.8A104 104 0 1 0 128 24Z";
const chatWrenRing =
  "m0 192a88 88 0 0 1-44.1-11.8 8 8 0 0 0-6.5-.7L40.6 215.4l11.9-36.8a8 8 0 0 0-.7-6.5A88 88 0 1 1 128 216Z";

const chatWrenLine = createElement("path", {
  fillRule: "evenodd",
  d: chatWrenBubble + chatWrenRing + chatWrenBird,
});
const chatWrenWeights = new Map<IconWeight, ReactElement>([
  ["thin", chatWrenLine],
  ["light", chatWrenLine],
  ["regular", chatWrenLine],
  ["bold", chatWrenLine],
  ["duotone", chatWrenLine],
  ["fill", createElement("path", { fillRule: "evenodd", d: chatWrenBubble + chatWrenBird })],
]);

/**
 * Our own icon, not from the library: the wren inside a speech bubble, the same drawing as the
 * widget's `wren` launcher. It has one line weight; `fill` is the solid bubble with the wren cut out.
 */
const ChatWrenIcon: Glyph = forwardRef<SVGSVGElement, ComponentProps<Glyph>>(
  function ChatWrenIcon(props, ref) {
    return createElement(SSRBase, { ...props, ref, weights: chatWrenWeights });
  },
);

export const registry = {
  archive: ArchiveIcon,
  "arrow-left": ArrowLeftIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-square-out": ArrowSquareOutIcon,
  "arrows-clockwise": ArrowsClockwiseIcon,
  bell: BellIcon,
  "book-open": BookOpenIcon,
  calendar: CalendarIcon,
  "caret-down": CaretDownIcon,
  "caret-left": CaretLeftIcon,
  "caret-right": CaretRightIcon,
  "caret-up": CaretUpIcon,
  "cell-signal-high": CellSignalHighIcon,
  "cell-signal-low": CellSignalLowIcon,
  "cell-signal-medium": CellSignalMediumIcon,
  "chat-circle": ChatCircleIcon,
  "chat-teardrop-text": ChatTeardropTextIcon,
  "chat-wren": ChatWrenIcon,
  check: CheckIcon,
  "check-circle": CheckCircleIcon,
  clock: ClockIcon,
  code: CodeIcon,
  copy: CopyIcon,
  "dots-three": DotsThreeIcon,
  envelope: EnvelopeIcon,
  eye: EyeIcon,
  "eye-slash": EyeSlashIcon,
  funnel: FunnelIcon,
  gear: GearIcon,
  "github-logo": GithubLogoIcon,
  globe: GlobeIcon,
  house: HouseIcon,
  image: ImageIcon,
  info: InfoIcon,
  link: LinkIcon,
  list: ListIcon,
  lock: LockIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  minus: MinusIcon,
  moon: MoonIcon,
  "paper-plane-tilt": PaperPlaneTiltIcon,
  paperclip: PaperclipIcon,
  "pencil-simple": PencilSimpleIcon,
  phone: PhoneIcon,
  plus: PlusIcon,
  question: QuestionIcon,
  "sidebar-simple": SidebarSimpleIcon,
  "sign-out": SignOutIcon,
  spinner: SpinnerIcon,
  sun: SunIcon,
  tag: TagIcon,
  ticket: TicketIcon,
  trash: TrashIcon,
  tray: TrayIcon,
  user: UserIcon,
  users: UsersIcon,
  warning: WarningIcon,
  "warning-circle": WarningCircleIcon,
  x: XIcon,
  "x-circle": XCircleIcon,
} as const;

export type IconName = keyof typeof registry;

export const iconNames = Object.keys(registry) as IconName[];
