import md5 from "md5";

export function lastFmApiSignature(
  params: Record<string, string>,
  sharedSecret: string
): string {
  const signature =
    Object.entries(params)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flat()
      .join("") + sharedSecret;

  return md5(signature);
}
