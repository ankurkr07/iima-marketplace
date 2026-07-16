/**
 * Configurable mailing groups for the admin bulk-mail tool.
 *
 * Add or edit named groups here, directly in code. The admin composer lets you
 * send to:
 *   - "all"      → every registered member (resolved live from the database)
 *   - a group    → one of the named lists below
 *   - "custom"   → an ad-hoc list typed into the composer
 *
 * Keep addresses within the institute domain.
 */
export const MAILING_GROUPS: Record<string, { label: string; emails: string[] }> = {
  council: {
    label: 'Student Council',
    emails: [
      // 'president@iima.ac.in',
      // 'gsec@iima.ac.in',
    ],
  },
  eclub: {
    label: 'Entrepreneurship Club',
    emails: [
      // 'eclub@iima.ac.in',
    ],
  },
  announcements: {
    label: 'Announcements opt-in',
    emails: [
      // add addresses that asked to receive marketplace announcements
    ],
  },
};

export const listMailingGroups = () =>
  Object.entries(MAILING_GROUPS).map(([key, g]) => ({
    key,
    label: g.label,
    count: g.emails.length,
  }));
