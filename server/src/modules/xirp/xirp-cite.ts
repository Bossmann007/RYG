export type XirpCiteStatus = "cited" | "silent" | "mixed";

export function deriveCiteStatus(
  refs: Array<{ label?: string }>,
): XirpCiteStatus {
  if (!refs.length) {
    return "silent";
  }

  let citavel = 0;
  let naoCitavel = 0;
  for (const ref of refs) {
    const label = String(ref.label ?? "");
    if (/não citável/i.test(label)) {
      naoCitavel += 1;
    } else if (/citável/i.test(label)) {
      citavel += 1;
    } else {
      // Unmarked labels stay silent (cite-or-silent), never inferred as cited.
      naoCitavel += 1;
    }
  }

  if (citavel > 0 && naoCitavel > 0) {
    return "mixed";
  }
  if (citavel > 0) {
    return "cited";
  }
  return "silent";
}
