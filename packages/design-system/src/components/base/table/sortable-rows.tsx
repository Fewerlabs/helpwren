"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { focusRing } from "../styles";

/** What a row says while it is moved, for the drag handle and for screen readers. */
export interface SortableRowsMessages {
  /** The drag handle's name. */
  handle: (label: string) => string;
  /** Read out when the handle is focused, so a keyboard user knows how to move the row. */
  instructions: string;
  pickedUp: (label: string, position: number, total: number) => string;
  moved: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
}

export const defaultSortableRowsMessages: SortableRowsMessages = {
  handle: (label) => `Reorder ${label}`,
  instructions:
    "Press Space or Enter to pick the row up, the arrow keys to move it, and Space or Enter again to drop it. Press Escape to put it back.",
  pickedUp: (label, position, total) => `Picked up ${label}, at position ${position} of ${total}.`,
  moved: (label, position, total) => `${label} moved to position ${position} of ${total}.`,
  dropped: (label, position, total) => `${label} dropped at position ${position} of ${total}.`,
  cancelled: (label, position, total) =>
    `Moving cancelled. ${label} is back at position ${position} of ${total}.`,
};

// Rows only move up and down, so a drag never wanders sideways out of its column.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export interface SortableRowsProps {
  /** The rows' keys, in the order shown. */
  ids: readonly UniqueIdentifier[];
  /** Names a row by its key, for what screen readers hear. */
  labelOf: (id: UniqueIdentifier) => string;
  messages: SortableRowsMessages;
  /** Called with every key in the new order once a row is dropped somewhere new. */
  onReorder: (ids: UniqueIdentifier[]) => void;
  children: ReactNode;
}

/**
 * The area inside which rows can be dragged into a new order, by pointer, touch or keyboard,
 * with each step announced to screen readers.
 */
export function SortableRows({ ids, labelOf, messages, onReorder, children }: SortableRowsProps) {
  // dnd-kit numbers its ids with a counter of its own, which differs between the server and the
  // browser; a stable id from React keeps the two pages the same.
  const id = useId();
  const sensors = useSensors(
    // A few pixels of travel first, so a click on the handle is not taken for a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const total = ids.length;
  const position = (key: UniqueIdentifier | undefined) =>
    key === undefined ? 0 : ids.indexOf(key) + 1;

  // Where the row was last said to be. A drag reports the row over its own place as it starts,
  // which would talk over "Picked up", so only a change of place is read out.
  const lastOver = useRef<UniqueIdentifier | null>(null);

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.id;
      return messages.pickedUp(labelOf(active.id), position(active.id), total);
    },
    onDragOver: ({ active, over }) => {
      if (!over || over.id === lastOver.current) return undefined;
      lastOver.current = over.id;
      return messages.moved(labelOf(active.id), position(over.id), total);
    },
    onDragEnd: ({ active, over }) =>
      messages.dropped(labelOf(active.id), position(over?.id ?? active.id), total),
    onDragCancel: ({ active }) =>
      messages.cancelled(labelOf(active.id), position(active.id), total),
  };

  function end({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove([...ids], from, to));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: messages.instructions },
      }}
      onDragEnd={end}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** What a sortable row passes to the element it draws. */
export interface SortableRowState {
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
  dragging: boolean;
  handle: ReactNode;
}

export interface SortableRowProps {
  id: UniqueIdentifier;
  /** Names the row for its drag handle. */
  label: string;
  messages: SortableRowsMessages;
  children: (state: SortableRowState) => ReactNode;
}

/**
 * One row that can be moved. It hands back the ref and style for the row's element, and the
 * handle to place in it: only the handle starts a drag, so the rest of the row still scrolls
 * the page on a phone and its links still open.
 */
export function SortableRow({ id, label, messages, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return children({
    ref: setNodeRef,
    dragging: isDragging,
    style: {
      transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
      transition,
      // The row being moved passes over the others.
      position: "relative",
      zIndex: isDragging ? 1 : undefined,
    },
    handle: (
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={messages.handle(label)}
        className={cn(
          // 28px to look at, with the area a finger can hit extended to 40px. It takes no touch
          // gestures of its own, so pressing it drags the row instead of scrolling the page.
          "text-muted-foreground hover:bg-muted hover:text-foreground relative grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md transition-colors after:absolute after:-inset-1.5 active:cursor-grabbing",
          focusRing,
        )}
      >
        <Icon name="dots-six-vertical" weight="bold" className="size-4" />
      </button>
    ),
  });
}
