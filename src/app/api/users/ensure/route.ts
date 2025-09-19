async function ensureServerUser() {
  if (typeof window === "undefined") return;
  let provider = localStorage.getItem("clientProviderId");
  if (!provider) {
    provider = crypto.randomUUID();
    localStorage.setItem("clientProviderId", provider);
  }
  // if we already have server UUID, skip
  if (localStorage.getItem("clientUserId")) return;

  const res = await fetch("/api/users/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "local", provider_user_id: provider, display_name: "You" })
  });
  const j = await res.json();
  if (res.ok && j?.id) localStorage.setItem("clientUserId", j.id);
}
ensureServerUser();
