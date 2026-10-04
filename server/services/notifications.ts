import "server-only";
import { after } from "next/server";
import { formatDate, formatDateTime, formatDayRange, formatDay } from "@/lib/dates";
import type { WorkspaceContext } from "../auth/guards";
import { db, sql } from "../db";
import { sendEmail } from "../email";
import { partnerActivityEmail } from "../email/templates";
import type { CalendarEventRow } from "./calendar";
import type { TaskRow } from "./tasks";

type Notice = Parameters<typeof partnerActivityEmail>[2];

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/**
 * Prévient le ou la partenaire par e-mail (si l'option « Nouvelles de l'espace » est activée).
 * L'envoi a lieu après la réponse : il ne ralentit jamais l'action, et un échec est seulement journalisé.
 */
function notifyPartner(ctx: WorkspaceContext, build: (author: string) => Notice) {
  const partner = ctx.partner;
  if (!partner) return;
  const notice = build(firstName(ctx.user.name));
  after(async () => {
    try {
      const prefs = await db.maybe<{ emailNotifications: boolean }>(sql`
        SELECT email_notifications FROM users WHERE id = ${partner.id}`);
      if (!prefs?.emailNotifications) return;
      await sendEmail(partnerActivityEmail(partner.email, firstName(partner.name), notice));
    } catch (error) {
      console.error("[notifications] e-mail non envoyé", error);
    }
  });
}

/** Une tâche vient d'être assignée au ou à la partenaire (par l'autre membre). */
export function notifyTaskAssigned(ctx: WorkspaceContext, task: TaskRow, previousAssigneeId: string | null = null) {
  if (!ctx.partner || task.assignedToId !== ctx.partner.id || previousAssigneeId === ctx.partner.id) return;
  notifyPartner(ctx, (author) => ({
    subject: `${author} vous a confié une tâche : ${task.title}`,
    heading: task.title,
    message: `${author} vous a confié cette tâche.`,
    details: [
      ...(task.dueDate ? [`À faire avant le ${formatDay(task.dueDate, "long")}.`] : []),
      ...(task.description ? [task.description] : []),
    ],
    path: `/tasks?task=${task.id}`,
    label: "Voir la tâche",
  }));
}

/** Un événement vient d'être ajouté au calendrier par l'autre membre. */
export function notifyEventCreated(ctx: WorkspaceContext, event: CalendarEventRow) {
  if (event.reservationId || event.tripId) return; // déjà annoncé avec la réservation ou le voyage
  notifyPartner(ctx, (author) => ({
    subject: `${author} a ajouté « ${event.title} » au calendrier`,
    heading: event.title,
    message: `${author} a ajouté un événement au calendrier.`,
    details: [
      event.allDay ? `Le ${formatDate(event.startDate, "full")}.` : `Le ${formatDateTime(event.startDate)}.`,
      ...(event.location ? [`Lieu : ${event.location}`] : []),
    ],
    path: `/calendar?event=${event.id}`,
    label: "Ouvrir le calendrier",
  }));
}

/** Un voyage vient d'être créé par l'autre membre. */
export function notifyTripCreated(ctx: WorkspaceContext, trip: { id: string; title: string; destination: string; startDate: string; endDate: string }) {
  notifyPartner(ctx, (author) => ({
    subject: `${author} a créé le voyage « ${trip.title} »`,
    heading: trip.title,
    message: `${author} a créé un nouveau voyage : ${trip.destination}.`,
    details: [`Dates : ${formatDayRange(trip.startDate, trip.endDate)}.`],
    path: `/trips/${trip.id}`,
    label: "Voir le voyage",
  }));
}
