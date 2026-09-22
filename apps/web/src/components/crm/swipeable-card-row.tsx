"use client";

import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { DeleteCardButton } from "./delete-card-button";

const SWIPE_DISTANCE = 92;

export function SwipeableCardRow({
  cardId,
  children,
}: {
  cardId: string;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const currentOffset = useRef(0);
  const dragged = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLTableRowElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button[aria-label="Удалить лида"]')) return;
    startX.current = event.clientX;
    startOffset.current = offset;
    currentOffset.current = offset;
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLTableRowElement>) {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    const next = Math.max(-SWIPE_DISTANCE, Math.min(0, startOffset.current + delta));
    if (Math.abs(delta) > 6) dragged.current = true;
    currentOffset.current = next;
    setOffset(next);
  }

  function onPointerUp(event: PointerEvent<HTMLTableRowElement>) {
    if (startX.current === null) return;
    const next = Math.abs(currentOffset.current) > SWIPE_DISTANCE / 2 ? -SWIPE_DISTANCE : 0;
    currentOffset.current = next;
    setOffset(next);
    startX.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onClickCapture(event: MouseEvent<HTMLTableRowElement>) {
    if (dragged.current) {
      event.preventDefault();
      event.stopPropagation();
      dragged.current = false;
    }
  }

  return (
    <tr
      className="group border-border/70 transition-transform duration-200 ease-out hover:bg-muted/50"
      style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      {children}
      <td className="sticky right-0 z-10 w-0 bg-card p-0 align-middle">
        <DeleteCardButton cardId={cardId} visible={offset < 0} />
      </td>
    </tr>
  );
}
