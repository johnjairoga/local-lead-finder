export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapJobSystem } = await import("@/jobs/bootstrap");
    await bootstrapJobSystem();
  }
}
