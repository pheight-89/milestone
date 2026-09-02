import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

export async function sendRegistrationEmail({ to, subject, body }) {
  // Supabase does not expose a generic send-email API on the admin client.
  // Use fetch to call the Supabase REST API directly if needed,
  // or log a TODO and use console.log for now.
  // TODO: Integrate with an email provider (Resend, SendGrid, or Supabase Edge Functions)
  // For now, log the email that would be sent
  console.log("EMAIL TO:", to);
  console.log("SUBJECT:", subject);
  console.log("BODY:", body);
}

export function confirmationEmailBody(clientName, eventTitle, eventDate, orgName) {
  return `Hi,

Your registration for ${clientName} has been confirmed for ${eventTitle} on ${new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} with ${orgName}.

Thank you for registering through Milestone.`;
}

export function declinedEmailBody(clientName, eventTitle, orgName) {
  return `Hi,

We're sorry to let you know that the registration for ${clientName} for ${eventTitle} with ${orgName} was not approved at this time.

Please contact ${orgName} directly if you have questions.`;
}

export function movedEmailBody(clientName, newEventTitle, eventDate) {
  return `${clientName} has been moved to ${newEventTitle} on ${new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Status is now pending confirmation.`;
}
