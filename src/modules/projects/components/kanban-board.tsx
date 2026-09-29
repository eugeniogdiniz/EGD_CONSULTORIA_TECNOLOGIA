"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeliverableFormDialog } from "./deliverable-form";
import { reorderDeliverableForm } from "@/modules/projects/form-actions";
import { formatIsoDate } from "@/lib/format";
import { PRIORITY_LABEL, PRIORITY_STYLE, type Priority } from "@/modules/projects/priority";

type Status = "todo" | "doing" | "review" | "done" | "blocked";

export type KanbanCard = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  position: number;
  phaseId: string | null;
  phaseName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  fileId: string | null;
};

type Column = { status: Status; items: KanbanCard[] };

type Phase = { id: string; name: string };
type Assignee = { id: string; name: string };

const STATUS_LABEL: Record<Status, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Revisão",
  done: "Feita",
  blocked: "Bloqueada",
};

const STATUS_PIP: Record<Status, string> = {
  todo: "bg-faint",
  doing: "bg-link",
  review: "bg-signal",
  done: "bg-success",
  blocked: "bg-danger",
};

const STATUS_ORDER: Status[] = ["todo", "doing", "review", "done", "blocked"];

function initials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function CardBody({ card, today }: { card: KanbanCard; today: string }) {
  const late = card.dueAt !== null && card.dueAt <= today && card.status !== "done";
  return (
    <>
      <div className="text-sm font-medium leading-snug">{card.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-muted-foreground">
        {card.priority !== "medium" && (
          <span className={cn("inline-flex h-4 items-center rounded-sm border px-1 text-[10px] font-medium", PRIORITY_STYLE[card.priority])}>
            {PRIORITY_LABEL[card.priority]}
          </span>
        )}
        {card.phaseName && (
          <span title={card.phaseName} className="type-data inline-block h-4 max-w-full truncate rounded-sm border border-border px-1 text-[10px] leading-[14px]">
            {card.phaseName}
          </span>
        )}
        {card.assigneeName && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-card">
            {initials(card.assigneeName)}
          </span>
        )}
        {card.fileId && (
          <span className="type-data text-[10px]" title="Tem anexo">
            📎
          </span>
        )}
        {card.dueAt && (
          <span
            className={cn(
              "type-data ml-auto text-xs",
              late && "font-medium text-danger",
            )}
          >
            {formatIsoDate(card.dueAt)}
          </span>
        )}
      </div>
    </>
  );
}

function SortableCard({
  card,
  today,
  projectId,
  phases,
  assignees,
}: {
  card: KanbanCard;
  today: string;
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  } as const;

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <DeliverableFormDialog
        projectId={projectId}
        phases={phases}
        assignees={assignees}
        deliverable={{
          id: card.id,
          title: card.title,
          description: card.description,
          status: card.status,
          phaseId: card.phaseId,
          assigneeId: card.assigneeId,
          dueAt: card.dueAt,
          priority: card.priority,
        }}
        trigger={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="block w-full rounded border border-border bg-card p-3 text-left hover:border-strong"
            aria-roledescription="Cartão de entrega arrastável"
          >
            <CardBody card={card} today={today} />
          </button>
        }
      />
    </div>
  );
}

function DroppableColumn({
  status,
  items,
  today,
  projectId,
  phases,
  assignees,
  overIdInThisColumn,
}: {
  status: Status;
  items: KanbanCard[];
  today: string;
  projectId: string;
  phases: Phase[];
  assignees: Assignee[];
  overIdInThisColumn: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const collapsed = status === "blocked" && items.length === 0;
  const highlighted = isOver || overIdInThisColumn;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-subtle",
        collapsed ? "min-h-0" : "min-h-64",
        highlighted && "ring-2 ring-ring",
      )}
      data-status={status}
    >
      <header
        className={cn(
          "flex items-center gap-2 px-3 py-2.5",
          !collapsed && "border-b border-border",
        )}
      >
        <span className={cn("size-2 rounded-full", STATUS_PIP[status])} />
        <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
        <span className="type-data ml-auto text-[0.75rem] text-muted-foreground">
          {items.length}
        </span>
      </header>
      {!collapsed && (
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-2 p-2">
            {items.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-center text-xs text-faint">
                Solte aqui.
              </div>
            ) : (
              items.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  today={today}
                  projectId={projectId}
                  phases={phases}
                  assignees={assignees}
                />
              ))
            )}
          </div>
        </SortableContext>
      )}
    </section>
  );
}

function findColumn(columns: Column[], id: string): Status | null {
  if (id.startsWith("col:")) return id.slice(4) as Status;
  for (const col of columns) if (col.items.some((c) => c.id === id)) return col.status;
  return null;
}

export function KanbanBoard({
  projectId,
  initialColumns,
  phases,
  assignees,
  today,
}: {
  projectId: string;
  initialColumns: Column[];
  phases: Phase[];
  assignees: Assignee[];
  today: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  // Ressincroniza quando o servidor manda dados novos (criar/editar entrega, router.refresh).
  const [syncedFrom, setSyncedFrom] = useState(initialColumns);
  if (syncedFrom !== initialColumns) {
    setSyncedFrom(initialColumns);
    setColumns(initialColumns);
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [pending, startTransition] = useTransition();
  const [blockPrompt, setBlockPrompt] = useState<
    | {
        deliverableId: string;
        toPosition: number;
        snapshot: Column[];
      }
    | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    for (const col of columns) {
      const found = col.items.find((c) => c.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: { over: { id: string | number } | null; active: { id: string | number } }) {
    if (!event.over) {
      setOverColumn(null);
      return;
    }
    const overId = String(event.over.id);
    const col = findColumn(columns, overId);
    setOverColumn(col);
  }

  function commit(
    deliverableId: string,
    toStatus: Status,
    toPosition: number,
    blockReason?: string,
  ) {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("deliverableId", deliverableId);
    fd.set("toStatus", toStatus);
    fd.set("toPosition", String(toPosition));
    if (blockReason) fd.set("blockReason", blockReason);
    startTransition(async () => {
      await reorderDeliverableForm(null, fd);
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const fromCol = findColumn(columns, activeIdStr);
    const toCol = findColumn(columns, overIdStr);
    if (!fromCol || !toCol) return;

    const snapshot = columns;
    const target = columns.find((c) => c.status === toCol)!;
    const overCard = target.items.find((c) => c.id === overIdStr);
    const fromItems = columns.find((c) => c.status === fromCol)!.items;
    const activeItem = fromItems.find((c) => c.id === activeIdStr);
    if (!activeItem) return;

    let toPosition: number;
    if (fromCol === toCol) {
      const oldIndex = target.items.findIndex((c) => c.id === activeIdStr);
      const newIndex = overCard ? target.items.findIndex((c) => c.id === overIdStr) : target.items.length - 1;
      if (oldIndex === newIndex) return;
      toPosition = newIndex;
    } else {
      toPosition = overCard
        ? target.items.findIndex((c) => c.id === overIdStr)
        : target.items.length;
    }

    // Otimista: reordena localmente já.
    setColumns((prev) => moveBetween(prev, activeIdStr, fromCol, toCol, toPosition));

    if (toCol === "blocked") {
      setBlockPrompt({ deliverableId: activeIdStr, toPosition, snapshot });
      return;
    }
    commit(activeIdStr, toCol, toPosition);
  }

  function confirmBlock(reason: string) {
    if (!blockPrompt) return;
    const { deliverableId, toPosition } = blockPrompt;
    setBlockPrompt(null);
    commit(deliverableId, "blocked", toPosition, reason);
  }

  function cancelBlock() {
    if (!blockPrompt) return;
    setColumns(blockPrompt.snapshot);
    setBlockPrompt(null);
  }

  return (
    <div className={cn("relative", pending && "opacity-80")}>
      <DndContext
        id="kanban-entregas"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverColumn(null);
        }}
      >
        <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {columns.map((col) => (
            <DroppableColumn
              key={col.status}
              status={col.status}
              items={col.items}
              today={today}
              projectId={projectId}
              phases={phases}
              assignees={assignees}
              overIdInThisColumn={overColumn === col.status}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="w-64 rounded border border-strong bg-card p-3 shadow-lg">
              <CardBody card={activeCard} today={today} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <BlockReasonDialog
        open={blockPrompt !== null}
        onOpenChange={(open) => {
          if (!open) cancelBlock();
        }}
        onConfirm={confirmBlock}
      />
    </div>
  );
}

function moveBetween(
  columns: Column[],
  activeId: string,
  from: Status,
  to: Status,
  toPosition: number,
): Column[] {
  const next: Column[] = STATUS_ORDER.map((status) => {
    const src = columns.find((c) => c.status === status)!;
    return { status, items: [...src.items] };
  });
  const fromCol = next.find((c) => c.status === from)!;
  const toCol = next.find((c) => c.status === to)!;
  const idx = fromCol.items.findIndex((c) => c.id === activeId);
  if (idx < 0) return columns;
  const [moved] = fromCol.items.splice(idx, 1);
  const clamped = Math.max(0, Math.min(toPosition, toCol.items.length));
  toCol.items.splice(clamped, 0, { ...moved, status: to });
  return next;
}

function BlockReasonDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setReason("");
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo do bloqueio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="k-reason">Descreva por que a entrega foi bloqueada</Label>
          <Input
            id="k-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            placeholder="Ex.: aguardando aprovação do escopo"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Fica anexado como bloco <span className="mono">## Bloqueio</span> na descrição.
          </p>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" size="sm" type="button">
                Cancelar
              </Button>
            }
          />
          <Button
            size="sm"
            disabled={reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim())}
          >
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
