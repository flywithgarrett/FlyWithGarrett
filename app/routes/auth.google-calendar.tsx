import { redirect } from "react-router";
import { getGoogleCalendarAuthUrl } from "~/lib/google-calendar.server";
export function loader() { return redirect(getGoogleCalendarAuthUrl()); }
